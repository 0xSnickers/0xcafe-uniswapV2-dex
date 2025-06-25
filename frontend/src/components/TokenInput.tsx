'use client';


import { Button, Input, Typography, Space } from 'antd';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import SwapTokenSelector, { TokenInfo } from './SwapTokenSelector';

const { Text } = Typography;

interface TokenInputProps {
  label: string;
  token: TokenInfo | null;
  amount: string;
  onTokenChange: (token: TokenInfo | null) => void;
  onAmountChange: (amount: string) => void;
  excludeTokens?: string[];
}

export default function TokenInput({
  label,
  token,
  amount,
  onTokenChange,
  onAmountChange,
  excludeTokens = []
}: TokenInputProps) {
  const { address } = useAccount();

  // 获取代币余额
  const { data: balance } = useBalance({
    address: address,
    token: token?.address === '0x0000000000000000000000000000000000000000' ? undefined : token?.address as `0x${string}`,
    query: {
      enabled: !!(address && token?.address),
    },
  });

  // 处理最大余额
  const handleMaxBalance = () => {
    if (balance) {
      const maxAmount = formatEther(balance.value);
      onAmountChange(maxAmount);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, fontSize: '12px' }}>
          {label}
        </Text>
        {balance && token && (
          <Space>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              余额: {parseFloat(formatEther(balance.value)).toFixed(6)} {token.symbol}
            </Text>
            <Button 
              size="small" 
              type="text"
              onClick={handleMaxBalance}
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

      <SwapTokenSelector
        value={token}
        onChange={onTokenChange}
        placeholder={`选择${label}`}
        excludeTokens={excludeTokens}
        style={{ marginBottom: 8 }}
        size="middle"
      />

      {/* 数量输入 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <Input
          placeholder="0.0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          disabled={!token}
          style={{ 
            border: 'none', 
            background: 'transparent',
            fontSize: '18px',
            fontWeight: 600,
            color: '#ffffff',
            padding: 0,
            flex: 1
          }}
        />
        {token && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            minWidth: 100,
            justifyContent: 'center'
          }}>
            <img 
              src={token.logoURI} 
              alt={token.symbol}
              style={{ width: '20px', height: '20px', borderRadius: '50%' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.jpg';
              }}
            />
            <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px' }}>{token.symbol}</span>
          </div>
        )}
      </div>
    </div>
  );
} 