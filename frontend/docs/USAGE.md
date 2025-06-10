# 🍫 Snickers DEX 使用指南

## 📋 项目概述

Snickers DEX 是一个基于 Next.js + RainbowKit + Ant Design 构建的去中心化交易所前端项目，专门用于与 Uniswap V2 合约进行交互。

## 🚀 快速开始

### 1. 环境准备

确保你已经安装了以下软件：
- Node.js (v18 或更高版本)
- npm 或 yarn
- Git

### 2. 项目安装

```bash
# 克隆项目
git clone <repository-url>
cd snickers-dex-nextjs

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. 环境配置

创建 `.env.local` 文件并配置以下环境变量：

```env
# WalletConnect Project ID
# 请到 https://cloud.walletconnect.com 申请你自己的 Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# 是否启用测试网络
NEXT_PUBLIC_ENABLE_TESTNETS=true
```

### 4. 合约地址配置

在 `src/config/contracts.ts` 中更新合约地址为你实际部署的地址：

```typescript
export const CONTRACT_ADDRESSES: Record<number, {
  FACTORY: string;
  ROUTER: string;
  WETH: string;
}> = {
  31337: { // Hardhat chain ID
    FACTORY: '0x你的Factory合约地址',
    ROUTER: '0x你的Router合约地址',
    WETH: '0x你的WETH合约地址',
  },
};
```

## 🔧 与 Hardhat 合约联调

### 1. 启动 Hardhat 本地网络

```bash
cd /Users/chuizi/Projects/upchain_daliy_code/uniswap_v2_with_hardhat
npx hardhat node
```

### 2. 部署合约

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. 配置钱包网络

在你的浏览器钱包（如 MetaMask）中添加 Hardhat 本地网络：

- **网络名称**: Hardhat Local
- **RPC URL**: http://127.0.0.1:8545
- **链ID**: 31337
- **货币符号**: ETH
- **区块浏览器URL**: (留空)

### 4. 导入测试账户

将 Hardhat 提供的测试账户私钥导入到钱包中。Hardhat 启动时会显示多个测试账户及其私钥。

## 💱 功能使用

### Swap (代币交换)

1. **连接钱包**: 点击右上角的 "Connect Wallet" 按钮
2. **选择代币**: 在 "From" 和 "To" 下拉框中选择要交换的代币
3. **输入数量**: 在 "From" 输入框中输入要交换的代币数量
4. **查看预估**: 系统会自动计算预估的输出数量
5. **确认交换**: 点击 "交换" 按钮并在钱包中确认交易

### Pool (流动性池)

1. **添加流动性**:
   - 选择两个代币 (Token A 和 Token B)
   - 输入要添加的代币数量
   - 点击 "添加流动性" 按钮
   - 在钱包中确认交易

2. **移除流动性**: (开发中)

## 🎯 主要功能

### ✅ 已实现功能

- 🔗 多钱包连接支持 (MetaMask, WalletConnect, Coinbase Wallet 等)
- 💱 代币交换 (ETH ↔ Token, Token ↔ Token)
- 💰 添加流动性
- 📊 实时价格计算
- 🎨 响应式设计
- 🌐 多网络支持

### 🚧 计划中功能

- 💰 移除流动性
- 📊 交易数据分析
- 🌙 暗黑模式
- 📱 移动端优化
- 🔍 代币搜索功能

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **钱包连接**: RainbowKit + wagmi + viem
- **UI 框架**: Ant Design
- **样式**: Tailwind CSS
- **语言**: TypeScript
- **状态管理**: React Hooks
- **HTTP 客户端**: TanStack Query

## 📁 项目结构

```
src/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页
│   ├── providers.tsx       # 全局 Provider 配置
│   └── globals.css         # 全局样式
├── components/
│   ├── Header.tsx          # 页面头部
│   ├── SwapCard.tsx        # 交换卡片组件
│   └── LiquidityCard.tsx   # 流动性卡片组件
├── config/
│   └── contracts.ts        # 合约配置和 ABI
└── utils/
    └── tokens.ts           # 代币工具函数
```

## 🔒 安全提醒

⚠️ **重要提醒**:

- 本项目仅用于学习和测试目的
- 请勿在主网上使用未经审计的合约
- 交易前请仔细检查交易参数
- 建议先在测试网上进行充分测试
- 保护好你的私钥，不要泄露给任何人

## 🐛 常见问题

### Q: 连接钱包失败？
A: 请确保：
- 钱包已安装并解锁
- 已添加正确的网络配置
- 网络 RPC 地址正确

### Q: 交易失败？
A: 可能的原因：
- 余额不足
- 滑点设置过低
- 网络拥堵
- 合约地址错误

### Q: 看不到代币余额？
A: 请检查：
- 钱包是否连接
- 网络是否正确
- 代币合约地址是否正确

## 🤝 贡献指南

欢迎提交 Issues 和 Pull Requests！

1. Fork 本项目
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: your-email@example.com

---

**Happy Trading! 🚀** 