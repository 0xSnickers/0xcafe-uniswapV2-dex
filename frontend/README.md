# 0xcafe DEX

一个基于 Next.js + RainbowKit + Ant Design 构建的去中心化交易所 (DEX) 前端项目，用于与 Uniswap V2 合约交互。

## 🚀 技术栈

- **前端框架**: Next.js 14 (App Router)
- **钱包连接**: RainbowKit + wagmi + viem
- **UI 框架**: Ant Design
- **样式**: Tailwind CSS
- **语言**: TypeScript

## 📦 功能特性

- 🔗 多钱包连接支持 (MetaMask, WalletConnect, Coinbase Wallet 等)
- 💱 代币交换 (Token Swap)
- 💰 流动性池管理 (计划中)
- 📊 交易数据分析 (计划中)
- 📱 响应式设计
- 🌙 暗黑模式支持 (计划中)

## 🛠️ 安装和运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd snickers-dex-nextjs
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件并配置以下变量：

```env
# WalletConnect Project ID
# 请到 https://cloud.walletconnect.com 申请你自己的 Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# 是否启用测试网络
NEXT_PUBLIC_ENABLE_TESTNETS=true
```

### 4. 更新合约地址

在 `src/config/contracts.ts` 中更新合约地址为你实际部署的地址：

```typescript
export const CONTRACT_ADDRESSES = {
  31337: { // Hardhat chain ID
    FACTORY: '0x实际的Factory地址',
    ROUTER: '0x实际的Router地址',
    WETH: '0x实际的WETH地址',
  },
};
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔧 与 Hardhat 合约联调

本项目设计用于与位于 `/Users/chuizi/Projects/upchain_daliy_code/uniswap_v2_with_hardhat` 的 Uniswap V2 合约项目联调。

### 联调步骤：

1. **启动 Hardhat 本地网络**:
   ```bash
   cd /Users/chuizi/Projects/upchain_daliy_code/uniswap_v2_with_hardhat
   npx hardhat node
   ```

2. **部署合约**:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **更新合约地址**: 将部署后的合约地址更新到 `src/config/contracts.ts` 中

4. **连接钱包**: 在浏览器钱包中添加 Hardhat 本地网络：
   - 网络名称: Hardhat
   - RPC URL: http://127.0.0.1:8545
   - 链ID: 31337
   - 货币符号: ETH

5. **导入测试账户**: 将 Hardhat 提供的测试账户私钥导入到钱包中

## 🍴 使用 Anvil Fork 环境

除了 Hardhat，本项目还支持使用 Anvil fork 环境进行开发，这样可以直接使用主网的真实合约和数据。

### 快速启动 Anvil Fork：

1. **安装 Foundry** (如果还没有安装):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **启动 Anvil Fork 主网**:
   ```bash
   # 使用公共 RPC
   anvil --fork-url https://rpc.ankr.com/eth
   
   # 或使用你的 Alchemy/Infura key
   anvil --fork-url https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY
   ```

3. **配置钱包网络**:
   - 网络名称: Anvil Fork Mainnet
   - RPC URL: http://127.0.0.1:8545
   - 链ID: 1
   - 货币符号: ETH

4. **导入测试账户**: 使用 Anvil 提供的测试账户私钥

### Anvil 的优势：
- 🔗 使用真实的 Uniswap V2 合约地址
- 💰 访问真实的代币和流动性
- 📊 真实的市场数据和价格
- 🚀 快速开发和测试

详细的 Anvil 使用指南请查看 [ANVIL_SETUP.md](ANVIL_SETUP.md)

## 📁 项目结构

```
src/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页
│   └── providers.tsx       # 全局 Provider 配置
├── components/
│   ├── Header.tsx          # 页面头部
│   └── SwapCard.tsx        # 交换卡片组件
└── config/
    └── contracts.ts        # 合约配置和 ABI
```

## 🎯 使用说明

1. **连接钱包**: 点击右上角的 "Connect Wallet" 按钮连接你的钱包
2. **选择代币**: 在交换界面选择你要交换的代币对
3. **输入数量**: 输入你想要交换的代币数量
4. **确认交换**: 点击 "交换" 按钮并在钱包中确认交易
