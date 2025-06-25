# BondingCurve 自动毕业添加流动性对接指南

## 📋 目录
- [项目概述](#项目概述)
- [毕业机制分析](#毕业机制分析)
- [集成方案设计](#集成方案设计)
- [合约改进建议](#合约改进建议)
- [自动毕业流程](#自动毕业流程)
- [代码实现](#代码实现)
- [调用示例](#调用示例)
- [注意事项](#注意事项)

## 📖 项目概述

BondingCurve合约实现了类似pump.fun的动态定价机制，当代币市值达到10 ETH时触发毕业条件。本文档详细说明如何在毕业时自动将流动性添加到UniswapV2。

### 当前毕业机制
- **毕业条件**: 市值达到 `TARGET_MARKET_CAP = 10 ether`
- **触发时机**: 在 `buyTokens()` 函数中检查
- **当前行为**: 仅设置 `graduated = true` 并发出事件

### 目标改进
- 在毕业时自动添加流动性到UniswapV2
- 将bonding curve中的ETH用作流动性
- 铸造相应的代币用于流动性配对
- 将LP代币发送给指定接收者

## 🎯 毕业机制分析

### 当前毕业检查逻辑

```solidity
function checkGraduationCondition(address tokenAddress) 
    public view returns (bool shouldGraduate) {
    require(isValidToken[tokenAddress], "Invalid token");
    
    CurveParams memory params = curveParams[tokenAddress];
    
    if (params.graduated) {
        return false;
    }
    
    // 仅检查市值条件
    uint256 currentPrice = getCurrentPrice(tokenAddress);
    uint256 currentMarketCap = (currentPrice * params.currentSupply) / 1e18;
    
    return currentMarketCap >= TARGET_MARKET_CAP;
}
```

### 毕业触发点

```solidity
// 在 buyTokens() 函数中
if (checkGraduationCondition(tokenAddress)) {
    params.graduated = true;
    uint256 currentMarketCap = getCurrentMarketCap(tokenAddress);
    emit TokenGraduatedByMarketCap(tokenAddress, params.currentSupply, info.totalRaised, currentMarketCap);
}
```

## 🏗️ 集成方案设计

### 方案A: 扩展BondingCurve合约 (推荐)

在BondingCurve合约中直接集成UniswapV2流动性添加功能。

**优点:**
- 原子性操作，毕业和添加流动性在同一交易中完成
- 用户体验最佳
- 减少MEV攻击风险

**缺点:**
- 需要修改现有合约
- 增加合约复杂度

### 方案B: 外部监听器方案

通过外部监听器监听毕业事件，然后调用流动性添加函数。

**优点:**
- 不需要修改现有合约
- 灵活性更高

**缺点:**
- 需要额外的基础设施
- 存在MEV风险
- 可能出现监听延迟

## 📝 合约改进建议

### 1. 添加UniswapV2集成接口

```solidity
// 在BondingCurve合约中添加以下接口和变量

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

// 新增状态变量
IUniswapV2Router02 public uniswapRouter;
address public liquidityRecipient; // LP代币接收者
uint256 public liquidityPercentage = 8000; // 80%的ETH用于流动性

// 新增事件
event LiquidityAdded(
    address indexed token,
    uint256 tokenAmount,
    uint256 ethAmount,
    uint256 liquidity,
    address pairAddress
);
```

### 2. 改进毕业逻辑

```solidity
/**
 * @notice 处理代币毕业并添加流动性
 * @param tokenAddress 代币地址
 */
function _handleGraduation(address tokenAddress) internal {
    CurveParams storage params = curveParams[tokenAddress];
    TokenInfo storage info = tokenInfos[tokenAddress];
    
    // 标记为已毕业
    params.graduated = true;
    
    // 计算用于流动性的ETH数量
    uint256 contractBalance = address(this).balance;
    uint256 liquidityETH = (contractBalance * liquidityPercentage) / 10000;
    
    if (liquidityETH > 0 && address(uniswapRouter) != address(0)) {
        // 添加流动性
        _addLiquidityToUniswap(tokenAddress, liquidityETH);
    }
    
    // 发出毕业事件
    uint256 currentMarketCap = getCurrentMarketCap(tokenAddress);
    emit TokenGraduatedByMarketCap(
        tokenAddress, 
        params.currentSupply, 
        info.totalRaised, 
        currentMarketCap
    );
}

/**
 * @notice 添加流动性到UniswapV2
 * @param tokenAddress 代币地址
 * @param ethAmount 用于流动性的ETH数量
 */
function _addLiquidityToUniswap(address tokenAddress, uint256 ethAmount) internal {
    CurveParams memory params = curveParams[tokenAddress];
    
    // 计算需要铸造的代币数量
    // 使用当前价格计算，确保价格合理
    uint256 currentPrice = getCurrentPrice(tokenAddress);
    uint256 tokenAmount = (ethAmount * 1e18) / currentPrice;
    
    // 铸造代币用于流动性
    MemeToken token = MemeToken(tokenAddress);
    token.mint(address(this), tokenAmount);
    
    // 授权Router使用代币
    token.approve(address(uniswapRouter), tokenAmount);
    
    // 添加流动性
    try uniswapRouter.addLiquidityETH{value: ethAmount}(
        tokenAddress,
        tokenAmount,
        tokenAmount * 95 / 100, // 5%滑点保护
        ethAmount * 95 / 100,   // 5%滑点保护
        liquidityRecipient,      // LP代币接收者
        block.timestamp + 15 minutes
    ) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        
        // 获取交易对地址
        address pairAddress = IUniswapV2Factory(uniswapRouter.factory())
            .getPair(tokenAddress, uniswapRouter.WETH());
        
        emit LiquidityAdded(tokenAddress, amountToken, amountETH, liquidity, pairAddress);
        
    } catch Error(string memory reason) {
        // 如果添加流动性失败，记录错误但不阻止毕业
        emit LiquidityAddFailed(tokenAddress, reason);
    }
}

// 添加流动性失败事件
event LiquidityAddFailed(address indexed token, string reason);
```

### 3. 修改buyTokens函数

```solidity
function buyTokens(address tokenAddress, uint256 minTokenAmount) 
    external payable nonReentrant {
    // ... 现有逻辑 ...

    // 检查是否达到毕业条件（放在状态更新之后）
    if (checkGraduationCondition(tokenAddress)) {
        _handleGraduation(tokenAddress);
    }

    emit TokenBought(
        tokenAddress,
        msg.sender,
        msg.value,
        tokenAmount,
        getCurrentPrice(tokenAddress),
        params.currentSupply
    );
}
```

## 🔄 自动毕业流程

### 完整流程图

```
用户购买代币
    ↓
检查毕业条件
    ↓
市值 >= 10 ETH?
    ↓ 是
标记为已毕业
    ↓
计算流动性参数
    ↓
铸造配对代币
    ↓
添加流动性到UniswapV2
    ↓
发送LP代币给接收者
    ↓
发出毕业事件
```

### 详细步骤说明

1. **毕业检查**
   - 在每次 `buyTokens()` 后检查市值
   - 市值计算：`currentPrice * currentSupply / 1e18`

2. **流动性计算**
   - 从合约ETH余额中提取指定比例（默认80%）
   - 根据当前价格计算需要的代币数量

3. **代币铸造**
   - 为流动性配对铸造额外代币
   - 铸造数量 = `ethAmount * 1e18 / currentPrice`

4. **流动性添加**
   - 调用UniswapV2Router的 `addLiquidityETH`
   - 设置滑点保护（默认5%）
   - LP代币发送给指定接收者

5. **错误处理**
   - 使用try-catch确保毕业不会因流动性添加失败而回滚
   - 记录失败原因用于调试

## 💻 代码实现

### 完整的毕业处理合约扩展

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// 在BondingCurve合约中添加以下功能

contract BondingCurveWithUniswap is BondingCurve {
    
    IUniswapV2Router02 public uniswapRouter;
    address public liquidityRecipient;
    uint256 public liquidityPercentage = 8000; // 80%
    
    // 毕业后的流动性信息
    mapping(address => LiquidityInfo) public liquidityInfos;
    
    struct LiquidityInfo {
        address pairAddress;
        uint256 liquidityAmount;
        uint256 tokenAmount;
        uint256 ethAmount;
        uint256 addedAt;
    }
    
    event LiquidityAdded(
        address indexed token,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 liquidity,
        address pairAddress
    );
    
    event LiquidityAddFailed(address indexed token, string reason);
    
    constructor(
        address _memePlatform,
        address _uniswapRouter,
        address _liquidityRecipient
    ) BondingCurve(_memePlatform) {
        require(_uniswapRouter != address(0), "Invalid router");
        require(_liquidityRecipient != address(0), "Invalid recipient");
        
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        liquidityRecipient = _liquidityRecipient;
    }
    
    /**
     * @notice 设置UniswapV2 Router地址
     */
    function setUniswapRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        uniswapRouter = IUniswapV2Router02(_router);
    }
    
    /**
     * @notice 设置流动性接收者
     */
    function setLiquidityRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        liquidityRecipient = _recipient;
    }
    
    /**
     * @notice 设置流动性百分比
     */
    function setLiquidityPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 10000, "Percentage too high");
        liquidityPercentage = _percentage;
    }
    
    /**
     * @notice 重写购买函数以包含毕业处理
     */
    function buyTokens(address tokenAddress, uint256 minTokenAmount) 
        external payable override nonReentrant {
        require(isValidToken[tokenAddress], "Invalid token");
        require(msg.value > 0, "Must send ETH");
        
        CurveParams storage params = curveParams[tokenAddress];
        require(!params.graduated, "Token has graduated");

        // 原有的购买逻辑...
        uint256 tokenAmount = calculateTokensForEthPrecise(tokenAddress, msg.value);
        require(tokenAmount >= minTokenAmount, "Slippage protection");
        require(params.currentSupply + tokenAmount <= params.targetSupply, "Exceeds target supply");

        // 更新状态
        params.currentSupply += tokenAmount;
        
        TokenInfo storage info = tokenInfos[tokenAddress];
        info.totalRaised += msg.value;

        // 铸造代币给买家
        MemeToken token = MemeToken(tokenAddress);
        token.mint(msg.sender, tokenAmount);

        // 费用分配...（原有逻辑）
        uint256 creatorFee = (msg.value * CREATOR_FEE) / FEE_BASE;
        uint256 platformFee = (msg.value * PLATFORM_FEE) / FEE_BASE;
        
        if (creatorFee > 0) {
            (bool success, ) = payable(info.creator).call{value: creatorFee}("");
            require(success, "Creator fee transfer failed");
            info.creatorFeeCollected += creatorFee;
        }

        if (platformFee > 0) {
            totalPlatformFeesCollected += platformFee;
            (bool success, ) = payable(memePlatform).call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
            IMemePlatform(memePlatform).receivePlatformFees{value: 0}();
            emit PlatformFeeSent(memePlatform, platformFee);
        }

        // 检查毕业条件
        if (checkGraduationCondition(tokenAddress)) {
            _handleGraduation(tokenAddress);
        }

        emit TokenBought(
            tokenAddress,
            msg.sender,
            msg.value,
            tokenAmount,
            getCurrentPrice(tokenAddress),
            params.currentSupply
        );
    }
    
    /**
     * @notice 处理代币毕业
     */
    function _handleGraduation(address tokenAddress) internal {
        CurveParams storage params = curveParams[tokenAddress];
        TokenInfo storage info = tokenInfos[tokenAddress];
        
        // 标记为已毕业
        params.graduated = true;
        
        // 添加流动性（如果配置了Router）
        if (address(uniswapRouter) != address(0)) {
            _addLiquidityToUniswap(tokenAddress);
        }
        
        // 发出毕业事件
        uint256 currentMarketCap = getCurrentMarketCap(tokenAddress);
        emit TokenGraduatedByMarketCap(
            tokenAddress, 
            params.currentSupply, 
            info.totalRaised, 
            currentMarketCap
        );
    }
    
    /**
     * @notice 添加流动性到UniswapV2
     */
    function _addLiquidityToUniswap(address tokenAddress) internal {
        uint256 contractBalance = address(this).balance;
        uint256 liquidityETH = (contractBalance * liquidityPercentage) / 10000;
        
        if (liquidityETH == 0) {
            return;
        }
        
        // 计算代币数量（使用当前价格）
        uint256 currentPrice = getCurrentPrice(tokenAddress);
        uint256 tokenAmount = (liquidityETH * 1e18) / currentPrice;
        
        // 铸造代币
        MemeToken token = MemeToken(tokenAddress);
        token.mint(address(this), tokenAmount);
        
        // 授权Router
        token.approve(address(uniswapRouter), tokenAmount);
        
        // 添加流动性
        try uniswapRouter.addLiquidityETH{value: liquidityETH}(
            tokenAddress,
            tokenAmount,
            tokenAmount * 95 / 100, // 5%滑点保护
            liquidityETH * 95 / 100, // 5%滑点保护
            liquidityRecipient,
            block.timestamp + 15 minutes
        ) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
            
            // 获取交易对地址
            address pairAddress = IUniswapV2Factory(uniswapRouter.factory())
                .getPair(tokenAddress, uniswapRouter.WETH());
            
            // 记录流动性信息
            liquidityInfos[tokenAddress] = LiquidityInfo({
                pairAddress: pairAddress,
                liquidityAmount: liquidity,
                tokenAmount: amountToken,
                ethAmount: amountETH,
                addedAt: block.timestamp
            });
            
            emit LiquidityAdded(tokenAddress, amountToken, amountETH, liquidity, pairAddress);
            
        } catch Error(string memory reason) {
            emit LiquidityAddFailed(tokenAddress, reason);
        }
    }
    
    /**
     * @notice 手动为已毕业代币添加流动性（紧急情况使用）
     */
    function manualAddLiquidity(address tokenAddress) external onlyOwner {
        require(isValidToken[tokenAddress], "Invalid token");
        require(curveParams[tokenAddress].graduated, "Token not graduated");
        require(liquidityInfos[tokenAddress].pairAddress == address(0), "Liquidity already added");
        
        _addLiquidityToUniswap(tokenAddress);
    }
    
    /**
     * @notice 获取流动性信息
     */
    function getLiquidityInfo(address tokenAddress) 
        external view returns (LiquidityInfo memory) {
        return liquidityInfos[tokenAddress];
    }
}
```

## 📋 调用示例

### 1. 部署和初始化

```solidity
// 1. 部署合约
BondingCurveWithUniswap bondingCurve = new BondingCurveWithUniswap(
    memePlatformAddress,
    uniswapRouterAddress,
    liquidityRecipientAddress
);

// 2. 设置授权调用者（MemePlatform）
bondingCurve.addAuthorizedCaller(memePlatformAddress);

// 3. 初始化代币curve
bondingCurve.initializeCurve(
    tokenAddress,
    creatorAddress,
    targetSupply,    // 1000000 * 1e18
    targetPrice,     // 0.00001 ether
    initialPrice     // 0.000001 ether
);
```

### 2. 用户交互示例

```javascript
// 前端JavaScript示例

// 购买代币
async function buyTokens(tokenAddress, ethAmount, minTokens) {
    const tx = await bondingCurve.buyTokens(
        tokenAddress,
        minTokens,
        { value: ethers.parseEther(ethAmount.toString()) }
    );
    
    const receipt = await tx.wait();
    
    // 检查是否毕业
    const graduationEvent = receipt.events?.find(
        e => e.event === 'TokenGraduatedByMarketCap'
    );
    
    if (graduationEvent) {
        console.log('🎉 Token graduated!');
        
        // 检查流动性添加事件
        const liquidityEvent = receipt.events?.find(
            e => e.event === 'LiquidityAdded'
        );
        
        if (liquidityEvent) {
            console.log('✅ Liquidity added to Uniswap:', {
                pairAddress: liquidityEvent.args.pairAddress,
                tokenAmount: ethers.formatEther(liquidityEvent.args.tokenAmount),
                ethAmount: ethers.formatEther(liquidityEvent.args.ethAmount),
                liquidity: ethers.formatEther(liquidityEvent.args.liquidity)
            });
        }
    }
}

// 查询代币状态
async function getTokenStatus(tokenAddress) {
    const [params, info, currentPrice, marketCap] = await bondingCurve.getTokenDetails(tokenAddress);
    
    const status = {
        isGraduated: params.graduated,
        currentSupply: ethers.formatEther(params.currentSupply),
        currentPrice: ethers.formatEther(currentPrice),
        marketCap: ethers.formatEther(marketCap),
        totalRaised: ethers.formatEther(info.totalRaised)
    };
    
    if (params.graduated) {
        const liquidityInfo = await bondingCurve.getLiquidityInfo(tokenAddress);
        status.liquidityInfo = {
            pairAddress: liquidityInfo.pairAddress,
            liquidityAmount: ethers.formatEther(liquidityInfo.liquidityAmount),
            tokenAmount: ethers.formatEther(liquidityInfo.tokenAmount),
            ethAmount: ethers.formatEther(liquidityInfo.ethAmount)
        };
    }
    
    return status;
}
```

### 3. 监听毕业事件

```javascript
// 监听毕业和流动性添加事件
bondingCurve.on('TokenGraduatedByMarketCap', (tokenAddress, finalSupply, totalRaised, marketCap) => {
    console.log('Token graduated:', {
        token: tokenAddress,
        finalSupply: ethers.formatEther(finalSupply),
        totalRaised: ethers.formatEther(totalRaised),
        marketCap: ethers.formatEther(marketCap)
    });
});

bondingCurve.on('LiquidityAdded', (tokenAddress, tokenAmount, ethAmount, liquidity, pairAddress) => {
    console.log('Liquidity added:', {
        token: tokenAddress,
        tokenAmount: ethers.formatEther(tokenAmount),
        ethAmount: ethers.formatEther(ethAmount),
        liquidity: ethers.formatEther(liquidity),
        pairAddress: pairAddress
    });
});

bondingCurve.on('LiquidityAddFailed', (tokenAddress, reason) => {
    console.error('Liquidity add failed:', {
        token: tokenAddress,
        reason: reason
    });
});
```

## ⚠️ 注意事项

### 1. 安全考虑

- **滑点保护**: 添加流动性时设置合理的滑点保护
- **重入保护**: 使用ReentrancyGuard防止重入攻击
- **权限控制**: 确保只有授权地址可以初始化curve
- **错误处理**: 使用try-catch确保流动性添加失败不影响毕业

### 2. 经济模型

- **流动性比例**: 建议80%的ETH用于流动性，20%留作储备
- **代币比例**: 根据当前价格计算配对代币数量
- **LP代币管理**: 建议将LP代币发送给项目方或DAO金库

### 3. Gas优化

- **批量操作**: 毕业和流动性添加在同一交易中完成
- **事件记录**: 记录关键信息用于前端查询
- **失败处理**: 流动性添加失败不影响毕业状态

### 4. 兼容性

- **MemeToken要求**: 代币合约需要支持mint功能
- **UniswapV2版本**: 确保使用正确的Router和Factory地址
- **网络支持**: 在目标网络上部署相应的Uniswap合约

### 5. 监控和维护

- **事件监听**: 监听毕业和流动性事件
- **状态查询**: 提供查询接口检查代币状态
- **紧急处理**: 提供手动添加流动性的后备方案

## 🔧 测试建议

### 1. 单元测试

```solidity
// 测试毕业条件
function testGraduationCondition() public {
    // 购买代币直到接近毕业
    // 验证毕业条件检查逻辑
}

// 测试流动性添加
function testLiquidityAddition() public {
    // 模拟毕业场景
    // 验证流动性添加逻辑
}

// 测试错误处理
function testFailureHandling() public {
    // 模拟流动性添加失败
    // 验证错误处理逻辑
}
```

### 2. 集成测试

```javascript
// 端到端测试
describe('Graduation Flow', () => {
    it('should add liquidity on graduation', async () => {
        // 购买代币到毕业
        // 检查流动性是否添加
        // 验证LP代币分配
    });
});
```

---

通过以上改进，您的BondingCurve合约将能够在代币毕业时自动添加流动性到UniswapV2，为用户提供完整的从bonding curve到DEX交易的无缝体验。 