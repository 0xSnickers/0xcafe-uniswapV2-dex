'use client';
import '@ant-design/v5-patch-for-react-19';
import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { anvil } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ENV } from '@/config/env';

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined';

const { wallets } = getDefaultWallets();


const config = getDefaultConfig({
  appName: ENV.APP_NAME,
  projectId: ENV.WALLETCONNECT_PROJECT_ID,
  wallets,
  chains: [
    anvil,        // 主要使用 Anvil 本地环境
  ],
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 减少重试次数以避免Chrome扩展错误
        if (failureCount < 2 && !error?.message?.includes('chrome.runtime')) {
          return true;
        }
        return false;
      },
      staleTime: 60 * 1000, // 1分钟
    },
  },
});

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 过滤掉Chrome扩展相关的错误
    if (!error.message.includes('chrome.runtime')) {
      console.error('DEX Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          background: '#0d1117',
          color: '#ffffff',
          minHeight: '100vh'
        }}>
          <h1>出现了一些问题</h1>
          <p>请刷新页面重试</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // 添加 Chrome 扩展错误的处理
  React.useEffect(() => {
    if (isBrowser) {
      // 捕获并忽略Chrome扩展相关的错误
      const originalError = window.console.error;
      window.console.error = (...args) => {
        const message = args[0]?.toString() || '';
        if (
          !message.includes('chrome.runtime') &&
          !message.includes('Extension ID') &&
          !message.includes('sendMessage')
        ) {
          originalError.apply(console, args);
        }
      };

      // 全局错误处理
      const handleError = (event: ErrorEvent) => {
        if (
          event.error?.message?.includes('chrome.runtime') ||
          event.error?.message?.includes('Extension ID')
        ) {
          event.preventDefault();
          return false;
        }
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const message = event.reason?.message || event.reason?.toString() || '';
        if (
          message.includes('chrome.runtime') ||
          message.includes('Extension ID')
        ) {
          event.preventDefault();
          return false;
        }
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.console.error = originalError;
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <AntdRegistry>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              appInfo={{
                appName: ENV.APP_NAME,
                disclaimer: ({ Text }) => (
                  <Text>
                    欢迎使用 {ENV.APP_NAME}！{ENV.APP_DESCRIPTION}。
                    请确保已连接到正确的本地网络。
                  </Text>
                ),
              }}
              theme={darkTheme({
                accentColor: '#667eea',
                accentColorForeground: 'white',
                borderRadius: 'large',
                fontStack: 'system',
                overlayBlur: 'small',
              })}
              modalSize="compact"
              initialChain={anvil}
              coolMode={ENV.UI.ENABLE_ANIMATIONS}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </AntdRegistry>
    </ErrorBoundary>
  );
} 