'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { getContractAddresses } from '../config/addresses';
import { formatEther } from 'viem';
import { 
  diagnoseNetworkIssues, 
  diagnoseLANIssues, 
  diagnoseCORSIssues, 
  generateFixSuggestions,
  testRPCConnection,
  type NetworkDiagnostic 
} from '../utils/networkDiagnostics';

interface NetworkInfo {
  rpcUrl: string;
  isConnected: boolean;
  blockNumber?: bigint;
  gasPrice?: bigint;
  error?: string;
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'diagnostics' | 'fixes'>('status');
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [contractStatus, setContractStatus] = useState<Record<string, boolean>>({});
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostic[]>([]);
  const [rpcTest, setRpcTest] = useState<any>(null);
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  
  const contractAddresses = getContractAddresses(chainId);

  // 检测网络连接状态
  useEffect(() => {
    const checkNetworkInfo = async () => {
      if (!publicClient) return;

      try {
        const [blockNumber, gasPrice] = await Promise.all([
          publicClient.getBlockNumber(),
          publicClient.getGasPrice()
        ]);

        setNetworkInfo({
          rpcUrl: publicClient.transport.url || 'Unknown',
          isConnected: true,
          blockNumber,
          gasPrice,
        });
      } catch (error) {
        setNetworkInfo({
          rpcUrl: publicClient.transport.url || 'Unknown',
          isConnected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    checkNetworkInfo();
    const interval = setInterval(checkNetworkInfo, 5000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // 检测合约状态
  useEffect(() => {
    const checkContractStatus = async () => {
      if (!publicClient || !contractAddresses) return;

      const contracts = {
        factory: contractAddresses.factory,
        router: contractAddresses.router,
        weth: contractAddresses.weth,
      };

      const status: Record<string, boolean> = {};

      for (const [name, address] of Object.entries(contracts)) {
        try {
          const bytecode = await publicClient.getBytecode({ address });
          status[name] = !!bytecode && bytecode !== '0x';
        } catch (error) {
          status[name] = false;
        }
      }

      setContractStatus(status);
    };

    checkContractStatus();
  }, [publicClient, contractAddresses]);

  // 运行网络诊断
  useEffect(() => {
    const runDiagnostics = async () => {
      const allDiagnostics = [
        ...diagnoseNetworkIssues(),
        ...diagnoseLANIssues(),
        ...diagnoseCORSIssues(),
      ];
      setDiagnostics(allDiagnostics);

      // 测试 RPC 连接
      const rpcUrl = process.env.NEXT_PUBLIC_NETWORK_RPC;
      if (rpcUrl) {
        const result = await testRPCConnection(rpcUrl);
        setRpcTest(result);
      }
    };

    runDiagnostics();
  }, []);

  const envVars = {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_NETWORK_RPC: process.env.NEXT_PUBLIC_NETWORK_RPC,
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  };

  // 状态标签页内容
  const renderStatusTab = () => (
    <div className="space-y-3">
      {/* 钱包连接状态 */}
      <div className="p-2 bg-gray-800/50 rounded">
        <strong className="text-yellow-400">💼 Wallet Connection:</strong>
        <div className="mt-1 space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Address:</span>
            <span className="text-gray-300">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Chain ID:</span>
            <span className={chainId === 31337 ? 'text-green-400' : 'text-yellow-400'}>
              {chainId || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* 网络信息 */}
      <div className="p-2 bg-gray-800/50 rounded">
        <strong className="text-blue-400">🌐 Network Info:</strong>
        {networkInfo ? (
          <div className="mt-1 space-y-1">
            <div className="flex justify-between">
              <span>RPC Status:</span>
              <span className={networkInfo.isConnected ? 'text-green-400' : 'text-red-400'}>
                {networkInfo.isConnected ? '✅ Active' : '❌ Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>RPC URL:</span>
              <span className="text-gray-300 truncate max-w-[150px]">
                {networkInfo.rpcUrl}
              </span>
            </div>
            {networkInfo.blockNumber && (
              <div className="flex justify-between">
                <span>Block:</span>
                <span className="text-green-400">#{networkInfo.blockNumber.toString()}</span>
              </div>
            )}
            {networkInfo.gasPrice && (
              <div className="flex justify-between">
                <span>Gas Price:</span>
                <span className="text-yellow-400">
                  {formatEther(networkInfo.gasPrice)} ETH
                </span>
              </div>
            )}
            {networkInfo.error && (
              <div className="text-red-400 text-xs break-words">
                Error: {networkInfo.error}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 mt-1">Loading...</div>
        )}

        {/* RPC 测试结果 */}
        {rpcTest && (
          <div className="mt-2 p-2 bg-gray-700/50 rounded">
            <div className="flex justify-between">
              <span>RPC Test:</span>
              <span className={rpcTest.success ? 'text-green-400' : 'text-red-400'}>
                {rpcTest.success ? '✅ OK' : '❌ Failed'}
              </span>
            </div>
            {rpcTest.latency && (
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="text-yellow-400">{rpcTest.latency}ms</span>
              </div>
            )}
            {rpcTest.error && (
              <div className="text-red-400 text-xs mt-1">{rpcTest.error}</div>
            )}
          </div>
        )}
      </div>

      {/* 合约状态 */}
      <div className="p-2 bg-gray-800/50 rounded">
        <strong className="text-purple-400">📋 Contract Status:</strong>
        {contractAddresses ? (
          <div className="mt-1 space-y-1">
            <div className="flex justify-between items-center">
              <span>Factory:</span>
              <div className="flex items-center space-x-2">
                <span className={contractStatus.factory ? 'text-green-400' : 'text-red-400'}>
                  {contractStatus.factory ? '✅' : '❌'}
                </span>
                <span className="text-gray-300 text-xs">
                  {contractAddresses.factory.slice(0, 6)}...{contractAddresses.factory.slice(-4)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Router:</span>
              <div className="flex items-center space-x-2">
                <span className={contractStatus.router ? 'text-green-400' : 'text-red-400'}>
                  {contractStatus.router ? '✅' : '❌'}
                </span>
                <span className="text-gray-300 text-xs">
                  {contractAddresses.router.slice(0, 6)}...{contractAddresses.router.slice(-4)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>WETH:</span>
              <div className="flex items-center space-x-2">
                <span className={contractStatus.weth ? 'text-green-400' : 'text-red-400'}>
                  {contractStatus.weth ? '✅' : '❌'}
                </span>
                <span className="text-gray-300 text-xs">
                  {contractAddresses.weth.slice(0, 6)}...{contractAddresses.weth.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-400 mt-1">❌ No contract addresses found for chain {chainId}</div>
        )}
      </div>

      {/* 环境变量 */}
      <div className="p-2 bg-gray-800/50 rounded">
        <strong className="text-green-400">⚙️ Environment:</strong>
        <div className="mt-1 space-y-1">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-300">{key.replace('NEXT_PUBLIC_', '')}:</span>
              <span className={value ? 'text-green-400' : 'text-red-400'}>
                {value ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 诊断标签页内容
  const renderDiagnosticsTab = () => (
    <div className="space-y-3">
      <div className="text-yellow-400 font-semibold mb-2">🔍 网络诊断报告</div>
      {diagnostics.length > 0 ? (
        diagnostics.map((diagnostic, index) => (
          <div key={index} className="p-2 bg-gray-800/50 rounded">
            <div className="flex justify-between items-center">
              <strong className="text-sm">{diagnostic.category}</strong>
              <span className={
                diagnostic.status === 'success' ? 'text-green-400' :
                diagnostic.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
              }>
                {diagnostic.status === 'success' ? '✅' :
                 diagnostic.status === 'warning' ? '⚠️' : '❌'}
              </span>
            </div>
            <div className="text-gray-300 mt-1">{diagnostic.message}</div>
            {diagnostic.suggestion && (
              <div className="text-blue-300 text-xs mt-1 italic">
                💡 {diagnostic.suggestion}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-gray-400">正在运行诊断...</div>
      )}
    </div>
  );

  // 修复建议标签页内容
  const renderFixesTab = () => {
    const suggestions = generateFixSuggestions(diagnostics);
    
    return (
      <div className="space-y-3">
        <div className="text-green-400 font-semibold mb-2">🛠️ 修复建议</div>
        {suggestions.length > 0 ? (
          <div className="p-2 bg-gray-800/50 rounded">
            {suggestions.map((suggestion, index) => (
              <div key={index} className={`text-xs ${
                suggestion.startsWith('🚨') || suggestion.startsWith('⚠️') || suggestion.startsWith('📱')
                  ? 'text-yellow-400 font-semibold mt-2'
                  : 'text-gray-300 ml-2'
              }`}>
                {suggestion}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">暂无修复建议</div>
        )}

        {/* 快速复制命令 */}
        <div className="p-2 bg-blue-900/30 rounded border border-blue-600">
          <div className="text-blue-400 font-semibold mb-2">📋 快速命令</div>
          <div className="space-y-1 text-xs">
            <div 
              className="p-1 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
              onClick={() => navigator.clipboard?.writeText('npx hardhat node --hostname 0.0.0.0')}
              title="点击复制"
            >
              npx hardhat node --hostname 0.0.0.0
            </div>
            <div 
              className="p-1 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
              onClick={() => navigator.clipboard?.writeText('npx hardhat run scripts/deploy.ts')}
              title="点击复制"
            >
              npx hardhat run scripts/deploy.ts
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'status':
        return renderStatusTab();
      case 'diagnostics':
        return renderDiagnosticsTab();
      case 'fixes':
        return renderFixesTab();
      default:
        return renderStatusTab();
    }
  };

  if (!isOpen) {
    const hasErrors = diagnostics.some(d => d.status === 'error');
    const hasWarnings = diagnostics.some(d => d.status === 'warning');
    
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 text-white px-3 py-2 rounded-lg text-xs z-50 transition-colors shadow-lg ${
          hasErrors ? 'bg-red-600 hover:bg-red-700 animate-pulse' :
          hasWarnings ? 'bg-yellow-600 hover:bg-yellow-700' :
          'bg-blue-600 hover:bg-blue-700'
        }`}
        title="打开调试面板"
      >
        🐛 Debug {hasErrors ? '❌' : hasWarnings ? '⚠️' : '✅'}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/95 text-white rounded-lg text-xs max-w-md z-50 border border-gray-600 shadow-xl max-h-[80vh] flex flex-col">
      {/* 头部 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-600">
        <h3 className="font-bold text-sm">🔍 UniswapV2 Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors ml-2 text-lg"
          title="关闭调试面板"
        >
          ✕
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b border-gray-600">
        {[
          { key: 'status', label: 'Status', icon: '📊' },
          { key: 'diagnostics', label: 'Diagnostics', icon: '🔍' },
          { key: 'fixes', label: 'Fixes', icon: '🛠️' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 p-2 text-xs transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-4 overflow-y-auto flex-1">
        {renderTabContent()}
      </div>

      {/* 当前URL */}
      <div className="p-2 bg-gray-800/50 border-t border-gray-600">
        <strong className="text-gray-400">🔗 URL:</strong>
        <div className="text-gray-300 break-all text-xs mt-1">
          {typeof window !== 'undefined' ? window.location.href : 'SSR'}
        </div>
      </div>
    </div>
  );
} 