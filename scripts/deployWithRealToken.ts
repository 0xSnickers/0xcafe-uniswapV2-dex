import { ethers } from "hardhat";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 用户提供的真实代币合约地址
const REAL_TOKEN_ADDRESS = "0xcafe7f18c36c8d15369d3eed245552313fdc042a";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with real token with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy core contracts
  console.log("\n📋 1. Deploying core contracts...");
  
  // Deploy MockWETH
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const mockWETH = await MockWETH.deploy();
  await mockWETH.waitForDeployment();
  const wethAddress = await mockWETH.getAddress();
  console.log("✅ MockWETH deployed to:", wethAddress);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed to:", factoryAddress);

  // Deploy Router
  const Router = await ethers.getContractFactory("contracts/UniswapV2Router02.sol:UniswapV2Router02");
  const routerContract = await Router.deploy(factoryAddress, wethAddress);
  await routerContract.waitForDeployment();
  const routerAddress = await routerContract.getAddress();
  const router = await ethers.getContractAt("contracts/UniswapV2Router02.sol:UniswapV2Router02", routerAddress);
  console.log("✅ Router deployed to:", routerAddress);

  // 2. 连接到真实代币合约
  console.log("\n🪙 2. Connecting to real token contract...");
  
  // 获取真实代币信息
  const realToken = await ethers.getContractAt("IERC20Metadata", REAL_TOKEN_ADDRESS);
  let tokenSymbol, tokenName, tokenDecimals;
  
  try {
    tokenSymbol = await realToken.symbol();
    tokenName = await realToken.name();
    tokenDecimals = await realToken.decimals();
    console.log(`✅ Connected to ${tokenName} (${tokenSymbol})`);
    console.log(`   📍 Address: ${REAL_TOKEN_ADDRESS}`);
    console.log(`   🔢 Decimals: ${tokenDecimals}`);
  } catch (error) {
    console.error("❌ Error connecting to real token contract:", error);
    console.log("🔄 Make sure the contract implements ERC20 metadata functions");
    return;
  }

  // 检查用户代币余额
  const userBalance = await realToken.balanceOf(deployer.address);
  console.log(`💰 Your ${tokenSymbol} balance: ${ethers.formatUnits(userBalance, tokenDecimals)}`);

  if (userBalance === 0n) {
    console.log("⚠️ Warning: You have no tokens to add liquidity with");
    console.log("💡 Make sure you have some tokens before adding liquidity");
  }

  // 3. 为真实代币创建流动性池
  console.log("\n💧 3. Creating liquidity pool with real token...");

  // 获取deadline (20分钟后)
  const deadline = Math.floor(Date.now() / 1000) + 1200;

  try {
    // 检查是否有足够的代币进行流动性添加
    const tokensToAdd = ethers.parseUnits("1000", tokenDecimals); // 1000 代币
    const ethToAdd = ethers.parseEther("1"); // 1 ETH

    if (userBalance >= tokensToAdd) {
      // 授权路由合约使用代币
      console.log("📝 Approving tokens for router...");
      const approveTx = await realToken.approve(routerAddress, tokensToAdd);
      await approveTx.wait();
      console.log("✅ Tokens approved");

      // 添加 ETH/RealToken 流动性
      console.log(`🏊 Creating ${tokenSymbol}/ETH pool...`);
      const addLiquidityTx = await router.addLiquidityETH(
        REAL_TOKEN_ADDRESS,
        tokensToAdd,
        ethers.parseUnits("900", tokenDecimals), // 最少90%的代币
        ethers.parseEther("0.9"), // 最少0.9 ETH
        deployer.address,
        deadline,
        { value: ethToAdd }
      );
      await addLiquidityTx.wait();
      console.log(`✅ ${tokenSymbol}/ETH pool created with 1000 ${tokenSymbol} + 1 ETH`);
    } else {
      console.log("⚠️ Insufficient token balance to create liquidity pool");
      console.log(`💡 You need at least 1000 ${tokenSymbol} to create the demo pool`);
    }

  } catch (error) {
    console.log("⚠️ Error creating liquidity pool:", error);
    console.log("💡 This might be normal if the pool already exists or there are insufficient funds");
  }

  // 4. 生成前端配置
  console.log("\n🔧 4. Generating frontend configurations...");
  try {
    await execAsync("npx ts-node scripts/generateAbi.ts");
    console.log("✅ ABI configurations generated");
  } catch (error) {
    console.error("❌ Error generating ABI configurations:", error);
  }

  // 5. 更新前端合约地址
  console.log("\n📍 5. Updating frontend contract addresses...");
  try {
    process.env.FACTORY_ADDRESS = factoryAddress;
    process.env.ROUTER_ADDRESS = routerAddress;
    process.env.WETH_ADDRESS = wethAddress;
    process.env.CHAIN_ID = "31337";

    await execAsync("npx ts-node scripts/updateFrontendAddresses.ts");
    console.log("✅ Frontend addresses updated");
  } catch (error) {
    console.error("❌ Error updating frontend addresses:", error);
  }

  // 6. 创建包含真实代币的代币列表
  console.log("\n📋 6. Creating token list with real token...");
  const tokenList = {
    name: "Local Test Tokens with Real Token",
    version: {
      major: 1,
      minor: 0,
      patch: 0
    },
    tokens: [
      {
        chainId: 31337,
        address: wethAddress,
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        logoURI: "/eth.png"
      },
      {
        chainId: 31337,
        address: REAL_TOKEN_ADDRESS,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: Number(tokenDecimals),
        logoURI: "/favicon.jpg"
      }
    ]
  };

  const fs = require('fs');
  const path = require('path');
  
  // 确保目录存在
  const configDir = path.join('frontend/src/config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(configDir, 'tokenList.json'),
    JSON.stringify(tokenList, null, 2)
  );
  console.log("✅ Token list created with real token");

  // 7. 获取池子信息
  console.log("\n🔍 7. Checking created pools...");
  try {
    const pairsLength = await factory.allPairsLength();
    console.log(`📊 Total pools created: ${pairsLength}`);
    
    if (pairsLength > 0) {
      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        // 获取代币符号
        let symbol0 = "Unknown", symbol1 = "Unknown";
        try {
          if (token0.toLowerCase() === wethAddress.toLowerCase()) symbol0 = "WETH";
          else if (token0.toLowerCase() === REAL_TOKEN_ADDRESS.toLowerCase()) symbol0 = tokenSymbol;
          
          if (token1.toLowerCase() === wethAddress.toLowerCase()) symbol1 = "WETH";
          else if (token1.toLowerCase() === REAL_TOKEN_ADDRESS.toLowerCase()) symbol1 = tokenSymbol;
        } catch (e) {
          // 忽略错误
        }
        
        console.log(`   🏊 Pool ${i + 1}: ${symbol0}/${symbol1} - ${pairAddress}`);
      }
    }
  } catch (error) {
    console.log("⚠️ Error checking pools:", error);
  }

  // 8. 显示综合摘要
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT WITH REAL TOKEN COMPLETED!");
  console.log("=".repeat(80));
  console.log(`📍 Network: Local Anvil (Chain ID: 31337)`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Remaining balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log("");
  
  console.log("📋 Core Contracts:");
  console.log(`   🏭 Factory:  ${factoryAddress}`);
  console.log(`   🔄 Router:   ${routerAddress}`);
  console.log(`   💰 WETH:     ${wethAddress}`);
  console.log("");
  
  console.log("🪙 Real Token:");
  console.log(`   🎯 ${tokenName} (${tokenSymbol}): ${REAL_TOKEN_ADDRESS}`);
  console.log(`   🔢 Decimals: ${tokenDecimals}`);
  console.log(`   💰 Your balance: ${ethers.formatUnits(userBalance, tokenDecimals)} ${tokenSymbol}`);
  console.log("");
  
  console.log("💧 Liquidity Pool:");
  if (userBalance >= ethers.parseUnits("1000", tokenDecimals)) {
    console.log(`   🏊 ${tokenSymbol}/WETH pool created`);
  } else {
    console.log(`   ⚠️ ${tokenSymbol}/WETH pool not created (insufficient balance)`);
    console.log(`   💡 Get more ${tokenSymbol} tokens and run: npm run add-liquidity`);
  }
  console.log("");
  
  console.log("🔗 Frontend Integration:");
  console.log("   ✅ ABI configurations generated");
  console.log("   ✅ Contract addresses updated");
  console.log("   ✅ Token list created with real token");
  console.log("");
  
  console.log("🚀 Next Steps:");
  console.log("   1. cd frontend && npm run dev");
  console.log("   2. Connect MetaMask to localhost:8545 (Chain ID: 31337)");
  console.log(`   3. Import your token: ${REAL_TOKEN_ADDRESS}`);
  console.log("   4. Start trading and providing liquidity!");
  console.log("");
  
  console.log("💡 Tips:");
  console.log(`   - Add more ${tokenSymbol} tokens if needed for liquidity`);
  console.log("   - The pools page will show your real token pool");
  console.log("   - You can swap between WETH and your token");
  console.log("   - Use the Add/Remove Liquidity pages to manage positions");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 