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
        minHeight: 'calc(100vh - 72px)',
          display: 'flex',
          justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '60px'
          }}>
            <SwapCard />
      </Content>
    </Layout>
  );
}
