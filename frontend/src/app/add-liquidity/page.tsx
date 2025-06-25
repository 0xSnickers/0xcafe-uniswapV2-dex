'use client';

import { useState, useEffect, Suspense } from 'react';
import { Layout, Card, Typography, Button, message } from 'antd';
import { ArrowLeftOutlined, SettingOutlined, SwapOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, isAddress, parseUnits } from 'viem';
import { UNISWAP_V2_ROUTER_ABI, UNISWAP_V2_FACTORY_ABI, ERC20_ABI } from '@/config/abis';
import { useContractAddresses } from '@/hooks/useUniswapV2';
import Header from '@/components/Header';
import SwapTokenSelector, { TokenInfo } from '@/components/SwapTokenSelector';
import TokenInput from '@/components/TokenInput';
import ActionButtons from '@/components/ActionButtons';

const { Title } = Typography;
const { Content } = Layout;

// 样式常量
const STYLES = {
  container: {
    padding: '24px',
    background: 'transparent',
    minHeight: 'calc(100vh - 72px)',
    maxWidth: '480px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 32
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }
};

function AddLiquidityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addresses = useContractAddresses();
  
  // 状态管理
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [slippageTolerance] = useState('5');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pendingTxType, setPendingTxType] = useState<'approve' | 'addLiquidity' | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  // 交易确认状态
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash }
  });

  // 检查流动性池是否存在
  const { data: pairAddress } = useReadContract({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'getPair',
    args: tokenA && tokenB ? [tokenA.address as `0x${string}`, tokenB.address as `0x${string}`] : undefined,
    query: { enabled: !!(tokenA && tokenB && addresses?.factory) }
  });

  // 检查代币授权
  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    address: tokenA?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && addresses?.router ? [address, addresses.router] : undefined,
    query: { enabled: !!(tokenA && address && addresses?.router && tokenA.symbol !== 'ETH') }
  });

  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    address: tokenB?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && addresses?.router ? [address, addresses.router] : undefined,
    query: { enabled: !!(tokenB && address && addresses?.router && tokenB.symbol !== 'ETH') }
  });

  // 计算授权状态
  const needsApprovalA = Boolean(tokenA && tokenA.symbol !== 'ETH' && allowanceA !== undefined && amountA && 
    parseFloat(amountA) > 0 && parseUnits(amountA, tokenA.decimals) > (allowanceA as bigint));
  const needsApprovalB = Boolean(tokenB && tokenB.symbol !== 'ETH' && allowanceB !== undefined && amountB && 
    parseFloat(amountB) > 0 && parseUnits(amountB, tokenB.decimals) > (allowanceB as bigint));

  // 检查是否可以添加流动性
  const canAddLiquidity = Boolean(
    tokenA && tokenB && amountA && amountB && 
    parseFloat(amountA) > 0 && parseFloat(amountB) > 0 &&
    !needsApprovalA && !needsApprovalB && !loading &&
    !(tokenA.symbol === 'ETH' && tokenB.symbol === 'ETH') &&
    pendingTxType !== 'approve'
  );

  // 处理交易确认
  useEffect(() => {
    if (isConfirmed && txHash) {
      if (pendingTxType === 'approve') {
        message.success('授权成功！');
        setTimeout(() => {
          refetchAllowanceA();
          refetchAllowanceB();
        }, 2000);
      } else if (pendingTxType === 'addLiquidity') {
        message.success('流动性添加成功！');
        setAmountA('');
        setAmountB('');
      }
      resetTxState();
    }
  }, [isConfirmed, txHash, pendingTxType, refetchAllowanceA, refetchAllowanceB]);

  // 处理交易错误
  useEffect(() => {
    if (txError) {
      message.error(`交易失败: ${txError.message}`);
      resetTxState();
    }
  }, [txError]);

  const resetTxState = () => {
    setPendingTxType(null);
    setTxHash(undefined);
    setLoading(false);
  };

  // 处理代币交换
  const handleSwapTokens = () => {
    const tempToken = tokenA;
    const tempAmount = amountA;
    setTokenA(tokenB);
    setTokenB(tempToken);
    setAmountA(amountB);
    setAmountB(tempAmount);
  };

  // 处理授权
  const handleApprove = async (token: TokenInfo) => {
    if (!addresses?.router || !address) {
      message.error('合约地址或用户地址未找到');
      return;
    }

    try {
      setLoading(true);
      setPendingTxType('approve');

      const hash = await writeContractAsync({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.router, parseUnits('1000000000', token.decimals)],
      });

      setTxHash(hash);
      message.info('授权交易已提交，请等待确认...');
    } catch (error: any) {
      message.error(`授权失败: ${error.message || '未知错误'}`);
      resetTxState();
    }
  };

  // 处理添加流动性
  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB || !addresses?.router || !address) {
      message.error('请填写完整信息');
      return;
    }

    try {
      setLoading(true);
      setPendingTxType('addLiquidity');

      const amountADesired = parseUnits(amountA, tokenA.decimals);
      const amountBDesired = parseUnits(amountB, tokenB.decimals);
      const amountAMin = (amountADesired * BigInt(100 - parseInt(slippageTolerance))) / BigInt(100);
      const amountBMin = (amountBDesired * BigInt(100 - parseInt(slippageTolerance))) / BigInt(100);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      let hash: `0x${string}`;

      if (tokenA.symbol === 'ETH' || tokenB.symbol === 'ETH') {
        const ethToken = tokenA.symbol === 'ETH' ? tokenA : tokenB;
        const otherToken = tokenA.symbol === 'ETH' ? tokenB : tokenA;
        const ethAmount = tokenA.symbol === 'ETH' ? amountADesired : amountBDesired;
        const tokenAmount = tokenA.symbol === 'ETH' ? amountBDesired : amountADesired;
        const tokenAmountMin = tokenA.symbol === 'ETH' ? amountBMin : amountAMin;
        const ethAmountMin = tokenA.symbol === 'ETH' ? amountAMin : amountBMin;

        hash = await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'addLiquidityETH',
          args: [otherToken.address as `0x${string}`, tokenAmount, tokenAmountMin, ethAmountMin, address, deadline],
          value: ethAmount,
        });
      } else {
        hash = await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'addLiquidity',
          args: [
            tokenA.address as `0x${string}`, tokenB.address as `0x${string}`,
            amountADesired, amountBDesired, amountAMin, amountBMin, address, deadline
          ],
        });
      }

      setTxHash(hash);
      message.info('添加流动性交易已提交，请等待确认...');
    } catch (error: any) {
      message.error(`添加流动性失败: ${error.message || '未知错误'}`);
      resetTxState();
    }
  };

  if (!isConnected) {
    return (
      <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
        <Content style={{ 
          padding: '24px', backgroundColor: '#0d1117', display: 'flex',
          justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 72px)'
        }}>
          <Card style={{ ...STYLES.card, textAlign: 'center', maxWidth: '400px' }}>
            <Title level={3} style={{ color: '#ffffff', marginBottom: 16 }}>
              连接钱包添加流动性
            </Title>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              请连接您的钱包以添加流动性
            </div>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <div style={STYLES.container}>
      <div style={STYLES.header}>
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
          添加流动性
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

      <Card style={STYLES.card}>
        {/* 代币A输入 */}
        <TokenInput
          label="第一个代币"
          token={tokenA}
          amount={amountA}
          onTokenChange={setTokenA}
          onAmountChange={setAmountA}
          excludeTokens={tokenB ? [tokenB.address] : []}
        />

        {/* 交换按钮 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Button
            type="text"
            icon={<SwapOutlined />}
            onClick={handleSwapTokens}
            disabled={!tokenA && !tokenB}
            style={STYLES.swapButton}
          />
        </div>

        {/* 代币B输入 */}
        <TokenInput
          label="第二个代币"
          token={tokenB}
          amount={amountB}
          onTokenChange={setTokenB}
          onAmountChange={setAmountB}
          excludeTokens={tokenA ? [tokenA.address] : []}
        />

        {/* 操作按钮 */}
        <ActionButtons
          tokenA={tokenA}
          tokenB={tokenB}
          needsApprovalA={needsApprovalA}
          needsApprovalB={needsApprovalB}
          canAddLiquidity={canAddLiquidity}
          loading={loading}
          pendingTxType={pendingTxType}
          onApprove={handleApprove}
          onAddLiquidity={handleAddLiquidity}
          txHash={txHash}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
        />
      </Card>
    </div>
  );
}

export default function AddLiquidityPage() {
  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      <Header />
      <Content style={{ backgroundColor: '#0d1117' }}>
        <Suspense fallback={<div>Loading...</div>}>
          <AddLiquidityContent />
        </Suspense>
      </Content>
    </Layout>
  );
} 