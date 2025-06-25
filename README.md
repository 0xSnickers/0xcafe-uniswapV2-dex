# 🏪 0xcafe UniswapV2 DEX

一个功能完整的 Uniswap V2 去中心化交易所实现，支持多网络部署和现代化前端界面。

## 🎯 核心功能

- ✅ **AMM 自动做市商** - 恒定乘积算法
- ✅ **流动性管理** - 添加/移除流动性，LP 代币
- ✅ **代币交易** - 支持滑点保护和路径优化
- ✅ **多网络支持** - 本地开发、Sepolia 测试网
- ✅ **前端界面** - React + Next.js + RainbowKit
- ✅ **合约验证** - Etherscan 自动验证

## 🚀 快速开始

### 1. 环境准备
```bash
# 克隆项目
git clone <repository-url>
cd 0xcafe-uniswapV2-dex

# 安装依赖
npm install

# 编译合约
npx hardhat compile
```

### 2. 本地部署
```bash
# 启动本地网络（新终端）
npx hardhat node

# 部署合约（新终端）
npx hardhat run scripts/deploy.ts --network hardhat

# 启动前端（新终端）
cd frontend && npm run dev
```

### 3. Sepolia 部署
```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 文件添加你的 RPC URL 和私钥

# 部署到 Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

> 📖 详细的 Sepolia 部署指南见 [SEPOLIA_SETUP.md](./SEPOLIA_SETUP.md)

## 📦 核心架构

### 🔧 智能合约
```
contracts/
├── 🏭 UniswapV2Factory.sol     # 工厂合约 - 创建交易对
├── 🔄 UniswapV2Router02.sol    # 路由合约 - 用户交互入口  
├── 🏊 UniswapV2Pair.sol        # 交易对合约 - 管理流动性
├── 💰 MockWETH.sol             # WETH 合约 - 本地测试用
└── 🪙 MockERC20.sol            # 测试代币合约
```

### 🌐 前端应用
```
frontend/
├── src/app/                    # Next.js 页面
│   ├── swap/                   # 代币交换页面
│   └── add-liquidity/          # 添加流动性页面
├── src/components/             # React 组件
├── src/config/                 # 配置文件
│   ├── addresses.ts           # 合约地址配置
│   └── abis.ts                # 合约 ABI
└── src/hooks/                  # 自定义 Hooks
```

### 🛠️ 开发工具
```
scripts/
├── deploy.ts                   # 多网络部署脚本 ⭐
├── autoUpdateInitCodeHash.ts   # 自动更新 Hash
└── quickDeploy.ts             # 快速本地部署
```

## 🔑 核心脚本

### 📋 部署脚本
```bash
# 智能多网络部署
npx hardhat run scripts/deploy.ts --network <network>

# 支持网络: hardhat, sepolia
# 自动处理 WETH 地址和前端配置更新
```

### 🧪 测试脚本
```bash
# 运行所有测试
npx hardhat test

# 添加流动性功能测试
npx hardhat test test/addLiquidity.comprehensive.test.ts

# Init Code Hash 检查
npx hardhat run scripts/autoUpdateInitCodeHash.ts
```

## 🎛️ 网络配置

| 网络 | Chain ID | WETH 地址 | 部署方式 |
|------|----------|-----------|----------|
| **本地** | 31337 | 自动部署 MockWETH | `--network hardhat` |
| **Sepolia** | 11155111 | `0xfFf9976...` | `--network sepolia` |

## 📱 前端功能

### ✨ 主要特性
- 🔗 **钱包连接** - RainbowKit 集成
- 💱 **代币交换** - 滑点保护，价格影响提示
- 🏊 **流动性管理** - 添加/移除流动性，LP 代币
- 📊 **实时数据** - 价格更新，余额同步
- 🎨 **现代 UI** - 响应式设计，暗色主题

### 🔧 技术栈
- **框架**: Next.js 14 + TypeScript
- **样式**: Tailwind CSS
- **Web3**: Wagmi + Viem
- **钱包**: RainbowKit
- **状态管理**: React Hooks

## 🧪 测试覆盖

### ✅ 合约测试
- 工厂合约：交易对创建
- 路由合约：流动性添加/移除  
- 交易功能：代币交换，滑点处理
- 错误场景：参数验证，权限检查

### ✅ 前端测试
- 组件渲染测试
- 用户交互流程
- 钱包连接集成

## 📚 学习资源

### 🎓 核心概念
- **AMM**: 自动做市商算法 (x * y = k)
- **LP Token**: 流动性提供者代币
- **滑点**: 交易对价格的影响
- **Init Code Hash**: CREATE2 地址计算

### 📖 代码示例
```typescript
// 添加流动性
const { write: addLiquidity } = useWriteContract({
  abi: UNISWAP_V2_ROUTER_ABI,
  address: routerAddress,
  functionName: 'addLiquidity'
});

// 代币交换
const { write: swapTokens } = useWriteContract({
  abi: UNISWAP_V2_ROUTER_ABI, 
  address: routerAddress,
  functionName: 'swapExactTokensForTokens'
});
```

## ⚠️ 重要提醒

### 🔒 安全注意事项
- 绝不提交私钥到 Git
- 测试网代币无实际价值
- 合约未经审计，仅供学习

### 🐛 常见问题
- **Init Code Hash 错误**: 运行 `autoUpdateInitCodeHash.ts`
- **前端连接失败**: 检查网络配置和合约地址
- **交易失败**: 检查代币授权和余额

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**🎯 项目目标**: 通过实际的 DEX 项目学习 DeFi 开发，掌握 AMM 原理和前端集成技术。
