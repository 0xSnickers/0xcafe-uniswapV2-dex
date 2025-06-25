'use client';

import { useState } from 'react';
import { Layout, Card, Typography, Button, Input, Space, Table, Tag, Divider, Statistic, Row, Col, Spin, Alert, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, FireOutlined, TrophyOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import Header from '@/components/Header';
import { useAllPools, useMyPools, usePoolsStats, PoolData } from '@/hooks/useLiquidityPools';

const { Title, Text } = Typography;
const { Search } = Input;
const { Content } = Layout;

export default function PoolsPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // 使用真实合约数据
  const { pools: allPools, loading: allPoolsLoading, totalPools } = useAllPools(20);
  const { pools: myPools, loading: myPoolsLoading } = useMyPools();
  const poolsStats = usePoolsStats();

  // 当前显示的池子数据
  const currentPools = activeTab === 'all' ? allPools : myPools;
  const currentLoading = activeTab === 'all' ? allPoolsLoading : myPoolsLoading;

  // 过滤池子数据
  const filteredPools = currentPools.filter(pool => {
    if (searchValue === '') return true;
    
    const searchLower = searchValue.toLowerCase();
    return pool.tokenA.symbol.toLowerCase().includes(searchLower) ||
           pool.tokenB.symbol.toLowerCase().includes(searchLower) ||
           pool.tokenA.name.toLowerCase().includes(searchLower) ||
           pool.tokenB.name.toLowerCase().includes(searchLower);
  });

  // 刷新数据
  const handleRefresh = () => {
    window.location.reload(); // 简单的刷新方式，可以优化为更精细的数据刷新
  };

  const columns = [
    {
      title: '交易对',
      key: 'pair',
      render: (record: PoolData) => (
        <Space align="center">
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <img src={record.tokenA.logo || '/favicon.jpg'} alt={record.tokenA.symbol} 
                 style={{ width: 32, height: 32, borderRadius: '50%', zIndex: 2 }} />
            <img src={record.tokenB.logo || '/favicon.jpg'} alt={record.tokenB.symbol} 
                 style={{ width: 32, height: 32, borderRadius: '50%', marginLeft: -8, zIndex: 1 }} />
          </div>
          <div>
            <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '16px' }}>
              {record.tokenA.symbol}/{record.tokenB.symbol}
            </Text>
            {record.tvlUSD > 100000 && (
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
      title: 'Reserve A',
      key: 'reserveA',
      render: (record: PoolData) => (
        <div>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
            {parseFloat(record.reserveA).toLocaleString('en-US', { maximumFractionDigits: 2 })} {record.tokenA.symbol}
          </Text>
        </div>
      ),
    },
    {
      title: 'Reserve B',
      key: 'reserveB',
      render: (record: PoolData) => (
        <div>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
            {parseFloat(record.reserveB).toLocaleString('en-US', { maximumFractionDigits: 2 })} {record.tokenB.symbol}
          </Text>
        </div>
      ),
    },
    {
      title: '我的流动性',
      key: 'myLiquidity',
      render: (record: PoolData) => (
        <div>
          {record.myLiquidityUSD > 0 ? (
            <Tooltip title={record.myLiquidity} placement="top">
              <div style={{ cursor: 'pointer' }}>
          <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
                  ${record.myLiquidityUSD.toFixed(2)}
          </Text>
            <div>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                    {record.myShare}
              </Text>
            </div>
              </div>
            </Tooltip>
          ) : (
            <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
              $0
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: PoolData) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => router.push(`/add-liquidity?tokenA=${record.tokenA.address}&tokenB=${record.tokenB.address}`)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              height: '32px',
            }}
          >
            添加
          </Button>
          {record.myLiquidityUSD > 0 && (
            <Button
              size="small"
              onClick={() => router.push(`/remove-liquidity?pair=${record.pairAddress}`)}
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

  if (!isConnected) {
    return (
      <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <Header />
        <Content style={{ 
          padding: '24px',
          backgroundColor: '#0d1117',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 72px)'
        }}>
          <Card style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '400px',
          }}>
            <Title level={3} style={{ color: '#ffffff', marginBottom: 16 }}>
              连接钱包查看流动性池
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              请连接您的钱包以查看和管理流动性池
            </Text>
          </Card>
        </Content>
      </Layout>
    );
  }

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
            <Title level={2} style={{ 
              margin: 0, 
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '32px'
            }}>
              流动性池
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px', marginTop: 8 }}>
                  为交易对提供流动性并赚取手续费奖励 ({totalPools} 个池子)
            </Text>
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  borderRadius: '8px',
                }}
              >
                刷新
              </Button>
            </div>
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
                  value={poolsStats.totalTVL}
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
                  title={<Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>活跃池子</Text>}
                  value={poolsStats.totalPools}
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
                  title={<Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>我的池子</Text>}
                  value={poolsStats.myActivePools}
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
                  value={poolsStats.myTotalLiquidity}
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
                  所有池子 ({allPools.length})
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
                  我的流动性 ({myPools.length})
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
            {currentLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    正在加载流动性池数据...
                  </Text>
                </div>
              </div>
            ) : filteredPools.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                {searchValue ? (
                  <Alert
                    message="未找到匹配的流动性池"
                    description={`没有找到包含 "${searchValue}" 的交易对`}
                    type="info"
                    showIcon
                    style={{
                      background: 'rgba(24, 144, 255, 0.1)',
                      border: '1px solid rgba(24, 144, 255, 0.3)',
                      color: '#ffffff',
                    }}
                  />
                ) : activeTab === 'my' ? (
                  <Alert
                    message="您还没有提供流动性"
                    description="添加流动性以赚取交易手续费"
                    type="warning"
                    showIcon
                    style={{
                      background: 'rgba(250, 173, 20, 0.1)',
                      border: '1px solid rgba(250, 173, 20, 0.3)',
                      color: '#ffffff',
                    }}
                    action={
                      <Button
                        type="primary"
                        onClick={() => router.push('/add-liquidity')}
                        style={{
                          background: 'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)',
                          border: 'none',
                        }}
                      >
                        添加流动性
                      </Button>
                    }
                  />
                ) : (
                  <Alert
                    message="暂无流动性池"
                    description="还没有创建任何流动性池"
                    type="info"
                    showIcon
                    style={{
                      background: 'rgba(24, 144, 255, 0.1)',
                      border: '1px solid rgba(24, 144, 255, 0.3)',
                      color: '#ffffff',
                    }}
                  />
                )}
              </div>
            ) : (
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
            />
            )}
          </Card>

          {/* 底部信息 */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
              通过提供流动性，您将获得该交易对 0.25% 的交易手续费奖励
            </Text>
            {chainId && (
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>
                  网络: Chain ID {chainId}
                </Text>
              </div>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
} 