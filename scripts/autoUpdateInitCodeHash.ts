import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔧 自动化 Init Code Hash 检查和更新工具\n");

  // 1. 获取当前 UniswapV2Pair 的字节码和 hash
  const UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair");
  const currentBytecode = UniswapV2Pair.bytecode;
  const currentHash = ethers.keccak256(currentBytecode);

  console.log("📋 当前合约信息:");
  console.log("- 字节码长度:", currentBytecode.length, "字符");
  console.log("- 当前 Hash:", currentHash);

  // 2. 读取 UniswapV2Library.sol 文件
  const libraryPath = path.join(__dirname, '../contracts/libraries/UniswapV2Library.sol');
  let libraryContent = fs.readFileSync(libraryPath, 'utf8');

  // 3. 提取当前使用的 hash
  const hashRegex = /hex'([a-fA-F0-9]{64})'/;
  const hashMatch = libraryContent.match(hashRegex);
  const libraryHash = hashMatch ? `0x${hashMatch[1]}` : null;

  console.log("\n📚 Library 中的信息:");
  console.log("- Library Hash:", libraryHash);

  // 4. 比较是否一致
  const isMatch = currentHash.toLowerCase() === libraryHash?.toLowerCase();
  console.log("\n🔄 Hash 比较:");
  console.log("- 是否一致:", isMatch ? "✅ 是" : "❌ 否");

  if (isMatch) {
    console.log("✅ Hash 已是最新，无需更新！");
    return;
  }

  // 5. 需要更新
  console.log("\n⚠️  检测到 Hash 不匹配，需要更新...");
  
  if (!libraryHash) {
    console.log("❌ 无法找到当前 Library 中的 hash 值");
    return;
  }

  // 6. 执行自动更新
  console.log("\n🔧 正在自动更新...");
  
  const oldHashPattern = `hex'${libraryHash.slice(2)}'`;
  const newHashPattern = `hex'${currentHash.slice(2)}'`;
  
  console.log("- 查找模式:", oldHashPattern);
  console.log("- 替换为:", newHashPattern);

  // 替换 hash
  const updatedContent = libraryContent.replace(oldHashPattern, newHashPattern);
  
  // 验证替换是否成功
  if (updatedContent === libraryContent) {
    console.log("❌ 替换失败，请检查文件格式");
    return;
  }

  // 7. 写回文件
  fs.writeFileSync(libraryPath, updatedContent, 'utf8');
  
  console.log("✅ 文件更新成功！");

  // 8. 验证更新结果
  const verifyContent = fs.readFileSync(libraryPath, 'utf8');
  const verifyMatch = verifyContent.match(hashRegex);
  const verifyHash = verifyMatch ? `0x${verifyMatch[1]}` : null;

  console.log("\n🔍 更新验证:");
  console.log("- 更新后的 Hash:", verifyHash);
  console.log("- 是否正确:", currentHash.toLowerCase() === verifyHash?.toLowerCase() ? "✅ 是" : "❌ 否");

  // 9. 提供后续步骤建议
  console.log("\n📋 后续步骤建议:");
  console.log("1. 🔄 重新编译项目: npx hardhat compile");
  console.log("2. 🧪 运行测试: npx hardhat test");
  console.log("3. 🚀 重新部署合约");
  console.log("4. 🌐 更新前端配置");

  // 10. 记录变更日志
  const changeLog = `
# Init Code Hash 更新日志

**时间**: ${new Date().toISOString()}
**旧 Hash**: ${libraryHash}
**新 Hash**: ${currentHash}
**字节码长度**: ${currentBytecode.length} 字符

## 可能的变更原因
- UniswapV2Pair 合约代码修改
- Solidity 编译器版本更新
- 编译器优化设置变更
- 依赖库更新

## 更新的文件
- contracts/libraries/UniswapV2Library.sol

## 后续操作
- [ ] 重新编译项目
- [ ] 运行全面测试
- [ ] 更新部署脚本
- [ ] 验证前端集成
`;

  const logPath = path.join(__dirname, '../INIT_HASH_CHANGES.md');
  fs.appendFileSync(logPath, changeLog, 'utf8');
  
  console.log(`\n📝 变更日志已记录到: ${logPath}`);
  
  console.log("\n🎉 自动更新完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 更新过程中出现错误:", error);
    process.exit(1);
  }); 