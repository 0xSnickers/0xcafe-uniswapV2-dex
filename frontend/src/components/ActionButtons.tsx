'use client';

import { Button, Typography } from 'antd';
import { TokenInfo } from './SwapTokenSelector';

const { Text } = Typography;

interface ActionButtonsProps {
  tokenA: TokenInfo | null;
  tokenB: TokenInfo | null;
  needsApprovalA?: boolean;
  needsApprovalB?: boolean;
  canAddLiquidity: boolean;
  loading: boolean;
  pendingTxType: 'approve' | 'addLiquidity' | null;
  onApprove: (token: TokenInfo) => void;
  onAddLiquidity: () => void;
  txHash?: `0x${string}`;
  isConfirming?: boolean;
  isConfirmed?: boolean;
}

const BUTTON_STYLES = {
  base: {
    width: '100%',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: 8,
  },
  approve: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  addLiquidity: (enabled: boolean, loading: boolean) => ({
    background: enabled && !loading ? 
      'linear-gradient(135deg, #ff007a 0%, #ff6b9d 100%)' : 
      'rgba(255, 255, 255, 0.1)',
    cursor: (!enabled || loading) ? 'not-allowed' : 'pointer',
  })
};

export default function ActionButtons({
  tokenA,
  tokenB,
  needsApprovalA,
  needsApprovalB,
  canAddLiquidity,
  loading,
  pendingTxType,
  onApprove,
  onAddLiquidity,
  txHash,
  isConfirming,
  isConfirmed
}: ActionButtonsProps) {

  const getButtonText = () => {
    if (loading && pendingTxType === 'addLiquidity') return '添加中...';
    if (loading && pendingTxType === 'approve') return '授权中...';
    if (!tokenA || !tokenB) return '请选择代币';
    if (tokenA.symbol === 'ETH' && tokenB.symbol === 'ETH') return '不能添加相同代币';
    if (needsApprovalA || needsApprovalB) return '请先授权';
    return '添加流动性';
  };

  return (
    <>
      {/* 授权按钮A */}
      {needsApprovalA && (
        <Button
          type="primary"
          size="middle"
          loading={loading && pendingTxType === 'approve'}
          disabled={loading}
          onClick={() => onApprove(tokenA!)}
          style={{
            ...BUTTON_STYLES.base,
            ...BUTTON_STYLES.approve,
          }}
        >
          {loading && pendingTxType === 'approve' ? '授权中...' : `授权 ${tokenA?.symbol}`}
        </Button>
      )}

      {/* 授权按钮B */}
      {needsApprovalB && (
        <Button
          type="primary"
          size="middle"
          loading={loading && pendingTxType === 'approve'}
          disabled={loading}
          onClick={() => onApprove(tokenB!)}
          style={{
            ...BUTTON_STYLES.base,
            ...BUTTON_STYLES.approve,
          }}
        >
          {loading && pendingTxType === 'approve' ? '授权中...' : `授权 ${tokenB?.symbol}`}
        </Button>
      )}

      {/* 添加流动性按钮 */}
      <Button
        type="primary"
        size="middle"
        loading={loading && pendingTxType === 'addLiquidity'}
        disabled={!canAddLiquidity || loading}
        onClick={onAddLiquidity}
        style={{
          ...BUTTON_STYLES.base,
          ...BUTTON_STYLES.addLiquidity(canAddLiquidity, loading),
        }}
      >
        {getButtonText()}
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
    </>
  );
} 