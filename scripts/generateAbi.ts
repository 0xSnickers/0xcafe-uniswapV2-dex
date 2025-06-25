import * as fs from 'fs';
import * as path from 'path';

interface ContractArtifact {
  contractName: string;
  abi: any[];
}

// 读取合约构建产物并提取 ABI
function extractABI(contractPath: string): any[] {
  try {
    const artifactPath = path.join('artifacts', contractPath);
    const artifact: ContractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    console.error(`Error reading artifact from ${contractPath}:`, error);
    return [];
  }
}

// 生成类型安全的 ABI 配置
function generateABIConfig() {
  const contracts = {
    UniswapV2Factory: extractABI('contracts/UniswapV2Factory.sol/UniswapV2Factory.json'),
    UniswapV2Router02: extractABI('contracts/UniswapV2Router02.sol/UniswapV2Router02.json'),
    UniswapV2Pair: extractABI('contracts/UniswapV2Pair.sol/UniswapV2Pair.json'),
    MockWETH: extractABI('contracts/MockWETH.sol/MockWETH.json'),
    ERC20: extractABI('contracts/MockERC20.sol/MockERC20.json')
  };

  // 生成 TypeScript 配置文件
  const tsConfig = `// Auto-generated ABI configuration file
// Do not edit manually - run 'npm run generate:abi' to regenerate

export const UNISWAP_V2_FACTORY_ABI = ${JSON.stringify(contracts.UniswapV2Factory, null, 2)} as const;

export const UNISWAP_V2_ROUTER_ABI = ${JSON.stringify(contracts.UniswapV2Router02, null, 2)} as const;

export const UNISWAP_V2_PAIR_ABI = ${JSON.stringify(contracts.UniswapV2Pair, null, 2)} as const;

export const MOCK_WETH_ABI = ${JSON.stringify(contracts.MockWETH, null, 2)} as const;

export const ERC20_ABI = ${JSON.stringify(contracts.ERC20, null, 2)} as const;

// Contract types for wagmi
export type UniswapV2FactoryABI = typeof UNISWAP_V2_FACTORY_ABI;
export type UniswapV2RouterABI = typeof UNISWAP_V2_ROUTER_ABI;
export type UniswapV2PairABI = typeof UNISWAP_V2_PAIR_ABI;
export type MockWETHABI = typeof MOCK_WETH_ABI;
export type ERC20ABI = typeof ERC20_ABI;
`;

  // 确保前端目录存在
  const frontendDir = path.join('frontend', 'src', 'config');
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  // 写入配置文件
  fs.writeFileSync(path.join(frontendDir, 'abis.ts'), tsConfig);
  console.log('✅ ABI configuration generated at frontend/src/config/abis.ts');
}

// 生成合约地址配置模板
function generateAddressConfig() {
  const addressConfig = `// Contract addresses configuration
// Update these addresses after deployment

export interface ContractAddresses {
  factory: \`0x\${string}\`;
  router: \`0x\${string}\`;
  weth: \`0x\${string}\`;
}

// Default addresses for different networks
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Localhost (Anvil)
  31337: {
    factory: '0x0000000000000000000000000000000000000000', // Update after deployment
    router: '0x0000000000000000000000000000000000000000',  // Update after deployment
    weth: '0x0000000000000000000000000000000000000000',    // Update after deployment
  },
  // Add other networks as needed
};

export function getContractAddresses(chainId: number): ContractAddresses {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(\`Unsupported chain ID: \${chainId}\`);
  }
  return addresses;
}
`;

  const frontendDir = path.join('frontend', 'src', 'config');
  fs.writeFileSync(path.join(frontendDir, 'addresses.ts'), addressConfig);
  console.log('✅ Address configuration template generated at frontend/src/config/addresses.ts');
}

// 主函数
async function main() {
  console.log('🔄 Generating ABI and address configurations...');
  
  generateABIConfig();
  generateAddressConfig();
  
  console.log('✅ All configurations generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Deploy contracts: npm run deploy:local');
  console.log('2. Update contract addresses in frontend/src/config/addresses.ts');
  console.log('3. Use the generated ABIs in your frontend components');
}

if (require.main === module) {
  main().catch(console.error);
}