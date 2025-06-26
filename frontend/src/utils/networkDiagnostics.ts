// 网络诊断工具 - 用于调试局域网合约调用问题

export interface NetworkDiagnostic {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  action?: () => void;
}

export interface ContractCallDiagnostic {
  contractName: string;
  address: string;
  isDeployed: boolean;
  hasCode: boolean;
  error?: string;
}

/**
 * 检查常见的网络配置问题
 */
export function diagnoseNetworkIssues(): NetworkDiagnostic[] {
  const diagnostics: NetworkDiagnostic[] = [];

  // 检查是否在开发环境
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('192.168');

    if (isLocalhost) {
      diagnostics.push({
        category: 'Environment',
        status: 'success',
        message: '运行在本地环境',
        suggestion: '确保 Hardhat 网络正在运行'
      });
    } else {
      diagnostics.push({
        category: 'Environment',
        status: 'warning',
        message: '运行在生产环境',
        suggestion: '检查网络配置是否正确'
      });
    }
  }

  // 检查 RPC URL 配置
  const rpcUrl = process.env.NEXT_PUBLIC_NETWORK_RPC;
  if (!rpcUrl) {
    diagnostics.push({
      category: 'RPC Configuration',
      status: 'error',
      message: 'NEXT_PUBLIC_NETWORK_RPC 未配置',
      suggestion: '在 .env.local 中设置 NEXT_PUBLIC_NETWORK_RPC=http://127.0.0.1:8545'
    });
  } else if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
    diagnostics.push({
      category: 'RPC Configuration',
      status: 'success',
      message: 'RPC URL 指向本地网络',
      suggestion: '确保 Hardhat 节点在该端口运行'
    });
  } else {
    diagnostics.push({
      category: 'RPC Configuration',
      status: 'warning',
      message: 'RPC URL 指向远程网络',
      suggestion: '如果要使用本地网络，请检查配置'
    });
  }

  // 检查 Chain ID
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (chainId === '31337') {
    diagnostics.push({
      category: 'Chain Configuration',
      status: 'success',
      message: 'Chain ID 配置为本地网络 (31337)'
    });
  } else {
    diagnostics.push({
      category: 'Chain Configuration',
      status: 'warning',
      message: `Chain ID 设置为 ${chainId || '未设置'}`,
      suggestion: '本地开发建议设置为 31337'
    });
  }

  return diagnostics;
}

/**
 * 检查局域网访问的常见问题
 */
export function diagnoseLANIssues(): NetworkDiagnostic[] {
  const diagnostics: NetworkDiagnostic[] = [];

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // 检查是否使用局域网 IP
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      diagnostics.push({
        category: 'LAN Access',
        status: 'warning',
        message: `通过局域网 IP (${host}) 访问`,
        suggestion: '确保 RPC URL 使用相同的网络地址'
      });

      // 检查 RPC URL 是否匹配
      const rpcUrl = process.env.NEXT_PUBLIC_NETWORK_RPC;
      if (rpcUrl && (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1'))) {
        diagnostics.push({
          category: 'LAN Access',
          status: 'error',
          message: 'RPC URL 使用 localhost，但页面通过局域网访问',
          suggestion: `将 RPC URL 改为 http://${host.split('.').slice(0, 3).join('.')}.1:8545`
        });
      }
    } else if (host === 'localhost' || host === '127.0.0.1') {
      diagnostics.push({
        category: 'LAN Access',
        status: 'success',
        message: '通过本地地址访问'
      });
    }
  }

  return diagnostics;
}

/**
 * 检查 CORS 和防火墙问题
 */
export function diagnoseCORSIssues(): NetworkDiagnostic[] {
  const diagnostics: NetworkDiagnostic[] = [];

  // 检查是否可能遇到 CORS 问题
  if (typeof window !== 'undefined') {
    const isHTTPS = window.location.protocol === 'https:';
    const rpcUrl = process.env.NEXT_PUBLIC_NETWORK_RPC;
    
    if (isHTTPS && rpcUrl?.startsWith('http://')) {
      diagnostics.push({
        category: 'CORS/Security',
        status: 'error',
        message: 'HTTPS 页面尝试访问 HTTP RPC',
        suggestion: '使用 HTTP 访问页面或配置 HTTPS RPC'
      });
    }

    // 检查端口配置
    if (rpcUrl?.includes(':8545')) {
      diagnostics.push({
        category: 'Firewall',
        status: 'warning',
        message: '使用默认 Hardhat 端口 (8545)',
        suggestion: '确保防火墙允许该端口访问'
      });
    }
  }

  return diagnostics;
}

/**
 * 生成修复建议
 */
export function generateFixSuggestions(diagnostics: NetworkDiagnostic[]): string[] {
  const suggestions: string[] = [];
  
  const errors = diagnostics.filter(d => d.status === 'error');
  const warnings = diagnostics.filter(d => d.status === 'warning');

  if (errors.length > 0) {
    suggestions.push('🚨 关键问题需要修复:');
    errors.forEach(error => {
      if (error.suggestion) {
        suggestions.push(`• ${error.suggestion}`);
      }
    });
  }

  if (warnings.length > 0) {
    suggestions.push('⚠️ 建议检查:');
    warnings.forEach(warning => {
      if (warning.suggestion) {
        suggestions.push(`• ${warning.suggestion}`);
      }
    });
  }

  // 通用局域网配置建议
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      suggestions.push('');
      suggestions.push('📱 局域网配置建议:');
      suggestions.push('1. 启动 Hardhat 时绑定所有接口:');
      suggestions.push('   npx hardhat node --hostname 0.0.0.0');
      suggestions.push('2. 更新 .env.local 文件:');
      suggestions.push(`   NEXT_PUBLIC_NETWORK_RPC=http://${host.split('.').slice(0, 3).join('.')}.1:8545`);
      suggestions.push('3. 重启前端应用');
    }
  }

  return suggestions;
}

/**
 * 测试 RPC 连接
 */
export async function testRPCConnection(rpcUrl: string): Promise<{
  success: boolean;
  latency?: number;
  blockNumber?: string;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        latency,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        latency,
        error: data.error.message || 'RPC Error'
      };
    }

    return {
      success: true,
      latency,
      blockNumber: data.result
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 