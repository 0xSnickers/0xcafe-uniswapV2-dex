import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits, Address } from 'viem';
import { useMemo, useState } from 'react';
import { UNISWAP_V2_FACTORY_ABI, UNISWAP_V2_ROUTER_ABI, ERC20_ABI } from '../config/abis';
import { getContractAddresses } from '../config/addresses';

// 获取当前链的合约地址
export function useContractAddresses() {
  const { chain } = useAccount();
  return useMemo(() => {
    if (!chain) return null;
    return getContractAddresses(chain.id);
  }, [chain]);
}

// 获取代币信息
export function useTokenInfo(tokenAddress: Address) {
  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  return { name, symbol, decimals };
}

// 获取代币余额
export function useTokenBalance(tokenAddress: Address, userAddress?: Address) {
  const { address } = useAccount();
  const targetAddress = userAddress || address;

  const { data: balance, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  const tokenInfo = useTokenInfo(tokenAddress);

  const formattedBalance = useMemo(() => {
    if (!balance || !tokenInfo.decimals) return '0';
    return formatUnits(balance as bigint, tokenInfo.decimals);
  }, [balance, tokenInfo.decimals]);

  return {
    balance,
    formattedBalance,
    ...tokenInfo,
    refetch,
  };
}

// 获取交易对地址
export function usePairAddress(tokenA: Address, tokenB: Address) {
  const addresses = useContractAddresses();

  const { data: pairAddress } = useReadContract({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'getPair',
    args: [tokenA, tokenB],
    query: {
      enabled: !!(addresses?.factory && tokenA && tokenB),
    },
  });

  return pairAddress as Address | undefined;
}

// 获取交易价格估算
export function useSwapQuote(
  amountIn: string,
  tokenIn: Address,
  tokenOut: Address,
  enabled: boolean = true
) {
  const addresses = useContractAddresses();
  const tokenInInfo = useTokenInfo(tokenIn);
  
  const parsedAmountIn = useMemo(() => {
    if (!amountIn || !tokenInInfo.decimals) return BigInt(0);
    try {
      return parseUnits(amountIn, tokenInInfo.decimals);
    } catch {
      return BigInt(0);
    }
  }, [amountIn, tokenInInfo.decimals]);

  const { data: amounts } = useReadContract({
    address: addresses?.router,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [parsedAmountIn, [tokenIn, tokenOut]],
    query: {
      enabled: enabled && !!(addresses?.router && parsedAmountIn > 0),
    },
  });

  const amountOut = useMemo(() => {
    if (!amounts || amounts.length < 2) return BigInt(0);
    return amounts[1] as bigint;
  }, [amounts]);

  return {
    amountOut,
    amounts,
  };
}

// 获取交易价格估算（支持路径）
export function useSwapQuoteWithPath(
  amountIn: string,
  path: Address[],
  tokenInDecimals: number,
  enabled: boolean = true
) {
  const addresses = useContractAddresses();
  
  const parsedAmountIn = useMemo(() => {
    if (!amountIn || !tokenInDecimals) return BigInt(0);
    try {
      return parseUnits(amountIn, tokenInDecimals);
    } catch {
      return BigInt(0);
    }
  }, [amountIn, tokenInDecimals]);

  const { data: amounts } = useReadContract({
    address: addresses?.router,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [parsedAmountIn, path],
    query: {
      enabled: enabled && !!(addresses?.router && parsedAmountIn > 0 && path && path.length >= 2),
    },
  });

  const amountOut = useMemo(() => {
    if (!amounts || amounts.length < 2) return BigInt(0);
    return amounts[amounts.length - 1] as bigint;
  }, [amounts]);

  return {
    amountOut,
    amounts,
  };
}

// 代币交换 Hook
export function useSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const addresses = useContractAddresses();
  const { writeContractAsync } = useWriteContract();

  const swapExactTokensForTokens = async (
    amountIn: string,
    amountOutMin: string,
    tokenIn: Address,
    tokenOut: Address,
    to: Address,
    deadline: bigint
  ) => {
    if (!addresses?.router) throw new Error('Router address not found');

    setIsLoading(true);
    try {
      const tokenInInfo = useTokenInfo(tokenIn);
      const tokenOutInfo = useTokenInfo(tokenOut);
      
      const parsedAmountIn = parseUnits(amountIn, tokenInInfo.decimals || 18);
      const parsedAmountOutMin = parseUnits(amountOutMin, tokenOutInfo.decimals || 18);

      const hash = await writeContractAsync({
        address: addresses.router,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          parsedAmountIn,
          parsedAmountOutMin,
          [tokenIn, tokenOut],
          to,
          deadline,
        ],
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  const swapExactETHForTokens = async (
    amountOutMin: string,
    tokenOut: Address,
    to: Address,
    deadline: bigint,
    value: string
  ) => {
    if (!addresses?.router) throw new Error('Router address not found');

    setIsLoading(true);
    try {
      const tokenOutInfo = useTokenInfo(tokenOut);
      const parsedAmountOutMin = parseUnits(amountOutMin, tokenOutInfo.decimals || 18);

      const hash = await writeContractAsync({
        address: addresses.router,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [
          parsedAmountOutMin,
          [addresses.weth, tokenOut],
          to,
          deadline,
        ],
        value: parseEther(value),
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  const swapExactTokensForETH = async (
    amountIn: string,
    amountOutMin: string,
    tokenIn: Address,
    to: Address,
    deadline: bigint
  ) => {
    if (!addresses?.router) throw new Error('Router address not found');

    setIsLoading(true);
    try {
      const tokenInInfo = useTokenInfo(tokenIn);
      const parsedAmountIn = parseUnits(amountIn, tokenInInfo.decimals || 18);
      const parsedAmountOutMin = parseEther(amountOutMin);

      const hash = await writeContractAsync({
        address: addresses.router,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [
          parsedAmountIn,
          parsedAmountOutMin,
          [tokenIn, addresses.weth],
          to,
          deadline,
        ],
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    swapExactTokensForTokens,
    swapExactETHForTokens,
    swapExactTokensForETH,
    isLoading,
  };
}

// 流动性添加 Hook
export function useLiquidity() {
  const [isLoading, setIsLoading] = useState(false);
  const addresses = useContractAddresses();
  const { writeContractAsync } = useWriteContract();

  const addLiquidity = async (
    tokenA: Address,
    tokenB: Address,
    amountADesired: string,
    amountBDesired: string,
    amountAMin: string,
    amountBMin: string,
    to: Address,
    deadline: bigint
  ) => {
    if (!addresses?.router) throw new Error('Router address not found');

    setIsLoading(true);
    try {
      const tokenAInfo = useTokenInfo(tokenA);
      const tokenBInfo = useTokenInfo(tokenB);

      const parsedAmountADesired = parseUnits(amountADesired, tokenAInfo.decimals || 18);
      const parsedAmountBDesired = parseUnits(amountBDesired, tokenBInfo.decimals || 18);
      const parsedAmountAMin = parseUnits(amountAMin, tokenAInfo.decimals || 18);
      const parsedAmountBMin = parseUnits(amountBMin, tokenBInfo.decimals || 18);

      const hash = await writeContractAsync({
        address: addresses.router,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA,
          tokenB,
          parsedAmountADesired,
          parsedAmountBDesired,
          parsedAmountAMin,
          parsedAmountBMin,
          to,
          deadline,
        ],
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  const addLiquidityETH = async (
    token: Address,
    amountTokenDesired: string,
    amountTokenMin: string,
    amountETHMin: string,
    to: Address,
    deadline: bigint,
    value: string
  ) => {
    if (!addresses?.router) throw new Error('Router address not found');

    setIsLoading(true);
    try {
      const tokenInfo = useTokenInfo(token);
      const parsedAmountTokenDesired = parseUnits(amountTokenDesired, tokenInfo.decimals || 18);
      const parsedAmountTokenMin = parseUnits(amountTokenMin, tokenInfo.decimals || 18);
      const parsedAmountETHMin = parseEther(amountETHMin);

      const hash = await writeContractAsync({
        address: addresses.router,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'addLiquidityETH',
        args: [
          token,
          parsedAmountTokenDesired,
          parsedAmountTokenMin,
          parsedAmountETHMin,
          to,
          deadline,
        ],
        value: parseEther(value),
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    addLiquidity,
    addLiquidityETH,
    isLoading,
  };
}

// 代币授权 Hook
export function useTokenApproval() {
  const [isLoading, setIsLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const approve = async (
    tokenAddress: Address,
    spender: Address,
    amount: string,
    decimals: number = 18
  ) => {
    setIsLoading(true);
    try {
      const parsedAmount = parseUnits(amount, decimals);

      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, parsedAmount],
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  const approveMax = async (tokenAddress: Address, spender: Address) => {
    setIsLoading(true);
    try {
      const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, maxAmount],
      });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    approve,
    approveMax,
    isLoading,
  };
} 