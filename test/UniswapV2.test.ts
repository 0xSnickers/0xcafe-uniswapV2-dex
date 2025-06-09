import { expect } from "chai";
import { ethers } from "hardhat";

describe("UniswapV2", function () {
  let factory: any;
  let router: any;
  let tokenA: any;
  let tokenB: any;
  let owner: any;
  let WETH: string;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

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

  it("should create pair", async function () {
    const tx = await factory.createPair(tokenA.target, tokenB.target);
    const receipt = await tx.wait();
    
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);
  });

  it("should add liquidity", async function () {
    // Create pair
    await factory.createPair(tokenA.target, tokenB.target);

    // Mint tokens
    const amount = ethers.parseEther("1000");
    await tokenA.mint(owner.address, amount);
    await tokenB.mint(owner.address, amount);

    // Approve router
    await tokenA.approve(router.target, amount);
    await tokenB.approve(router.target, amount);

    // Add liquidity
    const liquidityAmount = ethers.parseEther("100");
    const tx = await router.addLiquidity(
      tokenA.target,
      tokenB.target,
      liquidityAmount,
      liquidityAmount,
      liquidityAmount,
      liquidityAmount,
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );
    const receipt = await tx.wait();

    // Get pair address
    const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
    const pair = await ethers.getContractAt("@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);

    // Check liquidity
    const balance = await pair.balanceOf(owner.address);
    expect(balance).to.be.gt(0);
  });
}); 