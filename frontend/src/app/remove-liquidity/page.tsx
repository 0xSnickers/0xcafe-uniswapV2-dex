'use client';

import { useState, useEffect, Suspense } from 'react';
import { Layout, Card, Typography, Button, Input, Space, message, Alert, Steps, Slider } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined, SettingOutlined, MinusOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useBalance, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, isAddress, parseUnits, formatUnits } from 'viem';
import { UNISWAP_V2_ROUTER_ABI, UNISWAP_V2_PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { useContractAddresses } from '@/hooks/useUniswapV2';
import { usePairDetails } from '@/hooks/useLiquidityPools';
import Header from '@/components/Header';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Content } = Layout;

// 内部组件，处理搜索参数
function RemoveLiquidityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addresses = useContractAddresses();
  
  const [pairAddress, setPairAddress] = useState<string>('');
  const [removePercentage, setRemovePercentage] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [slippageTolerance, setSlippageTolerance] = useState('5');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pendingTxType, setPendingTxType] = useState<'approve' | 'removeLiquidity' | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash,
    }
  });

  // 从URL参数初始化pair地址
  useEffect(() => {
    const pairParam = searchParams.get('pair');
    if (pairParam && isAddress(pairParam)) {
      setPairAddress(pairParam);
    }
  }, [searchParams]);

  // 获取池子详细信息
  const poolData = usePairDetails(pairAddress as `0x${string}` || undefined);

  // 获取用户的LP代币余额
  const { data: lpBalance, refetch: refetchLPBalance } = useBalance({
    address: address,
    token: pairAddress as `0x${string}`,
    query: {
      enabled: !!(address && pairAddress && isAddress(pairAddress)),
    },
  });

  // 检查LP代币授权
  const { data: lpAllowance, refetch: refetchLPAllowance } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && addresses?.router ? [address, addresses.router] : undefined,
    query: {
      enabled: !!(pairAddress && address && addresses?.router && isAddress(pairAddress)),
    }
  });

  // 处理交易确认
  useEffect(() => {
    if (isConfirmed && txHash) {
      if (pendingTxType === 'approve') {
        message.success('授权成功！');
        refetchLPAllowance();
        setPendingTxType(null);
        setTxHash(undefined);
      } else if (pendingTxType === 'removeLiquidity') {
        message.success('流动性移除成功！');
        setCurrentStep(2);
        setPendingTxType(null);
        setTxHash(undefined);
        refetchLPBalance();
      }
    }
  }, [isConfirmed, txHash, pendingTxType, refetchLPAllowance, refetchLPBalance]);

  // 处理交易错误
  useEffect(() => {
    if (txError) {
      console.error('Transaction error:', txError);
      message.error(`交易失败: ${txError.message}`);
      setLoading(false);
      setPendingTxType(null);
      setTxHash(undefined);
    }
  }, [txError]);

  // 计算移除数量
  const removeAmount = lpBalance ? (lpBalance.value * BigInt(removePercentage)) / BigInt(100) : BigInt(0);
  
  // 计算将获得的代币数量
  const getTokenAmounts = () => {
    if (!poolData || !lpBalance || !poolData.totalSupply) {
      return { tokenA: '0', tokenB: '0' };
    }

    const totalSupply = parseUnits(poolData.totalSupply, 18);
    const reserveA = parseUnits(poolData.reserveA, poolData.tokenA.decimals);
    const reserveB = parseUnits(poolData.reserveB, poolData.tokenB.decimals);
    
    if (totalSupply === BigInt(0)) {
      return { tokenA: '0', tokenB: '0' };
    }

    const tokenAAmount = (reserveA * removeAmount) / totalSupply;
    const tokenBAmount = (reserveB * removeAmount) / totalSupply;

    return {
      tokenA: formatUnits(tokenAAmount, poolData.tokenA.decimals),
      tokenB: formatUnits(tokenBAmount, poolData.tokenB.decimals),
    };
  };

  const { tokenA: tokenAAmount, tokenB: tokenBAmount } = getTokenAmounts();

  // 处理授权
  const handleApprove = async () => {
    if (!addresses?.router || !address || !pairAddress) {
      message.error('合约地址或用户地址未找到');
      return;
    }

    try {
      setLoading(true);
      setPendingTxType('approve');

      const hash = await writeContractAsync({
        address: pairAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.router, parseUnits('1000000000', 18)], // 授权大额度
      });

      setTxHash(hash);
      message.info('授权交易已提交，请等待确认...');
    } catch (error: any) {
      console.error('Approve error:', error);
      message.error(`授权失败: ${error.message || '未知错误'}`);
      setLoading(false);
      setPendingTxType(null);
    }
  };

  // 处理移除流动性
  const handleRemoveLiquidity = async () => {
    if (!poolData || !addresses?.router || !address || !lpBalance) {
      message.error('请填写完整信息');
      return;
    }

    try {
      setLoading(true);
      setPendingTxType('removeLiquidity');

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20分钟
      const tokenAAmountMin = (parseUnits(tokenAAmount, poolData.tokenA.decimals) * BigInt(100 - parseInt(slippageTolerance))) / BigInt(100);
      const tokenBAmountMin = (parseUnits(tokenBAmount, poolData.tokenB.decimals) * BigInt(100 - parseInt(slippageTolerance))) / BigInt(100);

      let hash: `0x${string}`;

      if (poolData.tokenA.symbol === 'ETH' || poolData.tokenB.symbol === 'ETH') {
        // 移除 ETH 流动性
        const ethToken = poolData.tokenA.symbol === 'ETH' ? poolData.tokenA : poolData.tokenB;
        const otherToken = poolData.tokenA.symbol === 'ETH' ? poolData.tokenB : poolData.tokenA;
        const ethAmountMin = poolData.tokenA.symbol === 'ETH' ? tokenAAmountMin : tokenBAmountMin;
        const tokenAmountMin = poolData.tokenA.symbol === 'ETH' ? tokenBAmountMin : tokenAAmountMin;

        hash = await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'removeLiquidityETH',
          args: [
            otherToken.address,
            removeAmount,
            tokenAmountMin,
            ethAmountMin,
            address,
            deadline
          ],
        });
      } else {
        // 移除 ERC20 流动性
        hash = await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'removeLiquidity',
          args: [
            poolData.tokenA.address,
            poolData.tokenB.address,
            removeAmount,
            tokenAAmountMin,
            tokenBAmountMin,
            address,
            deadline
          ],
        });
      }

      setTxHash(hash);
      message.info('移除流动性交易已提交，请等待确认...');
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      message.error(`移除流动性失败: ${error.message || '未知错误'}`);
      setLoading(false);
      setPendingTxType(null);
    }
  };

  // 检查是否需要授权
  const needsApproval = lpAllowance !== undefined && removeAmount > (lpAllowance as bigint);
  const canRemoveLiquidity = poolData && lpBalance && removeAmount > 0 && !needsApproval && !loading;

  if (!isConnected) {
    return (
      <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
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
              连接钱包移除流动性
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              请连接您的钱包以移除流动性
            </Text>
          </Card>
        </Content>
      </Layout>
    );
  }

  if (!poolData) {
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
              流动性池未找到
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              请检查流动性池地址是否正确
            </Text>
            <Button 
              type="primary"
              onClick={() => router.push('/pools')}
              style={{ marginTop: 16 }}
            >
              返回池子列表
            </Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <div style={{ 
      padding: '24px',
      background: 'transparent',
      minHeight: 'calc(100vh - 72px)',
      maxWidth: '480px',
      margin: '0 auto'
    }}>
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
        >
          返回
        </Button>
        <Title level={2} style={{ margin: 0, color: '#ffffff', flex: 1, fontSize: '18px' }}>
          移除流动性
        </Title>
        <Button
          type="text"
          icon={<SettingOutlined />}
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
          }}
        />
      </div>

      <Card style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      }}>
        {/* 进度步骤 */}
        <Steps 
          current={currentStep} 
          size="small"
          style={{ 
            marginBottom: 16,
            fontSize: '12px'
          }}
        >
          <Step title="选择数量" />
          <Step title="移除流动性" />
          <Step title="完成" />
        </Steps>

        {/* 池子信息 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <img 
                src={poolData.tokenA.logo} 
                alt={poolData.tokenA.symbol}
                style={{ width: '32px', height: '32px', borderRadius: '50%', zIndex: 2 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon.jpg';
                }}
              />
              <img 
                src={poolData.tokenB.logo} 
                alt={poolData.tokenB.symbol}
                style={{ width: '32px', height: '32px', borderRadius: '50%', marginLeft: -8, zIndex: 1 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon.jpg';
                }}
              />
            </div>
            <Title level={4} style={{ margin: 0, marginLeft: 12, color: '#ffffff', fontSize: '16px' }}>
              {poolData.tokenA.symbol}/{poolData.tokenB.symbol}
            </Title>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              我的流动性: {lpBalance ? formatUnits(lpBalance.value, 18) : '0'} LP
            </Text>
          </div>
        </div>

        {/* 移除百分比选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, fontSize: '12px' }}>
              移除数量
            </Text>
            <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
              {removePercentage}%
            </Text>
          </div>

          <Slider
            value={removePercentage}
            onChange={setRemovePercentage}
            min={0}
            max={100}
            step={1}
            style={{ marginBottom: 12 }}
            trackStyle={{ background: 'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)' }}
            handleStyle={{ borderColor: '#ff007a' }}
          />

          <div style={{ display: 'flex', gap: '8px', marginBottom: 16 }}>
            {[25, 50, 75, 100].map((percentage) => (
              <Button
                key={percentage}
                size="small"
                onClick={() => setRemovePercentage(percentage)}
                style={{
                  flex: 1,
                  height: '28px',
                  borderRadius: '6px',
                  border: removePercentage === percentage ? '1px solid #ff007a' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: removePercentage === percentage ? 'rgba(255, 0, 122, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: removePercentage === percentage ? '#ff007a' : '#ffffff',
                  fontWeight: 500,
                  fontSize: '11px',
                }}
              >
                {percentage}%
              </Button>
            ))}
          </div>
        </div>

        {/* 将获得的代币 */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, fontSize: '12px', display: 'block', marginBottom: 8 }}>
            您将获得
          </Text>
          
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px',
            marginBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img 
                  src={poolData.tokenA.logo} 
                  alt={poolData.tokenA.symbol}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', marginRight: 8 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/favicon.jpg';
                  }}
                />
                <Text style={{ color: '#ffffff', fontSize: '12px' }}>{poolData.tokenA.symbol}</Text>
              </div>
              <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
                {parseFloat(tokenAAmount).toFixed(6)}
              </Text>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img 
                  src={poolData.tokenB.logo} 
                  alt={poolData.tokenB.symbol}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', marginRight: 8 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/favicon.jpg';
                  }}
                />
                <Text style={{ color: '#ffffff', fontSize: '12px' }}>{poolData.tokenB.symbol}</Text>
              </div>
              <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>
                {parseFloat(tokenBAmount).toFixed(6)}
              </Text>
            </div>
          </div>
        </div>

        {/* 授权按钮 */}
        {needsApproval && (
          <Button
            type="primary"
            size="middle"
            loading={loading && pendingTxType === 'approve'}
            onClick={handleApprove}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            授权 LP 代币
          </Button>
        )}

        {/* 移除流动性按钮 */}
        <Button
          type="primary"
          size="middle"
          loading={loading && pendingTxType === 'removeLiquidity'}
          disabled={!canRemoveLiquidity}
          onClick={handleRemoveLiquidity}
          style={{ 
            width: '100%',
            height: '44px',
            borderRadius: '12px',
            background: canRemoveLiquidity ? 
              'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)' : 
              'rgba(255, 255, 255, 0.1)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {loading && pendingTxType === 'removeLiquidity' ? '移除中...' : 
           !lpBalance || lpBalance.value === BigInt(0) ? '没有流动性' :
           removeAmount === BigInt(0) ? '请选择移除数量' :
           needsApproval ? '请先授权' :
           '移除流动性'}
        </Button>

        {/* 交易状态 */}
        {txHash && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              交易哈希: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </Text>
            <br />
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              {isConfirming ? '确认中...' : isConfirmed ? '已确认' : '等待确认'}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function RemoveLiquidityPage() {
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Header />
      <Content style={{ backgroundColor: '#0d1117' }}>
        <Suspense fallback={<div>Loading...</div>}>
          <RemoveLiquidityContent />
        </Suspense>
      </Content>
    </Layout>
  );
} 