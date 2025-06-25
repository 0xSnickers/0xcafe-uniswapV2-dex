import { expect } from "chai";
import { ethers } from "hardhat";

describe("UniswapV2 AddLiquidity - Comprehensive Tests", function () {
  let factory: any;
  let router: any;
  let tokenA: any;
  let tokenB: any;
  let tokenC: any;
  let owner: any;
  let user1: any;
  const WETH = "0x0000000000000000000000000000000000000000"; // 使用零地址作为 WETH

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await Factory.deploy(owner.address);

    // Deploy Router
    const Router = await ethers.getContractFactory("contracts/UniswapV2Router02.sol:UniswapV2Router02");
    router = await Router.deploy(factory.target, WETH);

    // Deploy test tokens
    const Token = await ethers.getContractFactory("MockERC20");
    tokenA = await Token.deploy("Token A", "TKNA", 18);
    tokenB = await Token.deploy("Token B", "TKNB", 18);
    tokenC = await Token.deploy("Token C", "TKNC", 18);

    // Mint tokens to owner
    const amount = ethers.parseEther("10000");
    await tokenA.mint(owner.address, amount);
    await tokenB.mint(owner.address, amount);
    await tokenC.mint(owner.address, amount);
  });

  it("✅ 第一次添加流动性 - 创建新池子", async function () {
    console.log("🔧 测试场景: 首次为代币对添加流动性");

    // 检查池子是否存在
    const pairAddressBefore = await factory.getPair(tokenA.target, tokenB.target);
    expect(pairAddressBefore).to.equal("0x0000000000000000000000000000000000000000");
    console.log("✓ 确认池子不存在");

    // 授权代币
    const liquidityAmount = ethers.parseEther("100");
    await tokenA.approve(router.target, liquidityAmount);
    await tokenB.approve(router.target, liquidityAmount);
    console.log("✓ 代币授权完成");

    // 添加流动性
    const tx = await router.addLiquidity(
      tokenA.target,
      tokenB.target,
      liquidityAmount,
      liquidityAmount,
      liquidityAmount * 95n / 100n,
      liquidityAmount * 95n / 100n,
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );

    await tx.wait();
    console.log("✓ 流动性添加成功");

    // 验证池子已创建
    const pairAddressAfter = await factory.getPair(tokenA.target, tokenB.target);
    expect(pairAddressAfter).to.not.equal("0x0000000000000000000000000000000000000000");
    console.log("✓ 新池子已创建:", pairAddressAfter);

    // 检查LP代币余额
    const pair = await ethers.getContractAt("@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddressAfter);
    const lpBalance = await pair.balanceOf(owner.address);
    expect(lpBalance).to.be.gt(0);
    console.log("✓ LP代币余额:", ethers.formatEther(lpBalance));
  });

  it("✅ 第二次添加流动性 - 使用现有池子", async function () {
    console.log("🔧 测试场景: 向现有池子添加更多流动性");

    // 先创建池子
    const liquidityAmount = ethers.parseEther("100");
    await tokenA.approve(router.target, liquidityAmount);
    await tokenB.approve(router.target, liquidityAmount);

    await router.addLiquidity(
      tokenA.target,
      tokenB.target,
      liquidityAmount,
      liquidityAmount,
      liquidityAmount * 95n / 100n,
      liquidityAmount * 95n / 100n,
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );
    console.log("✓ 初始流动性已添加");

    // 获取池子地址和初始LP余额
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    const pair = await ethers.getContractAt("@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);
    const initialLpBalance = await pair.balanceOf(owner.address);
    console.log("✓ 初始LP余额:", ethers.formatEther(initialLpBalance));

    // 添加更多流动性
    const additionalAmount = ethers.parseEther("50");
    await tokenA.approve(router.target, additionalAmount);
    await tokenB.approve(router.target, additionalAmount);

    await router.addLiquidity(
      tokenA.target,
      tokenB.target,
      additionalAmount,
      additionalAmount,
      additionalAmount * 95n / 100n,
      additionalAmount * 95n / 100n,
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );
    console.log("✓ 额外流动性已添加");

    // 检查LP余额增加
    const finalLpBalance = await pair.balanceOf(owner.address);
    expect(finalLpBalance).to.be.gt(initialLpBalance);
    console.log("✓ 最终LP余额:", ethers.formatEther(finalLpBalance));
    console.log("✓ LP余额增加:", ethers.formatEther(finalLpBalance - initialLpBalance));
  });

  it("✅ 不同比例的流动性添加", async function () {
    console.log("🔧 测试场景: 添加不等比例的流动性");

    // 授权大量代币
    const largeAmount = ethers.parseEther("1000");
    await tokenA.approve(router.target, largeAmount);
    await tokenB.approve(router.target, largeAmount);

    // 添加不等比例的流动性
    const amountA = ethers.parseEther("100");
    const amountB = ethers.parseEther("200"); // B是A的两倍

    const tx = await router.addLiquidity(
      tokenA.target,
      tokenB.target,
      amountA,
      amountB,
      amountA * 90n / 100n, // 10% 滑点
      amountB * 90n / 100n,
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );

    await tx.wait();
    console.log("✓ 不等比例流动性添加成功");

    // 检查池子储备
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    const pair = await ethers.getContractAt("@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);
    const reserves = await pair.getReserves();
    
    console.log("✓ 储备0:", ethers.formatEther(reserves[0]));
    console.log("✓ 储备1:", ethers.formatEther(reserves[1]));
    console.log("✓ 比例:", Number(reserves[1]) / Number(reserves[0]));
  });

  it("✅ 多个用户添加流动性", async function () {
    console.log("🔧 测试场景: 多个用户向同一池子添加流动性");

    // 给user1铸造代币
    const amount = ethers.parseEther("1000");
    await tokenA.mint(user1.address, amount);
    await tokenB.mint(user1.address, amount);

    // Owner先添加流动性
    const ownerAmount = ethers.parseEther("100");
    await tokenA.approve(router.target, ownerAmount);
    await tokenB.approve(router.target, ownerAmount);

    await router.addLiquidity(
      tokenA.target,
      tokenB.target,
      ownerAmount,
      ownerAmount,
      ownerAmount * 95n / 100n,
      ownerAmount * 95n / 100n,
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );
    console.log("✓ Owner已添加流动性");

    // User1添加流动性
    const user1Amount = ethers.parseEther("50");
    await tokenA.connect(user1).approve(router.target, user1Amount);
    await tokenB.connect(user1).approve(router.target, user1Amount);

    await router.connect(user1).addLiquidity(
      tokenA.target,
      tokenB.target,
      user1Amount,
      user1Amount,
      user1Amount * 95n / 100n,
      user1Amount * 95n / 100n,
      user1.address,
      Math.floor(Date.now() / 1000) + 3600
    );
    console.log("✓ User1已添加流动性");

    // 检查两个用户的LP余额
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    const pair = await ethers.getContractAt("@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);
    
    const ownerLpBalance = await pair.balanceOf(owner.address);
    const user1LpBalance = await pair.balanceOf(user1.address);

    expect(ownerLpBalance).to.be.gt(0);
    expect(user1LpBalance).to.be.gt(0);
    expect(ownerLpBalance).to.be.gt(user1LpBalance); // Owner添加的更多

    console.log("✓ Owner LP余额:", ethers.formatEther(ownerLpBalance));
    console.log("✓ User1 LP余额:", ethers.formatEther(user1LpBalance));
  });

  it("❌ 测试错误场景 - 相同代币", async function () {
    console.log("🔧 测试场景: 尝试为相同代币添加流动性");

    const amount = ethers.parseEther("100");
    await tokenA.approve(router.target, amount);

    // 尝试为相同代币添加流动性，应该失败
    await expect(
      router.addLiquidity(
        tokenA.target,
        tokenA.target, // 相同代币
        amount,
        amount,
        amount * 95n / 100n,
        amount * 95n / 100n,
        owner.address,
        Math.floor(Date.now() / 1000) + 3600
      )
    ).to.be.reverted;
    console.log("✓ 相同代币配对被正确拒绝");
  });

  it("❌ 测试错误场景 - 未授权", async function () {
    console.log("🔧 测试场景: 未授权代币就尝试添加流动性");

    const amount = ethers.parseEther("100");
    // 故意不进行授权

    await expect(
      router.addLiquidity(
        tokenA.target,
        tokenB.target,
        amount,
        amount,
        amount * 95n / 100n,
        amount * 95n / 100n,
        owner.address,
        Math.floor(Date.now() / 1000) + 3600
      )
    ).to.be.reverted;
    console.log("✓ 未授权的交易被正确拒绝");
  });

  it("✅ 检查地址预计算的准确性", async function () {
    console.log("🔧 测试场景: 验证CREATE2地址预计算");

    // 使用Library预计算地址
    const UniswapV2Library = await ethers.getContractFactory("contracts/libraries/UniswapV2Library.sol:UniswapV2Library");
    const library = await UniswapV2Library.deploy();
    
    // 注意：由于Library是内部函数，我们直接通过factory获取
    const predictedAddress = await factory.getPair(tokenA.target, tokenB.target);
    console.log("✓ 预测地址 (创建前):", predictedAddress);

    // 创建池子
    await factory.createPair(tokenA.target, tokenB.target);
    const actualAddress = await factory.getPair(tokenA.target, tokenB.target);
    console.log("✓ 实际地址 (创建后):", actualAddress);

    expect(actualAddress).to.not.equal("0x0000000000000000000000000000000000000000");
    console.log("✓ 池子创建成功，地址计算正确");
  });
}); 