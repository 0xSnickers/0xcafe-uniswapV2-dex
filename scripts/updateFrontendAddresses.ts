import * as fs from 'fs';
import * as path from 'path';

interface DeploymentAddresses {
  factory: string;
  router: string;
  weth: string;
}

// 从部署输出或环境变量中读取合约地址
function getDeploymentAddresses(): DeploymentAddresses {
  // 这里可以从多个来源读取地址，比如：
  // 1. 部署脚本的输出文件
  // 2. 环境变量
  // 3. 命令行参数

  return {
    factory: process.env.FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    router: process.env.ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
    weth: process.env.WETH_ADDRESS || '0x0000000000000000000000000000000000000000',
  };
}

// 更新前端地址配置文件
function updateFrontendAddresses(addresses: DeploymentAddresses, chainId: number = 31337) {
  const frontendConfigPath = path.join('frontend', 'src', 'config', 'addresses.ts');
  
  try {
    // 读取现有配置
    let configContent = fs.readFileSync(frontendConfigPath, 'utf8');
    
    // 查找并替换对应链ID的地址
    const chainConfig = `  // Localhost (Anvil)
  ${chainId}: {
    factory: '${addresses.factory}',
    router: '${addresses.router}',
    weth: '${addresses.weth}',
  },`;

    // 使用正则表达式替换对应的链配置
    const chainRegex = new RegExp(`  // Localhost \\(Anvil\\)\\s*\\n  ${chainId}: {[^}]+},`, 'g');
    
    if (chainRegex.test(configContent)) {
      configContent = configContent.replace(chainRegex, chainConfig);
    } else {
      // 如果找不到对应的链配置，在 CONTRACT_ADDRESSES 对象中添加
      const insertionPoint = configContent.indexOf('  // Add other networks as needed');
      if (insertionPoint !== -1) {
        configContent = 
          configContent.slice(0, insertionPoint) +
          chainConfig + '\n  ' +
          configContent.slice(insertionPoint);
      }
    }

    // 写回文件
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log('✅ Frontend contract addresses updated successfully!');
    console.log(`📍 Chain ID: ${chainId}`);
    console.log(`🏭 Factory: ${addresses.factory}`);
    console.log(`🔄 Router: ${addresses.router}`);
    console.log(`💰 WETH: ${addresses.weth}`);
    
  } catch (error) {
    console.error('❌ Error updating frontend addresses:', error);
  }
}

// 生成部署摘要
function generateDeploymentSummary(addresses: DeploymentAddresses, chainId: number) {
  const summary = `# Deployment Summary

**Chain ID:** ${chainId}
**Timestamp:** ${new Date().toISOString()}

## Contract Addresses

- **Factory:** \`${addresses.factory}\`
- **Router:** \`${addresses.router}\`
- **WETH:** \`${addresses.weth}\`

## Frontend Integration

The contract addresses have been automatically updated in the frontend configuration.
You can now use these contracts in your dApp:

\`\`\`typescript
import { getContractAddresses } from './config/addresses';

const addresses = getContractAddresses(${chainId});
console.log('Factory:', addresses.factory);
console.log('Router:', addresses.router);
console.log('WETH:', addresses.weth);
\`\`\`

## Next Steps

1. Start your frontend application: \`cd frontend && npm run dev\`
2. Connect your wallet to the local network (Chain ID: ${chainId})
3. Test token swaps and liquidity operations
`;

  const frontendDir = path.join('frontend');
  fs.writeFileSync(path.join(frontendDir, 'DEPLOYMENT_SUMMARY.md'), summary);
  console.log('📄 Deployment summary generated at frontend/DEPLOYMENT_SUMMARY.md');
}

// 主函数
async function main() {
  console.log('🔄 Updating frontend contract addresses...');
  
  const chainId = parseInt(process.env.CHAIN_ID || '31337');
  const addresses = getDeploymentAddresses();
  
  // 验证地址是否有效
  const isValidAddress = (addr: string) => addr && addr !== '0x0000000000000000000000000000000000000000';
  
  if (!isValidAddress(addresses.factory) || !isValidAddress(addresses.router) || !isValidAddress(addresses.weth)) {
    console.error('❌ Invalid contract addresses detected. Please check your environment variables:');
    console.error('   - FACTORY_ADDRESS');
    console.error('   - ROUTER_ADDRESS');
    console.error('   - WETH_ADDRESS');
    process.exit(1);
  }
  
  updateFrontendAddresses(addresses, chainId);
  generateDeploymentSummary(addresses, chainId);
  
  console.log('\n✅ Frontend integration completed!');
  console.log('🚀 You can now start your frontend application and begin testing.');
}

if (require.main === module) {
  main().catch(console.error);
} 