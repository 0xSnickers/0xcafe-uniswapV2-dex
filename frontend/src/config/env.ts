// 环境变量配置管理
export const ENV = {
  // 应用基本信息
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || '0xcafe DEX',
  APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || '现代化去中心化交易所',

  // RainbowKit 配置
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'a49c238ba1b5c99754df1b17f5ec98c4',

  // 网络配置
  DEFAULT_CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337'),
  ANVIL_RPC_URL: process.env.NEXT_PUBLIC_NETWORK_RPC || 'http://127.0.0.1:8545',

  // 合约地址配置
  CONTRACTS: {
    // Anvil 本地环境 (31337)
    31337: {
      FACTORY: process.env.NEXT_PUBLIC_ANVIL_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      ROUTER: process.env.NEXT_PUBLIC_ANVIL_ROUTER_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      WETH: process.env.NEXT_PUBLIC_ANVIL_WETH_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },
    // 主网 (1)
    1: {
      FACTORY: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS || '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      ROUTER: process.env.NEXT_PUBLIC_MAINNET_ROUTER_ADDRESS || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      WETH: process.env.NEXT_PUBLIC_MAINNET_WETH_ADDRESS || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    // Sepolia 测试网 (11155111)
    11155111: {
      FACTORY: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      ROUTER: process.env.NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      WETH: process.env.NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS || '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    },
  },

  // 代币地址配置
  TOKENS: {
    LOCAL_USDC: process.env.NEXT_PUBLIC_LOCAL_USDC_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    LOCAL_USDT: process.env.NEXT_PUBLIC_LOCAL_USDT_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    LOCAL_WETH: process.env.NEXT_PUBLIC_LOCAL_WETH_ADDRESS || '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    LOCAL_CAFE: process.env.NEXT_PUBLIC_LOCAL_CAFE_ADDRESS || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  },

  // 交易默认配置
  TRADING: {
    DEFAULT_SLIPPAGE: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE || '0.5'),
    DEFAULT_DEADLINE: parseInt(process.env.NEXT_PUBLIC_DEFAULT_DEADLINE || '20'),
    MAX_SLIPPAGE: parseFloat(process.env.NEXT_PUBLIC_MAX_SLIPPAGE || '10'),
    MIN_SLIPPAGE: parseFloat(process.env.NEXT_PUBLIC_MIN_SLIPPAGE || '0.01'),
  },

  // 开发配置
  DEV: {
    ENABLE_TESTNETS: process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true',
    ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  },

  // UI配置
  UI: {
    THEME_MODE: process.env.NEXT_PUBLIC_THEME_MODE || 'dark',
    ENABLE_ANIMATIONS: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== 'false',
    SHOW_ADVANCED_SETTINGS: process.env.NEXT_PUBLIC_SHOW_ADVANCED_SETTINGS !== 'false',
  },
} as const;

// 类型定义
export type ChainId = keyof typeof ENV.CONTRACTS;

// 辅助函数
export const getContractAddresses = (chainId: number) => {
  return ENV.CONTRACTS[chainId as ChainId] || ENV.CONTRACTS[31337];
};

export const isValidChainId = (chainId: number): chainId is ChainId => {
  return chainId in ENV.CONTRACTS;
};

// 调试输出（仅在开发模式下）
if (ENV.DEV.DEBUG_MODE && typeof window !== 'undefined') {
  console.log('🔧 ENV Configuration:', ENV);
} 