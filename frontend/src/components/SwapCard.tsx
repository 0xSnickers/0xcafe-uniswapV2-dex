'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Input, Button, Select, Typography, Space, message, Modal, Slider, InputNumber } from 'antd';
import { SwapOutlined, SettingOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useAccount, useBalance, useWriteContract, useReadContract, useChainId } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { UNISWAP_V2_ROUTER_ABI } from '@/config/contracts';
import { Token, getTokensForChain, isNativeToken, formatTokenAmount } from '@/utils/tokens';
import { ENV, getContractAddresses } from '@/config/env';

const { Title, Text } = Typography;
const { Option } = Select;

// 提取SettingsModal为独立组件，使用memo防止不必要的重新渲染
interface SettingsModalProps {
  showSettings: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  tempSlippage: number;
  tempCustomSlippage: string;
  tempSlippageWarning: 'none' | 'low' | 'high' | 'extreme';
  onTempSlippageChange: (value: number) => void;
  onTempCustomSlippageChange: (value: string) => void;
  getTempSlippageColor: () => string;
  getTempSlippageText: () => string;
}

const SettingsModal = memo(({
  showSettings,
  onCancel,
  onConfirm,
  tempSlippage,
  tempCustomSlippage,
  tempSlippageWarning,
  onTempSlippageChange,
  onTempCustomSlippageChange,
  getTempSlippageColor,
  getTempSlippageText
}: SettingsModalProps) => (
  <Modal
    title={
      <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        交易设置
      </div>
    }
    open={showSettings}
    onCancel={onCancel}
    onOk={onConfirm}
    footer={null}
    centered
    width={400}
    styles={{
      content: {
        background: 'rgba(26, 32, 44, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: 0,
      },
      header: {
        background: 'transparent',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 16px 12px',
      }
    }}
  >
    <div style={{ padding: '4px 16px 0px' }}>
      {/* 滑点容差设置 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}>
            滑点容差
          </Text>
        </div>

        {/* 预设滑点按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          marginBottom: 12, 
          flexWrap: 'wrap' 
        }}>
          {[0.1, 0.5, 1.0].map((value) => (
            <Button
              key={value}
              size="small"
              onClick={() => onTempSlippageChange(value)}
              style={{
                flex: 1,
                minWidth: '60px',
                height: '32px',
                borderRadius: '8px',
                border: tempSlippage === value ? '2px solid #ff007a' : '2px solid rgba(255, 255, 255, 0.1)',
                background: tempSlippage === value ? 'rgba(255, 0, 122, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                color: tempSlippage === value ? '#ff007a' : '#ffffff',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              {value}%
            </Button>
          ))}
          
          {/* 自定义滑点输入 */}
          <div style={{ 
            flex: 1, 
            minWidth: '100%',
          }}>
            <InputNumber
              value={tempCustomSlippage ? parseFloat(tempCustomSlippage) : undefined}
              onChange={(value) => onTempCustomSlippageChange(value?.toString() || '')}
              placeholder="自定义滑点"
              style={{
                width: '100%',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                fontSize: '12px',
                fontWeight: 600,
                padding: '0',
              }}
              controls={false}
              suffix={<span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 500 }}>%</span>}
              min={ENV.TRADING.MIN_SLIPPAGE}
              max={ENV.TRADING.MAX_SLIPPAGE}
              step={0.1}
              precision={2}
            />
          </div>
        </div>

        {/* 滑点警告 */}
        {tempSlippageWarning !== 'none' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: `${getTempSlippageColor()}20`,
            border: `1px solid ${getTempSlippageColor()}40`,
            borderRadius: '8px',
            marginBottom: 12,
          }}>
            <WarningOutlined style={{ color: getTempSlippageColor(), fontSize: '12px' }} />
            <Text style={{ color: getTempSlippageColor(), fontSize: '11px' }}>
              {getTempSlippageText()}
            </Text>
          </div>
        )}

        {/* 当前滑点显示 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
            当前滑点容差
          </Text>
          <Text style={{ 
            color: getTempSlippageColor(), 
            fontSize: '12px', 
            fontWeight: 600 
          }}>
            {tempSlippage.toFixed(2)}%
          </Text>
        </div>
      </div>

      {/* 确认和取消按钮 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '0 0 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '16px'
      }}>
        <Button
          onClick={onCancel}
          style={{
            flex: 1,
            height: '36px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          取消
        </Button>
        <Button
          type="primary"
          onClick={onConfirm}
          style={{
            flex: 1,
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(255, 0, 122, 0.3)',
          }}
        >
          确认
        </Button>
      </div>
    </div>
  </Modal>
));

SettingsModal.displayName = 'SettingsModal';

export default function SwapCard() {
  const chainId = useChainId();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState(ENV.TRADING.DEFAULT_SLIPPAGE);
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [deadline, setDeadline] = useState(ENV.TRADING.DEFAULT_DEADLINE);
  const [showSettings, setShowSettings] = useState(false);
  const [slippageWarning, setSlippageWarning] = useState<'none' | 'low' | 'high' | 'extreme'>('none');

  // 临时设置状态，用于弹窗中的修改
  const [tempSlippage, setTempSlippage] = useState(ENV.TRADING.DEFAULT_SLIPPAGE);
  const [tempCustomSlippage, setTempCustomSlippage] = useState<string>('');
  const [tempDeadline, setTempDeadline] = useState(ENV.TRADING.DEFAULT_DEADLINE);
  const [tempSlippageWarning, setTempSlippageWarning] = useState<'none' | 'low' | 'high' | 'extreme'>('none');

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // 初始化代币列表
  useEffect(() => {
    const chainTokens = getTokensForChain(chainId);
    setTokens(chainTokens);
    
    if (chainTokens.length > 0 && !fromToken) {
      setFromToken(chainTokens[0]); // 默认选择第一个代币 (ETH)
    }
  }, [chainId, fromToken]);

  // 滑点警告检测 - 应用到实际设置
  useEffect(() => {
    if (slippage < 0.1) {
      setSlippageWarning('low');
    } else if (slippage > 5 && slippage <= 15) {
      setSlippageWarning('high');
    } else if (slippage > 15) {
      setSlippageWarning('extreme');
    } else {
      setSlippageWarning('none');
    }
  }, [slippage]);

  // 临时滑点警告检测 - 应用到弹窗中的临时设置
  useEffect(() => {
    if (tempSlippage < 0.1) {
      setTempSlippageWarning('low');
    } else if (tempSlippage > 5 && tempSlippage <= 15) {
      setTempSlippageWarning('high');
    } else if (tempSlippage > 15) {
      setTempSlippageWarning('extreme');
    } else {
      setTempSlippageWarning('none');
    }
  }, [tempSlippage]);

  // 打开设置弹窗时，同步当前设置到临时状态
  const handleOpenSettings = useCallback(() => {
    setTempSlippage(slippage);
    setTempCustomSlippage(customSlippage);
    setTempDeadline(deadline);
    // 同步当前滑点警告状态到临时状态，避免触发useEffect
    setTempSlippageWarning(slippageWarning);
    setShowSettings(true);
  }, [slippage, customSlippage, deadline, slippageWarning]);

  // 取消设置修改
  const handleCancelSettings = useCallback(() => {
    setShowSettings(false);
    // 重置临时状态
    setTempSlippage(slippage);
    setTempCustomSlippage(customSlippage);
    setTempDeadline(deadline);
    setTempSlippageWarning(slippageWarning);
  }, [slippage, customSlippage, deadline, slippageWarning]);

  // 确认应用设置
  const handleConfirmSettings = useCallback(() => {
    setSlippage(tempSlippage);
    setCustomSlippage(tempCustomSlippage);
    setDeadline(tempDeadline);
    setShowSettings(false);
    message.success('交易设置已更新');
  }, [tempSlippage, tempCustomSlippage, tempDeadline]);

  // 临时滑点修改
  const handleTempSlippageChange = useCallback((value: number) => {
    setTempSlippage(value);
    setTempCustomSlippage('');
    // 手动设置警告状态，避免useEffect触发
    if (value < 0.1) {
      setTempSlippageWarning('low');
    } else if (value > 5 && value <= 15) {
      setTempSlippageWarning('high');
    } else if (value > 15) {
      setTempSlippageWarning('extreme');
    } else {
      setTempSlippageWarning('none');
    }
  }, []);

  // 临时自定义滑点修改
  const handleTempCustomSlippageChange = useCallback((value: string) => {
    setTempCustomSlippage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= ENV.TRADING.MIN_SLIPPAGE && numValue <= ENV.TRADING.MAX_SLIPPAGE) {
      setTempSlippage(numValue);
      // 手动设置警告状态，避免useEffect触发
      if (numValue < 0.1) {
        setTempSlippageWarning('low');
      } else if (numValue > 5 && numValue <= 15) {
        setTempSlippageWarning('high');
      } else if (numValue > 15) {
        setTempSlippageWarning('extreme');
      } else {
        setTempSlippageWarning('none');
      }
    }
  }, []);

  // 获取临时滑点颜色
  const getTempSlippageColor = useCallback(() => {
    switch (tempSlippageWarning) {
      case 'low': return '#fbbf24';
      case 'high': return '#f59e0b';
      case 'extreme': return '#ef4444';
      default: return '#667eea';
    }
  }, [tempSlippageWarning]);

  // 获取临时滑点警告文本
  const getTempSlippageText = useCallback(() => {
    switch (tempSlippageWarning) {
      case 'low': return '滑点可能过低，交易可能失败';
      case 'high': return '滑点较高，您可能收到更少代币';
      case 'extreme': return '滑点极高，存在较大损失风险';
      default: return '';
    }
  }, [tempSlippageWarning]);

  // 获取用户余额
  const { data: fromBalance } = useBalance({
    address: address,
    token: fromToken && !isNativeToken(fromToken) 
      ? fromToken.address as `0x${string}`
      : undefined,
  });

  const { data: toBalance } = useBalance({
    address: address,
    token: toToken && !isNativeToken(toToken) 
      ? toToken.address as `0x${string}`
      : undefined,
  });

  // 获取预估输出数量
  const { data: amountsOut, refetch: refetchAmountsOut } = useReadContract({
    address: getContractAddresses(chainId)?.ROUTER as `0x${string}`,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: fromAmount && fromToken && toToken && parseFloat(fromAmount) > 0 ? [
      parseEther(fromAmount),
      [fromToken.address as `0x${string}`, toToken.address as `0x${string}`]
    ] : undefined,
    query: {
      enabled: !!(fromAmount && fromToken && toToken && parseFloat(fromAmount) > 0),
    }
  });

  // 当获取到预估输出时更新 toAmount
  useEffect(() => {
    if (amountsOut && amountsOut.length > 1) {
      setToAmount(formatEther(amountsOut[1]));
    } else {
      setToAmount('');
    }
  }, [amountsOut]);

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    // 交换数量
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    
    // 触发重新获取预估输出
    if (value && fromToken && toToken && parseFloat(value) > 0) {
      setTimeout(() => {
        refetchAmountsOut();
      }, 300); // 防抖
    } else {
      setToAmount('');
    }
  };

  const handleSlippageChange = (value: number) => {
    setSlippage(value);
    setCustomSlippage('');
  };

  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= ENV.TRADING.MIN_SLIPPAGE && numValue <= ENV.TRADING.MAX_SLIPPAGE) {
      setSlippage(numValue);
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !address || !fromToken || !toToken || !fromAmount || !toAmount) {
      message.error('请连接钱包并输入交换信息');
      return;
    }

    const contractAddresses = getContractAddresses(chainId);
    if (!contractAddresses) {
      message.error('当前网络不支持，请切换到 Anvil 本地网络');
      return;
    }

    setLoading(true);
    try {
      const deadlineTime = BigInt(Math.floor(Date.now() / 1000) + deadline * 60);
      const amountIn = parseEther(fromAmount);
      const amountOutMin = parseEther(toAmount) * BigInt(100 - slippage * 100) / BigInt(10000); // 滑点保护

      let txHash;

      if (isNativeToken(fromToken)) {
        // ETH -> Token
        txHash = await writeContractAsync({
          address: contractAddresses.ROUTER as `0x${string}`,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactETHForTokens',
          args: [
            amountOutMin,
            [fromToken.address as `0x${string}`, toToken.address as `0x${string}`],
            address,
            deadlineTime,
          ],
          value: amountIn,
        });
      } else if (isNativeToken(toToken)) {
        // Token -> ETH
        txHash = await writeContractAsync({
          address: contractAddresses.ROUTER as `0x${string}`,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactTokensForETH',
          args: [
            amountIn,
            amountOutMin,
            [fromToken.address as `0x${string}`, toToken.address as `0x${string}`],
            address,
            deadlineTime,
          ],
        });
      } else {
        // Token -> Token
        txHash = await writeContractAsync({
          address: contractAddresses.ROUTER as `0x${string}`,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            amountIn,
            amountOutMin,
            [fromToken.address as `0x${string}`, toToken.address as `0x${string}`],
            address,
            deadlineTime,
          ],
        });
      }

      message.success(`交换成功！交易哈希: ${txHash}`);
      setFromAmount('');
      setToAmount('');
    } catch (error: unknown) {
      console.error('交换失败:', error);
      const errorMessage = error instanceof Error ? error.message : '请重试';
      message.error(`交换失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getSlippageColor = () => {
    switch (slippageWarning) {
      case 'low': return '#fbbf24';
      case 'high': return '#f59e0b';
      case 'extreme': return '#ef4444';
      default: return '#667eea';
    }
  };


  const isSwapDisabled = !isConnected || !fromAmount || !toToken || !fromToken || parseFloat(fromAmount) <= 0;

  return (
    <div style={{ 
      padding: '24px',
      background: 'transparent'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ 
          margin: 0, 
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '20px'
        }}>
          Swap
        </Title>
        <Button 
          type="text" 
          icon={<SettingOutlined />}
          style={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handleOpenSettings}
        />
      </div>

      {/* From Token */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>From</Text>
          {fromBalance && (
            <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              余额: {formatTokenAmount(formatEther(fromBalance.value))} {fromBalance.symbol}
            </Text>
          )}
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        marginBottom: 4,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Input
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => handleFromAmountChange(e.target.value)}
            style={{ 
              border: 'none', 
              background: 'transparent',
              fontSize: '32px',
              fontWeight: 500,
              color: '#ffffff',
              padding: 0,
              height: 'auto'
            }}
          />
        </div>
        <div style={{ marginLeft: '12px' }}>
          <Select
            value={fromToken?.symbol}
            onChange={(value) => {
              const token = tokens.find(t => t.symbol === value);
              if (token) setFromToken(token);
            }}
            style={{ 
              minWidth: 140,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px'
            }}
            placeholder="选择代币"
            size="large"
            bordered={true}
            suffixIcon={null}
          >
            {tokens.map(token => (
              <Option key={token.symbol} value={token.symbol}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {token.logoURI ? (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%'
                      }}
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
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%'
                      }}
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

      {/* Swap Button */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <Button
          type="text"
          icon={<SwapOutlined style={{ fontSize: '16px' }} />}
          onClick={handleSwapTokens}
          disabled={!fromToken || !toToken}
          style={{ 
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            transition: 'all 0.2s ease'
          }}
        />
      </div>

      {/* To Token */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>To</Text>
          {toBalance && toToken && (
            <Text style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              余额: {formatTokenAmount(formatEther(toBalance.value))} {toBalance.symbol}
            </Text>
          )}
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        marginBottom: 24,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Input
            placeholder="0.0"
            value={toAmount}
            readOnly
            style={{ 
              border: 'none', 
              background: 'transparent',
              fontSize: '32px',
              fontWeight: 500,
              color: toAmount ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
              padding: 0,
              height: 'auto'
            }}
          />
        </div>
        <div style={{ marginLeft: '12px' }}>
          <Select
            placeholder="选择代币"
            value={toToken?.symbol}
            onChange={(value) => {
              const token = tokens.find(t => t.symbol === value);
              setToToken(token || null);
            }}
            style={{ 
              minWidth: 140,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px'
            }}
            size="large"
            bordered={true}
            suffixIcon={null}
          >
            {tokens.filter(t => t.symbol !== fromToken?.symbol).map(token => (
              <Option key={token.symbol} value={token.symbol}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {token.logoURI ? (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%'
                      }}
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
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%'
                      }}
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

      {/* Swap Button */}
      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        disabled={isSwapDisabled}
        onClick={handleSwap}
        style={{ 
          height: 56,
          borderRadius: 20,
          fontSize: '18px',
          fontWeight: 600,
          background: isSwapDisabled 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)',
          border: 'none',
          color: '#ffffff',
          marginBottom: 16,
          boxShadow: isSwapDisabled ? 'none' : '0 4px 12px rgba(255, 0, 122, 0.3)'
        }}
      >
        {!isConnected ? '连接钱包' : 
         !fromToken || !toToken ? '选择代币' :
         !fromAmount || parseFloat(fromAmount) <= 0 ? '输入数量' :
         '交换'}
      </Button>

      {/* Price Info */}
      {fromAmount && toAmount && fromToken && toToken && parseFloat(fromAmount) > 0 && (
        <div style={{ 
          marginTop: 0,
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>汇率</Text>
              <Text style={{ color: '#ffffff', fontWeight: 500, fontSize: '14px' }}>
                1 {fromToken.symbol} = {formatTokenAmount(parseFloat(toAmount) / parseFloat(fromAmount))} {toToken.symbol}
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>最小接收</Text>
              <Text style={{ color: '#ffffff', fontWeight: 500, fontSize: '14px' }}>
                {formatTokenAmount(parseFloat(toAmount) * (100 - slippage) / 100)} {toToken.symbol}
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>滑点容差</Text>
              <Text style={{ 
                color: getSlippageColor(), 
                fontWeight: 500, 
                fontSize: '14px' 
              }}>
                {slippage.toFixed(2)}%
              </Text>
            </div>
          </Space>
        </div>
      )}

      {/* Chain Info */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
          {chainId === 31337 ? 'Anvil Local Network' :
           chainId === 11155111 ? 'Anvil Fork Sepolia' :
           chainId === 1 ? 'Anvil Fork Mainnet' : 
           `Chain ${chainId}`}
        </Text>
      </div>

      <SettingsModal
        showSettings={showSettings}
        onCancel={handleCancelSettings}
        onConfirm={handleConfirmSettings}
        tempSlippage={tempSlippage}
        tempCustomSlippage={tempCustomSlippage}
        tempSlippageWarning={tempSlippageWarning}
        onTempSlippageChange={handleTempSlippageChange}
        onTempCustomSlippageChange={handleTempCustomSlippageChange}
        getTempSlippageColor={getTempSlippageColor}
        getTempSlippageText={getTempSlippageText}
      />
    </div>
  );
} 