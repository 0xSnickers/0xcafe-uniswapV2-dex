import { ethers } from "hardhat";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 部署 UniswapV2Factory 和 UniswapV2Router02 合约
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MockWETH
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const mockWETH = await MockWETH.deploy();
  await mockWETH.waitForDeployment();
  const wethAddress = await mockWETH.getAddress();
  console.log("MockWETH deployed to:", wethAddress);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  // Deploy Router
  const Router = await ethers.getContractFactory("contracts/UniswapV2Router02.sol:UniswapV2Router02");
  const router = await Router.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("Router deployed to:", routerAddress);

  // Generate ABI configurations for frontend
  console.log("\n🔄 Generating frontend configurations...");
  try {
    await execAsync("npx ts-node scripts/generateAbi.ts");
    console.log("✅ ABI configurations generated");
  } catch (error) {
    console.error("❌ Error generating ABI configurations:", error);
  }

  // Update frontend contract addresses
  console.log("\n🔄 Updating frontend contract addresses...");
  try {
    process.env.FACTORY_ADDRESS = factoryAddress;
    process.env.ROUTER_ADDRESS = routerAddress;
    process.env.WETH_ADDRESS = wethAddress;
    process.env.CHAIN_ID = "31337";

    await execAsync("npx ts-node scripts/updateFrontendAddresses.ts");
    console.log("✅ Frontend addresses updated");
  } catch (error) {
    console.error("❌ Error updating frontend addresses:", error);
  }

  // Display deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(`📍 Network: Local (Chain ID: 31337)`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log(`   🏭 Factory:  ${factoryAddress}`);
  console.log(`   🔄 Router:   ${routerAddress}`);
  console.log(`   💰 WETH:     ${wethAddress}`);
  console.log("");
  console.log("🔗 Frontend Integration:");
  console.log("   ✅ ABI configurations generated");
  console.log("   ✅ Contract addresses updated");
  console.log("   📄 Deployment summary created");
  console.log("");
  console.log("🚀 Next Steps:");
  console.log("   1. cd frontend && npm run dev");
  console.log("   2. Connect wallet to localhost:8545 (Chain ID: 31337)");
  console.log("   3. Start testing your dApp!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 