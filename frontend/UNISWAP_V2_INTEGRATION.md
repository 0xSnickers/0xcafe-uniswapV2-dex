# 🦄 Uniswap V2 合约对接技术文档

## 📋 目录

- [概述](#概述)
- [核心合约](#核心合约)
- [合约地址](#合约地址)
- [主要功能](#主要功能)
- [对接步骤](#对接步骤)
- [代码示例](#代码示例)
- [高级功能](#高级功能)
- [安全注意事项](#安全注意事项)
- [故障排除](#故障排除)
- [参考资源](#参考资源)

---

## 📖 概述

Uniswap V2 是一个去中心化的自动化做市商 (AMM) 协议，基于以太坊构建。它允许用户通过智能合约直接交换 ERC-20 代币，无需传统的订单簿。

### 🎯 核心特性

- **无许可**: 任何人都可以创建交易对
- **自动化做市**: 使用 x*y=k 公式进行定价
- **流动性挖矿**: 用户可以提供流动性赚取手续费
- **闪电贷**: 支持在单个交易中借用和归还资金

---

## 🏗️ 核心合约

### 1. UniswapV2Factory

工厂合约负责创建和管理交易对。

**主要功能**：
- 创建新的交易对
- 管理交易对列表
- 设置手续费接收地址

### 2. UniswapV2Router02

路由合约是用户交互的主要入口点。

**主要功能**：
- 代币交换
- 添加/移除流动性
- 价格查询
- 路径优化

### 3. UniswapV2Pair

每个交易对都是一个独立的合约实例。

**主要功能**：
- 管理流动性池
- 执行交换操作
- 分发流动性代币 (LP Token)

---

## 🌐 合约地址

### 主网 (Ethereum Mainnet)

```typescript
const CONTRACTS = {
  FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};
```

### 测试网

#### Sepolia
```typescript
const SEPOLIA_CONTRACTS = {
  FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
};
```

#### Goerli (已弃用)
```typescript
const GOERLI_CONTRACTS = {
  FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
};
```

---

## ⚡ 主要功能

### 1. 代币交换 (Swap)

#### ETH → Token
```solidity
function swapExactETHForTokens(
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external payable returns (uint[] memory amounts);
```

#### Token → ETH
```solidity
function swapExactTokensForETH(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external returns (uint[] memory amounts);
```

#### Token → Token
```solidity
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external returns (uint[] memory amounts);
```

### 2. 流动性管理

#### 添加流动性
```solidity
function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external returns (uint amountA, uint amountB, uint liquidity);
```

#### 移除流动性
```solidity
function removeLiquidity(
    address tokenA,
    address tokenB,
    uint liquidity,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external returns (uint amountA, uint amountB);
```

### 3. 价格查询

#### 获取输出数量
```solidity
function getAmountsOut(
    uint amountIn,
    address[] calldata path
) external view returns (uint[] memory amounts);
```

#### 获取输入数量
```solidity
function getAmountsIn(
    uint amountOut,
    address[] calldata path
) external view returns (uint[] memory amounts);
```

---

## 🔧 对接步骤

### 步骤 1: 环境准备

```bash
npm install viem @rainbow-me/rainbowkit wagmi ethers
```

### 步骤 2: 合约配置

```typescript
// config/contracts.ts
export const UNISWAP_V2_ROUTER_ABI = [
  // Router ABI 定义
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"}
    ],
    "name": "getAmountsOut",
    "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  // ... 更多方法
];

export const CONTRACT_ADDRESSES = {
  1: { // Mainnet
    FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
};
```

### 步骤 3: 基础交换功能

```typescript
// hooks/useSwap.ts
import { useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';

export function useSwap() {
  const { writeContractAsync } = useWriteContract();

  const swapETHForTokens = async (
    tokenAddress: string,
    amountIn: string,
    amountOutMin: string,
    recipient: string
  ) => {
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20分钟

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES[1].ROUTER,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [
        parseEther(amountOutMin),
        [CONTRACT_ADDRESSES[1].WETH, tokenAddress],
        recipient,
        BigInt(deadline),
      ],
      value: parseEther(amountIn),
    });
  };

  return { swapETHForTokens };
}
```

### 步骤 4: 价格查询

```typescript
// hooks/usePrice.ts
export function usePrice(tokenA: string, tokenB: string, amountIn: string) {
  const { data: amountsOut } = useReadContract({
    address: CONTRACT_ADDRESSES[1].ROUTER,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [
      parseEther(amountIn),
      [tokenA, tokenB]
    ],
    query: {
      enabled: !!(tokenA && tokenB && amountIn && parseFloat(amountIn) > 0),
      refetchInterval: 10000, // 10秒刷新一次
    }
  });

  return {
    outputAmount: amountsOut ? formatEther(amountsOut[1]) : '0',
    price: amountsOut && parseFloat(amountIn) > 0 
      ? formatEther(amountsOut[1]) / parseFloat(amountIn) 
      : 0
  };
}
```

---

## 💡 代码示例

### 完整的交换组件

```typescript
// components/SwapComponent.tsx
'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Button, Input, Select, Card, message } from 'antd';
import { useSwap, usePrice } from '../hooks';

export default function SwapComponent() {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5); // 0.5%
  
  const { address, isConnected } = useAccount();
  const { swapETHForTokens } = useSwap();
  const { outputAmount, price } = usePrice(
    CONTRACT_ADDRESSES[1].WETH,
    toToken,
    fromAmount
  );

  // 计算最小输出数量 (滑点保护)
  const minOutputAmount = outputAmount 
    ? (parseFloat(outputAmount) * (100 - slippage) / 100).toString()
    : '0';

  const handleSwap = async () => {
    if (!isConnected || !address) {
      message.error('请先连接钱包');
      return;
    }

    if (!fromAmount || !toToken || parseFloat(fromAmount) <= 0) {
      message.error('请输入有效的交换信息');
      return;
    }

    try {
      const tx = await swapETHForTokens(
        toToken,
        fromAmount,
        minOutputAmount,
        address
      );
      
      message.success(`交换成功！交易哈希: ${tx}`);
    } catch (error) {
      console.error('交换失败:', error);
      message.error('交换失败，请重试');
    }
  };

  return (
    <Card title="代币交换" style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <label>支付</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select value={fromToken} style={{ width: 100 }}>
            <Select.Option value="ETH">ETH</Select.Option>
          </Select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>接收</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="0.0"
            value={outputAmount}
            readOnly
            style={{ flex: 1 }}
          />
          <Select
            placeholder="选择代币"
            value={toToken}
            onChange={setToToken}
            style={{ width: 100 }}
          >
            <Select.Option value="0xA0b86a33E6441D68c3f2123B5b4e6fA5d8c0B0e7">
              USDC
            </Select.Option>
            <Select.Option value="0x6B175474E89094C44Da98b954EedeAC495271d0F">
              DAI
            </Select.Option>
          </Select>
        </div>
      </div>

      {price > 0 && (
        <div style={{ marginBottom: 16, fontSize: '14px', color: '#666' }}>
          汇率: 1 ETH = {price.toFixed(6)} {toToken === '0xA0b86a33E6441D68c3f2123B5b4e6fA5d8c0B0e7' ? 'USDC' : 'DAI'}
        </div>
      )}

      <Button
        type="primary"
        block
        size="large"
        onClick={handleSwap}
        disabled={!isConnected || !fromAmount || !toToken}
      >
        {!isConnected ? '连接钱包' : '交换'}
      </Button>
    </Card>
  );
}
```

### 流动性提供组件

```typescript
// components/LiquidityComponent.tsx
'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

export function LiquidityComponent() {
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  const { writeContractAsync } = useWriteContract();

  const addLiquidity = async () => {
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    const amountAMin = parseEther(amountA) * BigInt(95) / BigInt(100); // 5% 滑点
    const amountBMin = parseEther(amountB) * BigInt(95) / BigInt(100);

    await writeContractAsync({
      address: CONTRACT_ADDRESSES[1].ROUTER,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'addLiquidity',
      args: [
        tokenA,
        tokenB,
        parseEther(amountA),
        parseEther(amountB),
        amountAMin,
        amountBMin,
        address,
        BigInt(deadline),
      ],
    });
  };

  return (
    <Card title="添加流动性">
      {/* 组件实现 */}
    </Card>
  );
}
```

---

## 🚀 高级功能

### 1. 路径优化

```typescript
// utils/pathFinder.ts
export function findBestPath(
  tokenA: string,
  tokenB: string,
  commonTokens: string[] = [CONTRACT_ADDRESSES[1].WETH, USDC_ADDRESS, DAI_ADDRESS]
): string[] {
  // 直接路径
  const directPath = [tokenA, tokenB];
  
  // 通过中间代币的路径
  const pathsViaCommon = commonTokens.map(commonToken => 
    [tokenA, commonToken, tokenB]
  );

  // 返回最优路径 (这里简化处理，实际应该比较价格)
  return directPath;
}
```

### 2. 多跳交换

```typescript
// hooks/useMultiHopSwap.ts
export function useMultiHopSwap() {
  const { writeContractAsync } = useWriteContract();

  const multiHopSwap = async (
    path: string[],
    amountIn: string,
    amountOutMin: string,
    to: string
  ) => {
    const deadline = Math.floor(Date.now() / 1000) + 1200;

    return await writeContractAsync({
      address: CONTRACT_ADDRESSES[1].ROUTER,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        parseEther(amountIn),
        parseEther(amountOutMin),
        path,
        to,
        BigInt(deadline),
      ],
    });
  };

  return { multiHopSwap };
}
```

### 3. 手续费计算

```typescript
// utils/feeCalculator.ts
export function calculateFee(amountIn: string, feeRate: number = 0.003): string {
  const amount = parseFloat(amountIn);
  const fee = amount * feeRate;
  return fee.toString();
}

export function calculateAmountAfterFee(amountIn: string, feeRate: number = 0.003): string {
  const amount = parseFloat(amountIn);
  const amountAfterFee = amount * (1 - feeRate);
  return amountAfterFee.toString();
}
```

---

## 🔒 安全注意事项

### 1. 滑点保护

```typescript
// 计算最小输出数量
const calculateMinOutput = (expectedOutput: string, slippageTolerance: number): string => {
  const expected = parseFloat(expectedOutput);
  const minOutput = expected * (1 - slippageTolerance / 100);
  return minOutput.toString();
};
```

### 2. 截止时间

```typescript
// 设置合理的截止时间
const getDeadline = (minutesFromNow: number = 20): bigint => {
  return BigInt(Math.floor(Date.now() / 1000) + (minutesFromNow * 60));
};
```

### 3. 授权检查

```typescript
// hooks/useTokenApproval.ts
export function useTokenApproval(tokenAddress: string, spenderAddress: string) {
  const { address } = useAccount();
  
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, spenderAddress],
  });

  const { writeContractAsync: approve } = useWriteContract();

  const approveToken = async (amount: string) => {
    return await approve({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, parseEther(amount)],
    });
  };

  return {
    allowance,
    approveToken,
    needsApproval: allowance ? parseFloat(formatEther(allowance)) === 0 : true,
  };
}
```

### 4. 前端验证

```typescript
// utils/validation.ts
export function validateSwapParams(
  fromAmount: string,
  toToken: string,
  fromToken: string,
  balance: string
): { isValid: boolean; error?: string } {
  if (!fromAmount || parseFloat(fromAmount) <= 0) {
    return { isValid: false, error: '请输入有效的交换数量' };
  }

  if (!toToken || toToken === fromToken) {
    return { isValid: false, error: '请选择不同的代币' };
  }

  if (parseFloat(fromAmount) > parseFloat(balance)) {
    return { isValid: false, error: '余额不足' };
  }

  return { isValid: true };
}
```

---

## 🐛 故障排除

### 常见错误及解决方案

#### 1. "TransferHelper: TRANSFER_FROM_FAILED"
**原因**: 代币授权不足或余额不足
**解决**: 检查代币授权额度和用户余额

```typescript
// 检查授权
const checkApproval = async (tokenAddress: string, amount: string) => {
  const allowance = await readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, ROUTER_ADDRESS],
  });
  
  if (parseFloat(formatEther(allowance)) < parseFloat(amount)) {
    // 需要授权
    await approveToken(amount);
  }
};
```

#### 2. "UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT"
**原因**: 滑点过小或价格变动过大
**解决**: 增加滑点容差或重新获取价格

```typescript
// 动态调整滑点
const adjustSlippage = (originalSlippage: number, retryCount: number): number => {
  return Math.min(originalSlippage + (retryCount * 0.5), 5); // 最大5%
};
```

#### 3. "UniswapV2Router: EXPIRED"
**原因**: 交易截止时间已过
**解决**: 设置更长的截止时间

```typescript
// 设置更长的截止时间
const deadline = Math.floor(Date.now() / 1000) + 1800; // 30分钟
```

#### 4. Gas 费用估算

```typescript
// utils/gasEstimation.ts
export async function estimateSwapGas(
  routerContract: any,
  method: string,
  args: any[]
): Promise<bigint> {
  try {
    const gasEstimate = await routerContract.estimateGas[method](...args);
    return gasEstimate * BigInt(120) / BigInt(100); // 增加20%缓冲
  } catch (error) {
    console.error('Gas estimation failed:', error);
    return BigInt(300000); // 默认值
  }
}
```

---

## 📚 参考资源

### 官方文档
- [Uniswap V2 文档](https://docs.uniswap.org/protocol/V2/introduction)
- [智能合约源码](https://github.com/Uniswap/v2-core)
- [外围合约](https://github.com/Uniswap/v2-periphery)

### 开发工具
- [Uniswap SDK](https://docs.uniswap.org/sdk/v2/overview)
- [Remix IDE](https://remix.ethereum.org/)
- [Hardhat](https://hardhat.org/)

### 测试工具
- [Tenderly](https://tenderly.co/) - 交易模拟
- [Fork Mainnet](https://hardhat.org/hardhat-network/docs/guides/forking-other-networks) - 分叉主网测试

### 价格 API
- [CoinGecko API](https://www.coingecko.com/en/api)
- [Uniswap Subgraph](https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v2)

---

## 📝 总结

本文档提供了 Uniswap V2 合约对接的完整指南，涵盖了：

✅ **基础概念**: AMM 原理和核心合约  
✅ **实用代码**: 可直接使用的代码示例  
✅ **安全实践**: 滑点保护和错误处理  
✅ **故障排除**: 常见问题和解决方案  
✅ **扩展功能**: 高级特性和优化技巧  

通过本文档，开发者可以快速上手 Uniswap V2 的集成开发，构建安全可靠的 DeFi 应用。

---

**⚠️ 重要提醒**: 
- 在主网部署前务必在测试网充分测试
- 考虑合约审计和安全检查
- 关注滑点、MEV 等风险因素
- 及时更新依赖版本并关注安全公告 