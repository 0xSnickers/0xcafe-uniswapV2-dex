# Meme发射平台 × UniswapV2 DEX 对接文档

## 📋 目录
- [项目概述](#项目概述)
- [核心合约架构](#核心合约架构)
- [集成方案](#集成方案)
- [智能合约接口](#智能合约接口)
- [集成步骤](#集成步骤)
- [代码示例](#代码示例)
- [最佳实践](#最佳实践)
- [注意事项](#注意事项)

## 📖 项目概述

本文档介绍如何将Meme发射平台与UniswapV2 DEX集成，实现以下功能：
- 🚀 发射新的Meme代币
- 💧 自动添加初始流动性
- 📈 在DEX上开启交易
- 🔄 流动性管理

### 集成架构图
```
Meme发射平台
    ↓
创建ERC20代币 
    ↓
自动添加流动性到UniswapV2
    ↓
开启DEX交易
```

## 🏗️ 核心合约架构

### UniswapV2 核心合约

| 合约名称 | 功能 | 地址获取方式 |
|---------|------|-------------|
| `UniswapV2Factory` | 创建和管理交易对 | 部署后固定地址 |
| `UniswapV2Router02` | 用户交互入口 | 部署后固定地址 |
| `UniswapV2Pair` | 具体交易对合约 | Factory.getPair()获取 |

### 合约关系
```
Factory (工厂) 
├── 创建 Pair (交易对)
└── 管理所有交易对

Router (路由)
├── 调用 Factory 创建交易对
├── 调用 Pair 添加流动性
└── 提供安全的用户接口
```

## 🎯 集成方案

### 方案A: 直接集成 (推荐)
在Meme发射合约中直接集成UniswapV2接口

**优点:**
- 一键发射并上市
- 用户体验最佳
- Gas消耗相对较低

**缺点:**
- 合约耦合度较高
- 需要处理更多边界情况

### 方案B: 分离集成
发射和上市分成两个独立的交易

**优点:**
- 合约解耦
- 更灵活的控制
- 错误处理更容易

**缺点:**
- 需要两次交易
- 用户体验稍差

## 🔌 智能合约接口

### 1. UniswapV2Factory 接口

```solidity
interface IUniswapV2Factory {
    // 创建交易对
    function createPair(address tokenA, address tokenB) external returns (address pair);
    
    // 获取交易对地址
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    
    // 获取所有交易对数量
    function allPairsLength() external view returns (uint);
}
```

### 2. UniswapV2Router02 接口

```solidity
interface IUniswapV2Router02 {
    // 获取Factory地址
    function factory() external pure returns (address);
    
    // 获取WETH地址
    function WETH() external pure returns (address);
    
    // 添加ERC20代币流动性
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
    
    // 添加ETH流动性
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}
```

## 📋 集成步骤

### 步骤1: 创建Meme发射合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// UniswapV2 接口
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

// Meme代币合约
contract MemeToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) ERC20(name, symbol) {
        _mint(owner, initialSupply);
        _transferOwnership(owner);
    }
}

// Meme发射工厂合约
contract MemeFactory is ReentrancyGuard {
    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Factory public immutable uniswapFactory;
    
    struct MemeTokenInfo {
        address tokenAddress;
        address creator;
        uint256 initialSupply;
        uint256 liquidityAdded;
        address pairAddress;
        uint256 createdAt;
    }
    
    mapping(address => MemeTokenInfo) public memeTokens;
    address[] public allMemeTokens;
    
    // 事件
    event MemeTokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialSupply
    );
    
    event LiquidityAdded(
        address indexed tokenAddress,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 liquidity,
        address pairAddress
    );
    
    constructor(address _uniswapRouter) {
        require(_uniswapRouter != address(0), "Invalid router address");
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        uniswapFactory = IUniswapV2Factory(uniswapRouter.factory());
    }
    
    // 创建Meme代币并添加流动性
    function createMemeTokenWithLiquidity(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 liquidityPercentage  // 用于添加流动性的代币百分比 (1-100)
    ) external payable nonReentrant returns (address tokenAddress) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(liquidityPercentage > 0 && liquidityPercentage <= 100, "Invalid percentage");
        require(msg.value > 0, "ETH required for liquidity");
        
        // 创建新的Meme代币
        MemeToken newToken = new MemeToken(name, symbol, initialSupply, address(this));
        tokenAddress = address(newToken);
        
        // 记录代币信息
        MemeTokenInfo memory tokenInfo = MemeTokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            initialSupply: initialSupply,
            liquidityAdded: 0,
            pairAddress: address(0),
            createdAt: block.timestamp
        });
        
        memeTokens[tokenAddress] = tokenInfo;
        allMemeTokens.push(tokenAddress);
        
        emit MemeTokenCreated(tokenAddress, msg.sender, name, symbol, initialSupply);
        
        // 添加流动性
        _addInitialLiquidity(tokenAddress, liquidityPercentage);
        
        // 将剩余代币转给创建者
        uint256 remainingTokens = IERC20(tokenAddress).balanceOf(address(this));
        if (remainingTokens > 0) {
            IERC20(tokenAddress).transfer(msg.sender, remainingTokens);
        }
        
        return tokenAddress;
    }
    
    // 内部函数：添加初始流动性
    function _addInitialLiquidity(
        address tokenAddress,
        uint256 liquidityPercentage
    ) internal {
        IERC20 token = IERC20(tokenAddress);
        uint256 tokenBalance = token.balanceOf(address(this));
        uint256 tokenAmount = (tokenBalance * liquidityPercentage) / 100;
        
        // 授权Router使用代币
        token.approve(address(uniswapRouter), tokenAmount);
        
        // 添加流动性
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = uniswapRouter.addLiquidityETH{
            value: msg.value
        }(
            tokenAddress,
            tokenAmount,
            0, // 接受任何数量的代币
            0, // 接受任何数量的ETH
            msg.sender, // LP代币发送给创建者
            block.timestamp + 15 minutes
        );
        
        // 获取交易对地址
        address pairAddress = uniswapFactory.getPair(tokenAddress, uniswapRouter.WETH());
        
        // 更新记录
        memeTokens[tokenAddress].liquidityAdded = liquidity;
        memeTokens[tokenAddress].pairAddress = pairAddress;
        
        // 退还多余的ETH
        if (msg.value > amountETH) {
            payable(msg.sender).transfer(msg.value - amountETH);
        }
        
        emit LiquidityAdded(tokenAddress, amountToken, amountETH, liquidity, pairAddress);
    }
    
    // 查询函数
    function getAllMemeTokens() external view returns (address[] memory) {
        return allMemeTokens;
    }
    
    function getMemeTokenCount() external view returns (uint256) {
        return allMemeTokens.length;
    }
    
    function getMemeTokenInfo(address tokenAddress) external view returns (MemeTokenInfo memory) {
        return memeTokens[tokenAddress];
    }
}
```

### 步骤2: 前端集成示例

```javascript
// Web3 集成代码
import { ethers } from 'ethers';

class MemeFactoryService {
    constructor(contractAddress, abi, provider) {
        this.contractAddress = contractAddress;
        this.contract = new ethers.Contract(contractAddress, abi, provider);
        this.provider = provider;
    }
    
    // 连接钱包
    async connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                this.signer = signer;
                this.contractWithSigner = this.contract.connect(signer);
                return signer;
            } catch (error) {
                throw new Error('用户拒绝连接钱包');
            }
        } else {
            throw new Error('请安装MetaMask');
        }
    }
    
    // 创建Meme代币
    async createMemeToken(tokenData, ethAmount) {
        try {
            const tx = await this.contractWithSigner.createMemeTokenWithLiquidity(
                tokenData.name,
                tokenData.symbol,
                ethers.parseEther(tokenData.supply.toString()),
                tokenData.liquidityPercentage,
                {
                    value: ethers.parseEther(ethAmount.toString()),
                    gasLimit: 800000
                }
            );
            
            console.log('交易已发送:', tx.hash);
            const receipt = await tx.wait();
            console.log('交易确认:', receipt);
            
            // 解析事件获取代币地址
            const createEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'MemeTokenCreated';
                } catch (e) {
                    return false;
                }
            });
            
            if (createEvent) {
                const parsed = this.contract.interface.parseLog(createEvent);
                return {
                    tokenAddress: parsed.args.tokenAddress,
                    creator: parsed.args.creator,
                    txHash: receipt.hash
                };
            }
            
            throw new Error('无法获取代币地址');
        } catch (error) {
            console.error('创建失败:', error);
            throw error;
        }
    }
    
    // 获取所有代币列表
    async getAllMemeTokens() {
        try {
            const addresses = await this.contract.getAllMemeTokens();
            const tokens = [];
            
            for (const address of addresses) {
                const info = await this.contract.getMemeTokenInfo(address);
                tokens.push({
                    address,
                    creator: info.creator,
                    initialSupply: ethers.formatEther(info.initialSupply),
                    liquidityAdded: ethers.formatEther(info.liquidityAdded),
                    pairAddress: info.pairAddress,
                    createdAt: new Date(Number(info.createdAt) * 1000)
                });
            }
            
            return tokens;
        } catch (error) {
            console.error('获取代币列表失败:', error);
            throw error;
        }
    }
}

