'use client';

import { Layout, Menu, Typography, Space } from 'antd';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SwapOutlined, BankOutlined, BarChartOutlined } from '@ant-design/icons';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

interface HeaderProps {
  onMenuClick?: (key: string) => void;
  activeKey?: string;
}

export default function Header({ onMenuClick, activeKey }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentActiveKey, setCurrentActiveKey] = useState('swap');

  // 根据路径设置激活的菜单项
  useEffect(() => {
    if (pathname.includes('/pools') || pathname.includes('/add-liquidity') || pathname.includes('/remove-liquidity')) {
      setCurrentActiveKey('pools');
    } else if (pathname === '/' || pathname.includes('/swap')) {
      setCurrentActiveKey('swap');
    }
  }, [pathname]);

  const menuItems = [
    {
      key: 'swap',
      icon: <SwapOutlined />,
      label: 'Swap',
    },
    {
      key: 'pools',
      icon: <BankOutlined />,
      label: 'Pools',
    },
   
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    // 如果有外部的onMenuClick处理器，则使用它
    if (onMenuClick) {
      onMenuClick(key);
    } else {
      // 否则直接导航到对应页面
      switch (key) {
        case 'swap':
          router.push('/');
          break;
        case 'pools':
          router.push('/pools');
          break;
      }
    }
  };

  const handleLogoClick = () => {
    router.push('/');
  };

  return (
    <AntHeader style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '0 24px',
      backgroundColor: '#0d1117',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      height: '72px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(20px)',
      background: 'rgba(13, 17, 23, 0.8)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', marginRight: 40, cursor: 'pointer' }}
          onClick={handleLogoClick}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            overflow: 'hidden',
            marginRight: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Image
              src="/favicon.jpg"
              alt="0xcafe Logo"
              width={32}
              height={32}
              style={{ borderRadius: '6px' }}
            />
          </div>
          <Title level={4} style={{ 
            margin: 0, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '-0.02em'
          }}>
            0xcafe
          </Title>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey || currentActiveKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ 
            border: 'none', 
            minWidth: 0, 
            backgroundColor: 'transparent',
            color: '#ffffff'
          }}
          theme="dark"
        />
      </div>
      <Space align="center" size="large">
        <div style={{
          borderRadius: '16px',
          padding: '1px'
        }}>
          <ConnectButton 
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </Space>
    </AntHeader>
  );
} 