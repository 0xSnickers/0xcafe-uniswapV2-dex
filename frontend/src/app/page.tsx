'use client';

import { Layout } from 'antd';
import Header from '@/components/Header';
import SwapCard from '@/components/SwapCard';

const { Content } = Layout;

export default function Home() {
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Header />
      <Content style={{ 
        padding: '24px 16px',
        backgroundColor: '#0d1117',
        background: `
          #0d1117
        `,
        minHeight: 'calc(100vh - 72px)'
      }}>
        <div style={{ 
          maxWidth: 480, 
          margin: '40px auto 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: `
              0 8px 32px 0 rgba(0, 0, 0, 0.4),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
            `,
            overflow: 'hidden'
          }}>
            <SwapCard />
          </div>
        </div>
      </Content>
    </Layout>
  );
}