// React组件示例
import React, { useState, useEffect } from 'react';

const MemeTokenLauncher = () => {
    const [memeFactory, setMemeFactory] = useState(null);
    const [account, setAccount] = useState('');
    const [loading, setLoading] = useState(false);
    const [tokenData, setTokenData] = useState({
        name: '',
        symbol: '',
        supply: 1000000,
        liquidityPercentage: 50
    });
    const [ethAmount, setEthAmount] = useState(1);
    const [memeTokens, setMemeTokens] = useState([]);
    
    useEffect(() => {
        initializeContract();
    }, []);
    
    const initializeContract = async () => {
        try {
            const factoryService = new MemeFactoryService(
                process.env.REACT_APP_MEME_FACTORY_ADDRESS,
                MEME_FACTORY_ABI,
                new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL)
            );
            setMemeFactory(factoryService);
            
            // 加载代币列表
            const tokens = await factoryService.getAllMemeTokens();
            setMemeTokens(tokens);
        } catch (error) {
            console.error('初始化失败:', error);
        }
    };
    
    const connectWallet = async () => {
        try {
            const signer = await memeFactory.connectWallet();
            setAccount(await signer.getAddress());
        } catch (error) {
            alert(error.message);
        }
    };
    
    const handleLaunch = async () => {
        if (!account) {
            alert('请先连接钱包');
            return;
        }
        
        if (!tokenData.name || !tokenData.symbol) {
            alert('请填写代币名称和符号');
            return;
        }
        
        setLoading(true);
        try {
            const result = await memeFactory.createMemeToken(tokenData, ethAmount);
            alert(`🎉 代币发射成功!
                   代币地址: ${result.tokenAddress}
                   交易哈希: ${result.txHash}`);
            
            // 刷新代币列表
            const tokens = await memeFactory.getAllMemeTokens();
            setMemeTokens(tokens);
        } catch (error) {
            alert('发射失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="meme-launcher">
            <div className="header">
                <h1>🚀 Meme代币发射平台</h1>
                {!account ? (
                    <button onClick={connectWallet} className="connect-btn">
                        连接钱包
                    </button>
                ) : (
                    <div className="account-info">
                        已连接: {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                )}
            </div>
            
            <div className="launch-form">
                <h2>发射新的Meme代币</h2>
                
                <div className="form-group">
                    <label>代币名称:</label>
                    <input 
                        value={tokenData.name}
                        onChange={(e) => setTokenData({...tokenData, name: e.target.value})}
                        placeholder="例: DogeCoin"
                    />
                </div>
                
                <div className="form-group">
                    <label>代币符号:</label>
                    <input 
                        value={tokenData.symbol}
                        onChange={(e) => setTokenData({...tokenData, symbol: e.target.value})}
                        placeholder="例: DOGE"
                    />
                </div>
                
                <div className="form-group">
                    <label>初始供应量:</label>
                    <input 
                        type="number"
                        value={tokenData.supply}
                        onChange={(e) => setTokenData({...tokenData, supply: e.target.value})}
                    />
                </div>
                
                <div className="form-group">
                    <label>流动性比例: {tokenData.liquidityPercentage}%</label>
                    <input 
                        type="range"
                        min="10"
                        max="90"
                        value={tokenData.liquidityPercentage}
                        onChange={(e) => setTokenData({...tokenData, liquidityPercentage: e.target.value})}
                    />
                </div>
                
                <div className="form-group">
                    <label>ETH数量 (用于流动性):</label>
                    <input 
                        type="number"
                        step="0.1"
                        value={ethAmount}
                        onChange={(e) => setEthAmount(e.target.value)}
                    />
                </div>
                
                <button 
                    onClick={handleLaunch}
                    disabled={loading || !account}
                    className="launch-button"
                >
                    {loading ? '发射中...' : '🚀 发射代币'}
                </button>
            </div>
            
            <div className="token-list">
                <h2>已发射的代币</h2>
                {memeTokens.map((token, index) => (
                    <div key={index} className="token-item">
                        <div className="token-info">
                            <strong>地址:</strong> {token.address}
                        </div>
                        <div className="token-info">
                            <strong>创建者:</strong> {token.creator}
                        </div>
                        <div className="token-info">
                            <strong>初始供应量:</strong> {token.initialSupply}
                        </div>
                        <div className="token-info">
                            <strong>流动性:</strong> {token.liquidityAdded} LP
                        </div>
                        <div className="token-info">
                            <strong>交易对:</strong> {token.pairAddress}
                        </div>
                        <div className="token-info">
                            <strong>创建时间:</strong> {token.createdAt.toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MemeTokenLauncher;
```

### 步骤3: 部署脚本

```javascript
// scripts/deployMemeFactory.js
const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署Meme发射工厂合约...");
    
    // 获取UniswapV2Router地址（这里使用本地部署的地址）
    const UNISWAP_ROUTER_ADDRESS = process.env.UNISWAP_ROUTER_ADDRESS || "YOUR_ROUTER_ADDRESS";
    
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("账户余额:", ethers.formatEther(balance), "ETH");
    
    // 部署MemeFactory合约
    const MemeFactory = await ethers.getContractFactory("MemeFactory");
    const memeFactory = await MemeFactory.deploy(UNISWAP_ROUTER_ADDRESS);
    
    await memeFactory.waitForDeployment();
    
    console.log("✅ MemeFactory部署成功!");
    console.log("合约地址:", await memeFactory.getAddress());
    console.log("UniswapV2Router地址:", UNISWAP_ROUTER_ADDRESS);
    
    // 验证部署
    const routerAddress = await memeFactory.uniswapRouter();
    console.log("验证Router地址:", routerAddress);
    
    console.log("\n📝 部署信息汇总:");
    console.log("====================");
    console.log(`MemeFactory: ${await memeFactory.getAddress()}`);
    console.log(`UniswapV2Router: ${routerAddress}`);
    console.log("====================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 💡 最佳实践

### 1. 安全性考虑
- 使用 `ReentrancyGuard` 防止重入攻击
- 添加适当的访问控制
- 验证输入参数
- 处理异常情况

### 2. Gas优化
- 合理设置Gas限制
- 批量操作减少交易次数
- 使用事件记录重要信息

### 3. 用户体验
- 提供清晰的错误信息
- 显示交易进度
- 自动刷新状态

## ⚠️ 注意事项

1. **网络兼容性**: 确保在正确的网络上部署和使用
2. **滑点设置**: 为流动性添加设置合理的滑点保护
3. **Gas费用**: 预估并告知用户所需的Gas费用
4. **安全审计**: 主网部署前进行充分的安全审计
5. **测试验证**: 在测试网充分测试所有功能

---

这个对接文档提供了完整的集成方案，您可以根据具体需求进行调整和扩展。如果需要更多技术细节或有疑问，随时可以询问！ 