# 🔧 Anvil Fork 环境设置指南

## 📋 什么是 Anvil？

Anvil 是 Foundry 工具链的一部分，是一个快速的本地以太坊节点，支持 fork 主网或其他网络到本地进行开发和测试。

## 🚀 安装 Foundry

如果还没有安装 Foundry，请先安装：

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## 🌐 启动 Anvil Fork

### 1. Fork 主网

```bash
# Fork 主网到本地
anvil --fork-url https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY

# 或者使用 Infura
anvil --fork-url https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# 或者使用公共节点
anvil --fork-url https://rpc.ankr.com/eth
```

### 2. Fork 其他网络

```bash
# Fork Polygon
anvil --fork-url https://rpc.ankr.com/polygon --chain-id 137

# Fork Arbitrum
anvil --fork-url https://rpc.ankr.com/arbitrum --chain-id 42161

# Fork BSC
anvil --fork-url https://rpc.ankr.com/bsc --chain-id 56
```

### 3. 常用启动参数

```bash
# 完整参数示例
anvil \
  --fork-url https://rpc.ankr.com/eth \
  --port 8545 \
  --chain-id 1 \
  --accounts 10 \
  --balance 10000 \
  --mnemonic "test test test test test test test test test test test junk"
```

## ⚙️ 配置 Snickers DEX

### 1. 修改网络配置

如果你 fork 的不是主网，需要修改 `src/app/providers.tsx` 中的 chain ID：

```typescript
const anvilFork = {
  id: 1, // 修改为你 fork 的网络的 chain ID
  name: 'Anvil Fork Mainnet', // 修改网络名称
  // ... 其他配置
}
```

### 2. 常见网络 Chain ID

- 主网 (Mainnet): 1
- Polygon: 137  
- Arbitrum: 42161
- BSC: 56
- Optimism: 10
- Avalanche: 43114

### 3. 更新合约地址

在 `src/config/contracts.ts` 中添加对应网络的合约地址：

```typescript
export const CONTRACT_ADDRESSES = {
  1: {
    // 主网 Uniswap V2 地址
    FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  137: {
    // Polygon QuickSwap 地址 (兼容 Uniswap V2)
    FACTORY: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    ROUTER: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    WETH: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  },
  // 添加其他网络...
};
```

## 🔗 钱包配置

### 1. 添加网络到 MetaMask

对于 fork 主网：
- **网络名称**: Anvil Fork Mainnet
- **RPC URL**: http://127.0.0.1:8545
- **链ID**: 1
- **货币符号**: ETH

对于 fork 其他网络，使用对应的链ID和货币符号。

### 2. 导入测试账户

Anvil 启动时会显示测试账户和私钥，你可以导入这些账户到钱包中：

```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

## 🎯 使用优势

### Fork 主网的优势：
- 🔗 使用真实的合约地址
- 💰 访问真实的代币和流动性
- 📊 真实的市场数据
- 🚀 快速测试和开发

### 注意事项：
- ⚠️ 需要稳定的网络连接
- 📡 依赖外部 RPC 节点
- 🕒 某些状态可能会过时

## 🐛 常见问题

### Q: Anvil 启动失败？
A: 检查：
- Foundry 是否正确安装
- RPC URL 是否有效
- 端口 8545 是否被占用

### Q: 连接钱包失败？
A: 确保：
- Anvil 正在运行
- 钱包中添加了正确的网络配置
- Chain ID 匹配

### Q: 交易失败？
A: 可能原因：
- Anvil 节点重启导致状态丢失
- RPC 连接问题
- 合约地址配置错误

## 📚 进阶使用

### 1. 状态持久化

```bash
# 保存状态到文件
anvil --fork-url YOUR_RPC_URL --dump-state state.json

# 从文件加载状态
anvil --load-state state.json
```

### 2. 自定义区块时间

```bash
# 设置固定区块时间
anvil --fork-url YOUR_RPC_URL --block-time 12
```

### 3. 模拟交易

```bash
# 使用 cast 发送交易
cast send 0x... "transfer(address,uint256)" 0x... 1000000000000000000 --private-key 0x...
```

---

**Happy Forking! 🍴** 