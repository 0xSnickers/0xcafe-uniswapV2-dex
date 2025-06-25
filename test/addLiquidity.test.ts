import { expect } from "chai";
import { ethers } from "hardhat";

describe("UniswapV2 AddLiquidity", function () {
  let factory: any;
  let router: any;
  let tokenA: any;
  let tokenB: any;
  let owner: any;
  const WETH = "0x0000000000000000000000000000000000000000"; // 使用零地址作为 WETH

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

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
  });

  it("should add liquidity", async function () {
    // Mint tokens
    const amount = ethers.parseEther("1000");
    await tokenA.mint(owner.address, amount);
    await tokenB.mint(owner.address, amount);

    // Approve router
    await tokenA.approve(router.target, amount);
    await tokenB.approve(router.target, amount);

    // Check if pair exists, if not create it
    let pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    console.log("Pair address before:", pairAddress);
    
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      console.log("Creating new pair...");
      await factory.createPair(tokenA.target, tokenB.target);
      pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      console.log("New pair address:", pairAddress);
    }

    // Add liquidity
    const liquidityAmount = ethers.parseEther("100");
    console.log("Adding liquidity...");
    
    const tx = await router.addLiquidity(
      tokenA.target, // 代币A地址
      tokenB.target, // 代币B地址
      liquidityAmount, // 代币A期望数量
      liquidityAmount, // 代币B期望数量
      liquidityAmount * 95n / 100n, // 代币A最小数量 (5% slippage)
      liquidityAmount * 95n / 100n, // 代币B最小数量 (5% slippage)
      owner.address, // 接收流动性地址
      Math.floor(Date.now() / 1000) + 3600 // 交易期限
    );

    await tx.wait();
    console.log("Liquidity added successfully");

    // Get pair and check liquidity
    const pair = await ethers.getContractAt("@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);
    const balance = await pair.balanceOf(owner.address);
    console.log("LP token balance:", balance.toString());
    
    expect(balance).to.be.gt(0);
  });
}); 