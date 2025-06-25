import { TOKENS } from '@/config/contracts';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// 获取链上的代币列表
export function getTokensForChain(chainId: number): Token[] {
  // 优先使用 contracts.ts 中的 TOKENS 配置
  const tokensFromConfig = TOKENS[chainId as keyof typeof TOKENS];
  if (tokensFromConfig) {
    return [...tokensFromConfig] as Token[];
  }
  
  // 回退到默认的 Anvil 本地环境代币
  const defaultTokens = TOKENS[31337];
  return defaultTokens ? [...defaultTokens] as Token[] : [];
}

// 根据地址查找代币
export function findTokenByAddress(chainId: number, address: string): Token | undefined {
  const tokens = getTokensForChain(chainId);
  return tokens.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// 根据符号查找代币
export function findTokenBySymbol(chainId: number, symbol: string): Token | undefined {
  const tokens = getTokensForChain(chainId);
  return tokens.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// 检查是否为原生代币 (ETH)
export function isNativeToken(token: Token): boolean {
  return token.address === '0x0000000000000000000000000000000000000000';
}

// 格式化代币数量显示
export function formatTokenAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
  return (num / 1000000).toFixed(2) + 'M';
}

// 获取代币的显示名称（包含网络信息）
export function getTokenDisplayName(token: Token, chainId: number): string {
  const networkSuffix = chainId === 31337 ? ' (Local)' : '';
  return `${token.name}${networkSuffix}`;
}

// 获取代币图标 URL 或生成默认图标
export function getTokenIcon(token: Token): string {
  if (token.logoURI) {
    return token.logoURI;
  }
  
  // 为常见代币生成默认图标
  const iconMap: Record<string, string> = {
    'ETH': '⚡',
    'USDC': '💙',
    'USDT': '💚',
    'DAI': '🟡',
    'CAFE': '☕',
    'UNI': '🦄'
  };
  
  return iconMap[token.symbol] || '🪙';
} 

// 获取代币的显示名称（包含网络信息）
export function toFixedValue(_val: string, _fixed: number=6): string {
  if(isNaN(Number(_val))) {
    return _val;
  }
  return Number(_val).toFixed(_fixed);
}
