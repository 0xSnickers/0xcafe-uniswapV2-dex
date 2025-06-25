import React, { useState, useMemo } from 'react';
import { Button, Input, Card, message, Select, Spin } from 'antd';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import {
  useContractAddresses,
  useTokenBalance,
  useSwapQuote,
  useSwap,
  useTokenApproval,
} from '../hooks/useUniswapV2';

const { Option } = Select;

// Mock token list - replace with your actual token list
const MOCK_TOKENS = [
  {
    address: '0x0000000000000000000000000000000000000000' as Address,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
  {
    address: '0x1234567890123456789012345678901234567890' as Address,
    symbol: 'TOKEN1',
    name: 'Test Token 1',
    decimals: 18,
  },
  {
    address: '0x9876543210987654321098765432109876543210' as Address,
    symbol: 'TOKEN2', 
    name: 'Test Token 2',
    decimals: 18,
  },
];

export function SwapExample() {
  const { address, isConnected } = useAccount();
  const addresses = useContractAddresses();
  
  const [tokenIn, setTokenIn] = useState<Address>(MOCK_TOKENS[0].address);
  const [tokenOut, setTokenOut] = useState<Address>(MOCK_TOKENS[1].address);
  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  // Hooks
  const tokenInBalance = useTokenBalance(tokenIn);
  const tokenOutBalance = useTokenBalance(tokenOut);
  const swapQuote = useSwapQuote(amountIn, tokenIn, tokenOut, !!amountIn);
  const { swapExactTokensForTokens, swapExactETHForTokens, isLoading: swapLoading } = useSwap();
  const { approve, isLoading: approvalLoading } = useTokenApproval();

  // Calculate minimum amount out with slippage
  const amountOutMin = useMemo(() => {
    if (!swapQuote.amountOut || !slippage) return '0';
    const slippageMultiplier = (100 - parseFloat(slippage)) / 100;
    const minAmount = Number(swapQuote.amountOut) * slippageMultiplier;
    return minAmount.toString();
  }, [swapQuote.amountOut, slippage]);

  // Check if token is ETH
  const isETH = (token: Address) => token === '0x0000000000000000000000000000000000000000';

  // Handle swap
  const handleSwap = async () => {
    if (!address || !addresses) {
      message.error('Please connect your wallet');
      return;
    }

    if (!amountIn || !swapQuote.amountOut) {
      message.error('Please enter a valid amount');
      return;
    }

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      let hash: string;

      if (isETH(tokenIn)) {
        // ETH to Token swap
        hash = await swapExactETHForTokens(
          amountOutMin,
          tokenOut,
          address,
          deadline,
          amountIn
        );
      } else if (isETH(tokenOut)) {
        // Token to ETH swap - requires approval first
        const approvalHash = await approve(tokenIn, addresses.router, amountIn);
        message.success('Approval transaction submitted');
        
        // Note: In a real implementation, you'd wait for approval confirmation
        // before proceeding with the swap
        hash = await swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          tokenIn,
          tokenOut,
          address,
          deadline
        );
      } else {
        // Token to Token swap - requires approval first
        const approvalHash = await approve(tokenIn, addresses.router, amountIn);
        message.success('Approval transaction submitted');
        
        hash = await swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          tokenIn,
          tokenOut,
          address,
          deadline
        );
      }

      message.success(`Swap transaction submitted: ${hash}`);
      
      // Reset form
      setAmountIn('');
      
      // Refresh balances
      tokenInBalance.refetch();
      tokenOutBalance.refetch();
      
    } catch (error) {
      console.error('Swap failed:', error);
      message.error('Swap failed. Please try again.');
    }
  };

  if (!isConnected) {
    return (
      <Card title="Token Swap">
        <p>Please connect your wallet to use the swap feature.</p>
      </Card>
    );
  }

  if (!addresses) {
    return (
      <Card title="Token Swap">
        <p>Contract addresses not configured for this network.</p>
      </Card>
    );
  }

  return (
    <Card title="Token Swap" style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <label>From:</label>
        <Select
          value={tokenIn}
          onChange={setTokenIn}
          style={{ width: '100%', marginBottom: 8 }}
        >
          {MOCK_TOKENS.map((token) => (
            <Option key={token.address} value={token.address}>
              {token.symbol} - {token.name}
            </Option>
          ))}
        </Select>
        <Input
          placeholder="0.0"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          suffix={
            <span style={{ fontSize: '12px', color: '#888' }}>
              Balance: {tokenInBalance.formattedBalance} {tokenInBalance.symbol}
            </span>
          }
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>To:</label>
        <Select
          value={tokenOut}
          onChange={setTokenOut}
          style={{ width: '100%', marginBottom: 8 }}
        >
          {MOCK_TOKENS.map((token) => (
            <Option key={token.address} value={token.address}>
              {token.symbol} - {token.name}
            </Option>
          ))}
        </Select>
        <Input
          placeholder="0.0"
          value={swapQuote.amountOut ? swapQuote.amountOut.toString() : ''}
          readOnly
          suffix={
            <span style={{ fontSize: '12px', color: '#888' }}>
              Balance: {tokenOutBalance.formattedBalance} {tokenOutBalance.symbol}
            </span>
          }
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Slippage Tolerance (%):</label>
        <Input
          placeholder="0.5"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          style={{ width: '100px' }}
        />
      </div>

      {swapQuote.amountOut && (
        <div style={{ marginBottom: 16, fontSize: '12px', color: '#666' }}>
          <p>Estimated output: {swapQuote.amountOut.toString()}</p>
          <p>Minimum received: {amountOutMin}</p>
        </div>
      )}

      <Button
        type="primary"
        block
        size="large"
        onClick={handleSwap}
        loading={swapLoading || approvalLoading}
        disabled={!amountIn || !swapQuote.amountOut}
      >
        {swapLoading || approvalLoading ? (
          <Spin size="small" />
        ) : (
          'Swap'
        )}
      </Button>

      <div style={{ marginTop: 16, fontSize: '12px', color: '#999' }}>
        <p>Router: {addresses.router}</p>
        <p>Factory: {addresses.factory}</p>
        <p>WETH: {addresses.weth}</p>
      </div>
    </Card>
  );
} 