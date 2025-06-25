# 🌐 Sepolia 部署指南

## 📋 环境变量配置

创建 `.env` 文件并添加以下配置：

```bash
# Sepolia 测试网 RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# 或者使用 Alchemy: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# 部署私钥 (⚠️ 不要提交到 git)
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Etherscan API Key (用于验证合约)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## 🔧 获取必要资源

### 1. 🚰 获取 Sepolia 测试币
- 访问 [Sepolia Faucet](https://faucets.chain.link/sepolia)
- 或者 [Alchemy Faucet](https://sepoliafaucet.com/)
- 获取至少 0.1 ETH 用于部署

### 2. 🔑 获取 RPC URL
**Infura:**
1. 访问 [Infura](https://infura.io/)
2. 创建项目
3. 复制 Sepolia 端点 URL

**Alchemy:**
1. 访问 [Alchemy](https://www.alchemy.com/)
2. 创建应用 (选择 Sepolia)
3. 复制 HTTPS URL

### 3. 📝 获取 Etherscan API Key
1. 访问 [Etherscan](https://etherscan.io/)
2. 注册账户
3. 创建 API Key

## 🚀 部署命令

```bash
# 部署到 Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

## ✅ 部署后验证

部署成功后，脚本会输出验证命令：
```bash
npx hardhat verify --network sepolia FACTORY_ADDRESS DEPLOYER_ADDRESS
npx hardhat verify --network sepolia ROUTER_ADDRESS FACTORY_ADDRESS WETH_ADDRESS
```

## 📊 关键信息

- **Sepolia Chain ID**: 11155111
- **Sepolia WETH**: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
- **Gas Price**: 20 Gwei (自动设置)

## ⚠️ 注意事项

1. **私钥安全**: 绝对不要提交私钥到 git
2. **测试币**: 确保有足够的 Sepolia ETH
3. **网络连接**: 确保 RPC URL 可访问
4. **合约验证**: 建议在 Etherscan 上验证合约

## 🎯 前端配置

部署完成后，前端配置会自动更新，支持 Sepolia 网络。 