'use client';

import { useState } from 'react';
import { Layout, Card, Typography, Button, Input, Space, Table, Tag, Divider, Statistic, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, FireOutlined, TrophyOutlined, DollarOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import Header from '@/components/Header';

const { Title, Text } = Typography;
const { Search } = Input;
const { Content } = Layout;

export default function PoolsPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // 模拟流动性池数据 (实际项目中应该从合约读取)
  const mockPools = [
    {
      id: 1,
      tokenA: { symbol: 'CAFE', logo: '/favicon.jpg' },
      tokenB: { symbol: 'ETH', logo: '/eth.png' },
      tvl: '$1,234,567',
      apr: '24.5%',
      volume24h: '$89,234',
      fees24h: '$267',
      myLiquidity: '$0',
      myShare: '0%',
      isHot: true,
    },
    {
      id: 2,
      tokenA: { symbol: 'USDC', logo: '/usdc.png' },
      tokenB: { symbol: 'ETH', logo: '/eth.png' },
      tvl: '$2,345,678',
      apr: '18.2%',
      volume24h: '$156,789',
      fees24h: '$471',
      myLiquidity: '$1,250',
      myShare: '0.05%',
      isHot: false,
    },
    {
      id: 3,
      tokenA: { symbol: 'USDT', logo: '/usdt.png' },
      tokenB: { symbol: 'USDC', logo: '/usdc.png' },
      tvl: '$890,123',
      apr: '12.8%',
      volume24h: '$45,678',
      fees24h: '$137',
      myLiquidity: '$0',
      myShare: '0%',
      isHot: false,
    },
  ];

  // 过滤池子数据
  const filteredPools = mockPools.filter(pool => {
    const searchMatch = searchValue === '' || 
      pool.tokenA.symbol.toLowerCase().includes(searchValue.toLowerCase()) ||
      pool.tokenB.symbol.toLowerCase().includes(searchValue.toLowerCase());
    
    const tabMatch = activeTab === 'all' || 
      (activeTab === 'my' && parseFloat(pool.myLiquidity.replace('$', '').replace(',', '')) > 0);
    
    return searchMatch && tabMatch;
  });

  // 计算总统计数据
  const totalStats = {
    totalTVL: '$4,469,368',
    totalVolume24h: '$291,701',
    totalFees24h: '$875',
    myTotalLiquidity: '$1,250'
  };

  const columns = [
    {
      title: '交易对',
      key: 'pair',
      render: (record: any) => (
        <Space align="center">
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <img src={record.tokenA.logo} alt={record.tokenA.symbol} 
                 style={{ width: 32, height: 32, borderRadius: '50%', zIndex: 2 }} />
            <img src={record.tokenB.logo} alt={record.tokenB.symbol} 
                 style={{ width: 32, height: 32, borderRadius: '50%', marginLeft: -8, zIndex: 1 }} />
          </div>
          <div>
            <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '16px' }}>
              {record.tokenA.symbol}/{record.tokenB.symbol}
            </Text>
            {record.isHot && (
              <Tag icon={<FireOutlined />} color="red" style={{ marginLeft: 8 }}>
                热门
              </Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'TVL',
      dataIndex: 'tvl',
      key: 'tvl',
      render: (tvl: string) => (
        <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '16px' }}>{tvl}</Text>
      ),
    },
    {
      title: 'APR',
      dataIndex: 'apr',
      key: 'apr',
      render: (apr: string) => (
        <Text style={{ color: '#22c55e', fontWeight: 600, fontSize: '16px' }}>{apr}</Text>
      ),
    },
    {
      title: '24h交易量',
      dataIndex: 'volume24h',
      key: 'volume24h',
      render: (volume: string) => (
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>{volume}</Text>
      ),
    },
    {
      title: '24h手续费',
      dataIndex: 'fees24h',
      key: 'fees24h',
      render: (fees: string) => (
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>{fees}</Text>
      ),
    },
    {
      title: '我的流动性',
      key: 'myLiquidity',
      render: (record: any) => (
        <div>
          <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
            {record.myLiquidity}
          </Text>
          {parseFloat(record.myLiquidity.replace('$', '').replace(',', '')) > 0 && (
            <div>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                ({record.myShare})
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => router.push(`/add-liquidity?tokenA=${record.tokenA.symbol}&tokenB=${record.tokenB.symbol}`)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              height: '32px',
            }}
          >
            添加
          </Button>
          {parseFloat(record.myLiquidity.replace('$', '').replace(',', '')) > 0 && (
            <Button
              size="small"
              onClick={() => router.push(`/remove-liquidity?tokenA=${record.tokenA.symbol}&tokenB=${record.tokenB.symbol}`)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '8px',
                height: '32px',
              }}
            >
              移除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Header />
      <Content style={{ 
        padding: '0',
        backgroundColor: '#0d1117',
        background: '#0d1117',
        minHeight: 'calc(100vh - 72px)'
      }}>
        <div style={{ 
          padding: '24px',
          background: 'transparent',
          minHeight: '100vh'
        }}>
          {/* 页面标题 */}
          <div style={{ marginBottom: 32 }}>
            <Title level={2} style={{ 
              margin: 0, 
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '32px'
            }}>
              流动性池
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px', marginTop: 8 }}>
              为交易对提供流动性并赚取手续费奖励
            </Text>
          </div>

          {/* 统计概览 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
              }}>
                <Statistic
                  title={<Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>总TVL</Text>}
                  value={totalStats.totalTVL}
                  valueStyle={{ color: '#ffffff', fontWeight: 600 }}
                  prefix={<DollarOutlined style={{ color: '#667eea' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
              }}>
                <Statistic
                  title={<Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>24h交易量</Text>}
                  value={totalStats.totalVolume24h}
                  valueStyle={{ color: '#ffffff', fontWeight: 600 }}
                  prefix={<TrophyOutlined style={{ color: '#22c55e' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
              }}>
                <Statistic
                  title={<Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>24h手续费</Text>}
                  value={totalStats.totalFees24h}
                  valueStyle={{ color: '#ffffff', fontWeight: 600 }}
                  prefix={<FireOutlined style={{ color: '#f59e0b' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
              }}>
                <Statistic
                  title={<Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>我的流动性</Text>}
                  value={totalStats.myTotalLiquidity}
                  valueStyle={{ color: '#ffffff', fontWeight: 600 }}
                  prefix={<PlusOutlined style={{ color: '#ff007a' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* 工具栏 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            marginBottom: 24,
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <Space size="large">
                <Button
                  type={activeTab === 'all' ? 'primary' : 'text'}
                  onClick={() => setActiveTab('all')}
                  style={{
                    background: activeTab === 'all' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    border: activeTab === 'all' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    borderRadius: '12px',
                    height: '40px',
                    fontWeight: 600,
                  }}
                >
                  所有池子
                </Button>
                <Button
                  type={activeTab === 'my' ? 'primary' : 'text'}
                  onClick={() => setActiveTab('my')}
                  style={{
                    background: activeTab === 'my' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    border: activeTab === 'my' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    borderRadius: '12px',
                    height: '40px',
                    fontWeight: 600,
                  }}
                >
                  我的流动性
                </Button>
              </Space>

              <Space>
                <Search
                  placeholder="搜索交易对..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  style={{ width: 300 }}
                  prefix={<SearchOutlined style={{ color: 'rgba(255, 255, 255, 0.6)' }} />}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => router.push('/add-liquidity')}
                  style={{
                    background: 'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    height: '40px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(255, 0, 122, 0.3)',
                  }}
                >
                  添加流动性
                </Button>
              </Space>
            </div>
          </Card>

          {/* 流动性池列表 */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
          }}>
            <Table
              columns={columns}
              dataSource={filteredPools}
              rowKey="id"
              pagination={false}
              style={{ background: 'transparent' }}
              components={{
                body: {
                  row: (props: any) => (
                    <tr 
                      {...props} 
                      style={{
                        background: 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  ),
                },
              }}
              locale={{
                emptyText: activeTab === 'my' ? '您还没有提供流动性' : '暂无流动性池'
              }}
            />
          </Card>

          {/* 底部信息 */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
              通过提供流动性，您将获得该交易对 0.25% 的交易手续费奖励
            </Text>
          </div>
        </div>
      </Content>
    </Layout>
  );
} 