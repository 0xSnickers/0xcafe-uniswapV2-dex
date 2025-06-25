'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input, Button, Typography, Space, message, Modal, Card, Spin } from 'antd';
import { SwapOutlined, SettingOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAccount, useBalance, useWriteContract } from 'wagmi';
import { formatEther, parseUnits, formatUnits } from 'viem';
import { UNISWAP_V2_ROUTER_ABI } from '@/config/abis';
import { useContractAddresses, useSwapQuoteWithPath } from '@/hooks/useUniswapV2';
import SwapTokenSelector, { TokenInfo } from './SwapTokenSelector';

const { Title, Text } = Typography;

export default function SwapCard() {
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const addresses = useContractAddresses();

  // 构建交换路径
  const swapPath = useMemo(() => {
    if (!fromToken || !toToken || !addresses?.weth) return null;
    
    const wethAddress = addresses.weth;
    
    if (fromToken.symbol === 'ETH') {
      return [wethAddress, toToken.address];
    } else if (toToken.symbol === 'ETH') {
      return [fromToken.address, wethAddress];
    } else {
      // Token to Token，通过WETH路径
      if (fromToken.address.toLowerCase() === wethAddress.toLowerCase() || 
          toToken.address.toLowerCase() === wethAddress.toLowerCase()) {
        return [fromToken.address, toToken.address];
      } else {
        return [fromToken.address, wethAddress, toToken.address];
      }
    }
  }, [fromToken, toToken, addresses?.weth]);

  // 获取交换价格估算
  const { amountOut, amounts } = useSwapQuoteWithPath(
    fromAmount,
    swapPath as `0x${string}`[] || [],
    fromToken?.decimals || 18,
    !!(fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && swapPath)
  );

  // 计算预期输出金额
  const expectedOutput = useMemo(() => {
    if (!amountOut || !toToken) return '';
    try {
      return formatUnits(amountOut, toToken.decimals);
    } catch {
      return '';
    }
  }, [amountOut, toToken]);

  // 自动更新toAmount
  useEffect(() => {
    if (expectedOutput && fromAmount && parseFloat(fromAmount) > 0) {
      setToAmount(parseFloat(expectedOutput).toFixed(6));
    } else if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setToAmount('');
    }
  }, [expectedOutput, fromAmount]);

  // 获取代币余额
  const { data: fromBalance, refetch: refetchFromBalance } = useBalance({
    address: address,
    token: fromToken?.address === '0x0000000000000000000000000000000000000000' ? undefined : fromToken?.address as `0x${string}`,
    query: {
      enabled: !!(address && fromToken?.address),
    },
  });

  const { data: toBalance, refetch: refetchToBalance } = useBalance({
    address: address,
    token: toToken?.address === '0x0000000000000000000000000000000000000000' ? undefined : toToken?.address as `0x${string}`,
    query: {
      enabled: !!(address && toToken?.address),
    },
  });

  // 处理代币交换
  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  // 处理最大余额
  const handleMaxBalance = () => {
    if (fromBalance) {
      const maxAmount = formatEther(fromBalance.value);
      setFromAmount(maxAmount);
    }
  };

  // 处理交换
  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || !addresses?.router || !address) {
      message.error('请填写完整信息');
      return;
    }

    // 防止相同代币交换
    if (fromToken.address === toToken.address) {
      message.error('不能交换相同的代币');
      return;
    }

    try {
      setLoading(true);

      const amountIn = parseUnits(fromAmount, fromToken.decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20分钟
      
      // 计算最小输出量（滑点保护）
      const minAmountOut = expectedOutput ? 
        parseUnits((parseFloat(expectedOutput) * (1 - slippage / 100)).toFixed(toToken.decimals), toToken.decimals) :
        BigInt(0);

      if (!swapPath || swapPath.length < 2) {
        message.error('无效的交换路径');
        return;
      }

      if (fromToken.symbol === 'ETH') {
        // ETH -> Token
        await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactETHForTokens',
          args: [
            minAmountOut,
            swapPath as `0x${string}`[],
            address,
            deadline
          ],
          value: amountIn,
        });
      } else if (toToken.symbol === 'ETH') {
        // Token -> ETH
        await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactTokensForETH',
          args: [
            amountIn,
            minAmountOut,
            swapPath as `0x${string}`[],
            address,
            deadline
          ],
        });
      } else {
        // Token -> Token
        await writeContractAsync({
          address: addresses.router,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            amountIn,
            minAmountOut,
            swapPath as `0x${string}`[],
            address,
            deadline
          ],
        });
      }

      message.success('交换成功！');
      setFromAmount('');
      setToAmount('');
      
      // 刷新余额
      if (refetchFromBalance) {
        refetchFromBalance();
      }
      if (refetchToBalance) {
        refetchToBalance();
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      message.error(`交换失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const canSwap = fromToken && toToken && fromAmount && expectedOutput && !loading && isConnected && 
    !(fromToken.symbol === 'ETH' && toToken.symbol === 'ETH') && parseFloat(fromAmount) > 0;

  if (!isConnected) {
    return (
      <Card style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '400px',
        margin: '0 auto',
      }}>
        <Title level={4} style={{ color: '#ffffff', marginBottom: 16 }}>
          连接钱包进行交换
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          请连接您的钱包以使用交换功能
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '20px',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ 
          margin: 0, 
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 600
        }}>
          交换
        </Title>
        <Button 
          type="text" 
          icon={<SettingOutlined />}
          onClick={() => setShowSettings(true)}
          style={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}
        />
      </div>

      {/* From Token */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontWeight: 500,
            fontSize: '12px'
          }}>
            从
          </Text>
          {fromBalance && fromToken && (
            <Space size={4}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
                余额: {parseFloat(formatEther(fromBalance.value)).toFixed(4)} {fromToken.symbol}
            </Text>
              <Button 
                size="small" 
                type="text"
                onClick={handleMaxBalance}
                style={{ 
                  color: '#667eea', 
                  fontSize: '10px',
                  padding: '0 6px',
                  height: '16px',
                  lineHeight: '16px',
                  minWidth: 'auto'
                }}
              >
                MAX
              </Button>
            </Space>
          )}
        </div>

      <div style={{ 
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px',
          marginBottom: 8
        }}>
          <SwapTokenSelector
            value={fromToken}
            onChange={setFromToken}
            placeholder="选择代币"
            excludeTokens={toToken ? [toToken.address] : []}
            size="small"
            style={{ marginBottom: 8 }}
          />

          <Input
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            disabled={!fromToken}
            style={{ 
              border: 'none', 
              background: 'transparent',
              fontSize: '20px',
              fontWeight: 600,
              color: '#ffffff',
              padding: 0,
              boxShadow: 'none'
            }}
          />
        </div>
      </div>

      {/* Swap Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={handleSwapTokens}
          disabled={!fromToken && !toToken}
          style={{ 
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        />
      </div>

      {/* To Token */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontWeight: 500,
            fontSize: '12px'
          }}>
            到
          </Text>
          {toBalance && toToken && (
            <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
              余额: {parseFloat(formatEther(toBalance.value)).toFixed(4)} {toToken.symbol}
            </Text>
          )}
        </div>

      <div style={{ 
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px'
        }}>
          <SwapTokenSelector
            value={toToken}
            onChange={setToToken}
            placeholder="选择代币"
            excludeTokens={fromToken ? [fromToken.address] : []}
            size="small"
            style={{ marginBottom: 8 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Input
            placeholder="0.0"
            value={toAmount}
              onChange={(e) => setToAmount(e.target.value)}
              disabled={true}
            style={{ 
              border: 'none', 
              background: 'transparent',
                fontSize: '20px',
                fontWeight: 600,
                color: expectedOutput ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
              padding: 0,
                boxShadow: 'none',
                flex: 1
              }}
            />
            {fromAmount && fromToken && toToken && parseFloat(fromAmount) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {!expectedOutput ? (
                  <Spin 
                    indicator={<LoadingOutlined style={{ fontSize: 14, color: '#667eea' }} />} 
                    style={{ marginRight: '4px' }}
                  />
                ) : null}
                <Text style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  whiteSpace: 'nowrap'
                }}>
                  {expectedOutput ? '预估' : '计算中...'}
                </Text>
        </div>
            )}
                </div>
        </div>
      </div>

      {/* 交换信息 */}
      {fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && expectedOutput && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              汇率
            </Text>
            <Text style={{ fontSize: '12px', color: '#ffffff' }}>
              1 {fromToken.symbol} ≈ {(parseFloat(expectedOutput) / parseFloat(fromAmount)).toFixed(6)} {toToken.symbol}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              预期输出
            </Text>
            <Text style={{ fontSize: '12px', color: '#ffffff' }}>
              {parseFloat(expectedOutput).toFixed(6)} {toToken.symbol}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              最小接收 ({slippage}% 滑点)
            </Text>
            <Text style={{ fontSize: '12px', color: '#ffffff' }}>
              {(parseFloat(expectedOutput) * (1 - slippage / 100)).toFixed(6)} {toToken.symbol}
            </Text>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <Button
        type="primary"
        size="large"
        loading={loading}
        disabled={!canSwap}
        onClick={handleSwap}
        style={{ 
          width: '100%',
          height: '48px',
          borderRadius: '12px',
          background: canSwap ? 
            'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)' : 
            'rgba(255, 255, 255, 0.08)',
          border: 'none',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: canSwap ? '0 4px 16px rgba(255, 0, 122, 0.3)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {loading ? '交换中...' : 
         !fromToken || !toToken ? '请选择代币' :
         fromToken.symbol === 'ETH' && toToken.symbol === 'ETH' ? '不能交换相同代币' :
         !fromAmount ? '请输入数量' :
         parseFloat(fromAmount) <= 0 ? '请输入有效数量' :
         !expectedOutput ? '获取价格中...' :
         '交换'}
      </Button>

      {/* Settings Modal */}
      <Modal
        title={
          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
            <SettingOutlined style={{ marginRight: 6, fontSize: '12px' }} />
            交易设置
          </div>
        }
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        centered
        width={320}
        styles={{
          content: {
            background: 'rgba(26, 32, 44, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: 0,
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 16px 8px',
          }
        }}
        zIndex={10000}
      >
        <div style={{ padding: '12px 16px 16px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}>
                滑点容差
              </Text>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              marginBottom: 10, 
              flexWrap: 'wrap' 
            }}>
              {[0.1, 0.5, 1.0].map((value) => (
                <Button
                  key={value}
                  size="small"
                  onClick={() => setSlippage(value)}
                  style={{
                    flex: 1,
                    minWidth: '50px',
                    height: '28px',
                    borderRadius: '6px',
                    border: slippage === value ? '1px solid #ff007a' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: slippage === value ? 'rgba(255, 0, 122, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: slippage === value ? '#ff007a' : '#ffffff',
                    fontWeight: 500,
                    fontSize: '11px',
                  }}
                >
                  {value}%
                </Button>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px' }}>
                当前滑点容差
              </Text>
              <Text style={{ 
                color: '#ff007a', 
                fontSize: '11px', 
                fontWeight: 600 
              }}>
                {slippage.toFixed(1)}%
              </Text>
            </div>
          </div>

          <Button
            type="primary"
            onClick={() => setShowSettings(false)}
            style={{
              width: '100%',
              height: '32px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            确认
          </Button>
        </div>
      </Modal>
    </Card>
  );
} 