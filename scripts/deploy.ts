import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

// 网络配置
const NETWORK_CONFIG = {
  localhost: {
    name: "localhost",
    chainId: 31337,
    deployWETH: true, // 本地环境部署 MockWETH
    wethAddress: null, // 将在部署后设置
  },
  sepolia: {
    name: "sepolia", 
    chainId: 11155111,
    deployWETH: false, // Sepolia 使用现有 WETH
    wethAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH 地址
  }
};

async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName as keyof typeof NETWORK_CONFIG];
  
  if (!config) {
    throw new Error(`❌ 不支持的网络: ${networkName}`);
  }

  console.log(`🚀 开始部署 UniswapV2 合约到 ${config.name}...`);
  console.log(`📍 网络: ${networkName} (Chain ID: ${config.chainId})`);

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  let wethAddress: string;

  if (config.deployWETH) {
    // 1. 部署 WETH (仅限本地环境)
    console.log("\n📦 部署 MockWETH...");
    const WETH = await ethers.getContractFactory("MockWETH");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    wethAddress = await weth.getAddress();
    console.log("✅ WETH 部署完成:", wethAddress);
  } else {
    // 使用现有 WETH 地址
    wethAddress = config.wethAddress!;
    console.log("✅ 使用现有 WETH:", wethAddress);
  }

  // 2. 部署 Factory
  console.log("\n📦 部署 UniswapV2Factory...");
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory 部署完成:", factoryAddress);

  // 3. 部署 Router
  console.log("\n📦 部署 UniswapV2Router02...");
  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ Router 部署完成:", routerAddress);

  // 4. 更新前端地址配置
  console.log("\n📝 更新前端地址配置...");
  await updateFrontendAddresses(config.chainId, {
    factory: factoryAddress,
    router: routerAddress,
    weth: wethAddress,
  });

  // 5. 保存部署信息
  const deploymentInfo = {
    network: config.name,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: {
      weth: wethAddress,
      factory: factoryAddress,
      router: routerAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, `../deployment-${config.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ 部署信息已保存到 deployment-${config.name}.json`);

  console.log("\n🎉 部署完成！");
  console.log("📋 合约地址:");
  console.log(`   WETH: ${wethAddress}`);
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   Router: ${routerAddress}`);
  
  if (networkName === "sepolia") {
    console.log("\n🔍 验证合约:");
    console.log(`npx hardhat verify --network sepolia ${factoryAddress} ${deployer.address}`);
    console.log(`npx hardhat verify --network sepolia ${routerAddress} ${factoryAddress} ${wethAddress}`);
  }
  
  console.log(`\n💡 现在您可以在 ${config.name} 网络上使用添加流动性功能了！`);
}

// 更新前端地址配置函数
async function updateFrontendAddresses(chainId: number, contracts: {
  factory: string;
  router: string;
  weth: string;
}) {
  const addressesPath = path.join(__dirname, "../frontend/src/config/addresses.ts");
  
  // 读取现有配置
  let addressesContent: string;
  try {
    addressesContent = fs.readFileSync(addressesPath, 'utf8');
  } catch (error) {
    // 如果文件不存在，创建基础结构
    addressesContent = `// Contract addresses configuration
// Auto-generated by deploy.ts

export interface ContractAddresses {
  factory: \`0x\${string}\`;
  router: \`0x\${string}\`;
  weth: \`0x\${string}\`;
}

// Default addresses for different networks
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Add networks as needed
};

export function getContractAddresses(chainId: number): ContractAddresses | null {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    console.warn(\`Unsupported chain ID: \${chainId}\`);
    return null;
  }
  
  return addresses;
}
`;
  }

  // 创建新的网络配置
  const networkConfig = `  // ${chainId === 31337 ? 'Localhost (Anvil)' : chainId === 11155111 ? 'Sepolia Testnet' : `Chain ${chainId}`}
  ${chainId}: {
    factory: '${contracts.factory}' as \`0x\${string}\`,
    router: '${contracts.router}' as \`0x\${string}\`,
    weth: '${contracts.weth}' as \`0x\${string}\`,
  },`;

  // 检查是否已存在该链ID的配置
  const chainRegex = new RegExp(`  // .*\\n  ${chainId}: \\{[\\s\\S]*?\\},`, 'g');
  
  if (chainRegex.test(addressesContent)) {
    // 替换现有配置
    addressesContent = addressesContent.replace(chainRegex, networkConfig);
  } else {
    // 添加新配置
    const insertionPoint = addressesContent.indexOf('  // Add networks as needed');
    if (insertionPoint !== -1) {
      addressesContent = 
        addressesContent.slice(0, insertionPoint) +
        networkConfig + '\n  ' +
        addressesContent.slice(insertionPoint);
    } else {
      // 如果找不到插入点，在 CONTRACT_ADDRESSES 对象末尾添加
      const objEnd = addressesContent.indexOf('};');
      if (objEnd !== -1) {
        addressesContent = 
          addressesContent.slice(0, objEnd) +
          networkConfig + '\n' +
          addressesContent.slice(objEnd);
      }
    }
  }

  fs.writeFileSync(addressesPath, addressesContent);
  console.log("✅ 前端地址配置已更新");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  }); 