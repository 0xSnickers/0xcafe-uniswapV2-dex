'use client';

import { useState, useEffect, Suspense } from 'react';
import { Layout, Card, Typography, Button, Input, Select, Space, message, Alert, Progress, Steps } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined, SettingOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useBalance, useWriteContract, useChainId, useReadContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { UNISWAP_V2_ROUTER_ABI, UNISWAP_V2_FACTORY_ABI } from '@/config/contracts';
import { Token, getTokensForChain, isNativeToken, formatTokenAmount } from '@/utils/tokens';
import { getContractAddresses } from '@/config/env';
import Header from '@/components/Header';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { Content } = Layout;

// 内部组件，处理搜索参数
function AddLiquidityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chainId = useChainId();
  const tokens = getTokensForChain(chainId);
  
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNewPool, setIsNewPool] = useState(false);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const contractAddresses = getContractAddresses(chainId);

  // 从URL参数初始化代币
  useEffect(() => {
    const tokenASymbol = searchParams.get('tokenA');
    const tokenBSymbol = searchParams.get('tokenB');
    
    if (tokenASymbol) {
      const token = tokens.find(t => t.symbol === tokenASymbol);
      if (token) setTokenA(token);
    }
    
    if (tokenBSymbol) {
      const token = tokens.find(t => t.symbol === tokenBSymbol);
      if (token) setTokenB(token);
    }
  }, [searchParams, tokens]);

  // 获取代币余额
  const { data: balanceA } = useBalance({
    address: address,
    token: tokenA && !isNativeToken(tokenA) 
      ? tokenA.address as `0x${string}`
      : undefined,
  });

  const { data: balanceB } = useBalance({
    address: address,
    token: tokenB && !isNativeToken(tokenB) 
      ? tokenB.address as `0x${string}`
      : undefined,
  });

  // 检查流动性池是否存在
  const { data: pairAddress } = useReadContract({
    address: contractAddresses?.FACTORY as `0x${string}`,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'getPair',
    args: tokenA && tokenB ? [
      tokenA.address as `0x${string}`,
      tokenB.address as `0x${string}`
    ] : undefined,
    query: {
      enabled: !!(tokenA && tokenB && contractAddresses),
    }
  });

  useEffect(() => {
    if (pairAddress) {
      setIsNewPool(pairAddress === '0x0000000000000000000000000000000000000000');
    }
  }, [pairAddress]);

  const handleMaxBalance = (isTokenA: boolean) => {
    const balance = isTokenA ? balanceA : balanceB;
    if (balance) {
      const maxAmount = formatEther(balance.value);
      const reservedAmount = isNativeToken(isTokenA ? tokenA! : tokenB!) ? '0.01' : '0';
      const availableAmount = Math.max(parseFloat(maxAmount) - parseFloat(reservedAmount), 0);
      
      if (isTokenA) {
        setAmountA(availableAmount.toString());
      } else {
        setAmountB(availableAmount.toString());
      }
    }
  };

  const handleAddLiquidity = async () => {
    if (!isConnected || !address || !tokenA || !tokenB || !amountA || !amountB) {
      message.error('请连接钱包并输入完整信息');
      return;
    }

    if (!contractAddresses) {
      message.error('当前网络不支持，请切换到 Anvil 本地网络');
      return;
    }

    setLoading(true);
    setCurrentStep(1);

    try {
      const deadlineTime = BigInt(Math.floor(Date.now() / 1000) + 20 * 60); // 20分钟期限
      const amountADesired = parseEther(amountA);
      const amountBDesired = parseEther(amountB);
      const amountAMin = amountADesired * BigInt(95) / BigInt(100); // 5%滑点
      const amountBMin = amountBDesired * BigInt(95) / BigInt(100);

      setCurrentStep(2);

      const txHash = await writeContractAsync({
        address: contractAddresses.ROUTER as `0x${string}`,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA.address as `0x${string}`,
          tokenB.address as `0x${string}`,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          address,
          deadlineTime,
        ],
      });

      setCurrentStep(3);
      message.success('添加流动性成功！');
      
      // 2秒后跳转到池子页面
      setTimeout(() => {
        router.push('/pools');
      }, 2000);

    } catch (error: unknown) {
      console.error('添加流动性失败:', error);
      const errorMessage = error instanceof Error ? error.message : '请重试';
      message.error(`添加流动性失败: ${errorMessage}`);
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = tokenA && tokenB && amountA && amountB && 
    parseFloat(amountA) > 0 && parseFloat(amountB) > 0;

  return (
    <div style={{ 
      padding: '24px',
      background: 'transparent',
      minHeight: 'calc(100vh - 72px)',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* 顶部导航 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            marginRight: 16,
          }}
        />
        <div>
          <Title level={3} style={{ 
            margin: 0, 
            color: '#ffffff',
            fontWeight: 600 
          }}>
            添加流动性
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            向流动性池添加代币以获得LP代币和交易手续费
          </Text>
        </div>
      </div>

      {/* 进度步骤 */}
      {loading && (
        <Card style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          marginBottom: 24,
        }}>
          <Steps
            current={currentStep}
            size="small"
            items={[
              { title: '确认信息', icon: <InfoCircleOutlined /> },
              { title: '等待确认', icon: <SettingOutlined /> },
              { title: '交易处理中' },
              { title: '完成' },
            ]}
          />
        </Card>
      )}

      {/* 流动性池状态提醒 */}
      {tokenA && tokenB && (
        <Alert
          message={isNewPool ? '创建新的流动性池' : '添加到现有流动性池'}
          description={
            isNewPool 
              ? '您将创建这个交易对的第一个流动性池。请确保代币比例正确，因为您设置的比例将决定初始价格。'
              : '您将向现有的流动性池添加流动性。添加的代币比例应该匹配当前的池子比例。'
          }
          type={isNewPool ? 'warning' : 'info'}
          showIcon
          style={{
            marginBottom: 24,
            background: isNewPool ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${isNewPool ? 'rgba(251, 191, 36, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
            borderRadius: '12px',
          }}
        />
      )}

      {/* 代币选择和输入 */}
      <Card style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        marginBottom: 24,
      }}>
        {/* Token A */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>第一个代币</Text>
            {balanceA && (
              <Space>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  余额: {formatTokenAmount(formatEther(balanceA.value))} {balanceA.symbol}
                </Text>
                <Button 
                  size="small" 
                  type="text"
                  onClick={() => handleMaxBalance(true)}
                  style={{ 
                    color: '#667eea', 
                    fontSize: '12px',
                    padding: '0 8px',
                    height: '20px'
                  }}
                >
                  MAX
                </Button>
              </Space>
            )}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <Input
              placeholder="0.0"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              style={{ 
                border: 'none', 
                background: 'transparent',
                fontSize: '28px',
                fontWeight: 600,
                color: '#ffffff',
                padding: 0,
                flex: 1
              }}
            />
            <Select
              placeholder="选择代币"
              value={tokenA?.symbol}
              onChange={(value) => {
                const token = tokens.find(t => t.symbol === value);
                if (token) setTokenA(token);
              }}
              style={{ 
                minWidth: 160,
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '12px'
              }}
              size="large"
            >
              {tokens.map(token => (
                <Option key={token.symbol} value={token.symbol}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {token.logoURI ? (
                      <img 
                        src={token.logoURI} 
                        alt={token.symbol}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      />
                    ) : (
                      <img 
                        src={
                          token.symbol === 'CAFE' ? '/favicon.jpg' :
                          token.symbol === 'ETH' || token.symbol === 'WETH' ? '/eth.png' :
                          token.symbol === 'USDC' ? '/usdc.png' :
                          token.symbol === 'USDT' ? '/usdt.png' :
                          '/favicon.jpg' // 默认图标
                        }
                        alt={token.symbol}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                        onError={(e) => {
                          // 如果图片加载失败，显示默认图标
                          (e.target as HTMLImageElement).src = '/favicon.jpg';
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 600 }}>{token.symbol}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        </div>

        {/* Plus Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          <div style={{ 
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
          }}>
            <PlusOutlined style={{ color: '#ffffff', fontSize: '16px' }} />
          </div>
        </div>

        {/* Token B */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>第二个代币</Text>
            {balanceB && tokenB && (
              <Space>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  余额: {formatTokenAmount(formatEther(balanceB.value))} {balanceB.symbol}
                </Text>
                <Button 
                  size="small" 
                  type="text"
                  onClick={() => handleMaxBalance(false)}
                  style={{ 
                    color: '#667eea', 
                    fontSize: '12px',
                    padding: '0 8px',
                    height: '20px'
                  }}
                >
                  MAX
                </Button>
              </Space>
            )}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <Input
              placeholder="0.0"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              style={{ 
                border: 'none', 
                background: 'transparent',
                fontSize: '28px',
                fontWeight: 600,
                color: '#ffffff',
                padding: 0,
                flex: 1
              }}
            />
            <Select
              placeholder="选择代币"
              value={tokenB?.symbol}
              onChange={(value) => {
                const token = tokens.find(t => t.symbol === value);
                setTokenB(token || null);
              }}
              style={{ 
                minWidth: 160,
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '12px'
              }}
              size="large"
            >
              {tokens.filter(t => t.symbol !== tokenA?.symbol).map(token => (
                <Option key={token.symbol} value={token.symbol}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {token.logoURI ? (
                      <img 
                        src={token.logoURI} 
                        alt={token.symbol}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      />
                    ) : (
                      <img 
                        src={
                          token.symbol === 'CAFE' ? '/favicon.jpg' :
                          token.symbol === 'ETH' || token.symbol === 'WETH' ? '/eth.png' :
                          token.symbol === 'USDC' ? '/usdc.png' :
                          token.symbol === 'USDT' ? '/usdt.png' :
                          '/favicon.jpg' // 默认图标
                        }
                        alt={token.symbol}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                        onError={(e) => {
                          // 如果图片加载失败，显示默认图标
                          (e.target as HTMLImageElement).src = '/favicon.jpg';
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 600 }}>{token.symbol}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* 价格和池子信息 */}
      {amountA && amountB && tokenA && tokenB && (
        <Card style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          marginBottom: 24,
        }}>
          <Title level={5} style={{ color: '#ffffff', marginBottom: 16 }}>
            价格和池子份额
          </Title>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {formatTokenAmount(parseFloat(amountB) / parseFloat(amountA))} {tokenB.symbol} 每 {tokenA.symbol}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {formatTokenAmount(parseFloat(amountA) / parseFloat(amountB))} {tokenA.symbol} 每 {tokenB.symbol}
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>池子类型</Text>
              <Text style={{ color: '#ffffff', fontWeight: 500 }}>
                {isNewPool ? '新池子' : '现有池子'}
              </Text>
            </div>
          </Space>
        </Card>
      )}

      {/* 添加流动性按钮 */}
      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        disabled={!isConnected || !canProceed}
        onClick={handleAddLiquidity}
        style={{ 
          height: 56,
          borderRadius: 16,
          fontSize: '18px',
          fontWeight: 600,
          background: (!isConnected || !canProceed)
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: '#ffffff',
          boxShadow: (!isConnected || !canProceed)
            ? 'none'
            : '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}
      >
        {!isConnected ? '连接钱包' : 
         !tokenA || !tokenB ? '选择代币对' :
         !canProceed ? '输入数量' :
         isNewPool ? '创建池子并添加流动性' : '添加流动性'}
      </Button>

      {/* 底部提示信息 */}
      <div style={{ 
        marginTop: 24, 
        padding: '16px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px'
      }}>
        <Space direction="vertical" size={8}>
          <Text style={{ color: '#ffffff', fontWeight: 500 }}>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
            添加流动性提示
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
            • 您将获得LP代币，代表您在池子中的份额
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
            • 交易者使用您的流动性时，您将获得 0.25% 的手续费奖励
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
            • 您可以随时移除流动性，赎回您的代币和累积的手续费
          </Text>
        </Space>
      </div>
    </div>
  );
}

// 主组件，使用Suspense包装
export default function AddLiquidityPage() {
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Header />
      <Content style={{ 
        padding: '0',
        backgroundColor: '#0d1117',
        background: '#0d1117',
        minHeight: 'calc(100vh - 72px)'
      }}>
        <Suspense fallback={
          <div style={{ 
            padding: '24px',
            textAlign: 'center',
            color: '#ffffff',
            minHeight: 'calc(100vh - 72px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            加载中...
          </div>
        }>
          <AddLiquidityContent />
        </Suspense>
      </Content>
    </Layout>
  );
} 