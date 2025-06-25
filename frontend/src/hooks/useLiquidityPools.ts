import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Address, formatUnits } from 'viem';
import { UNISWAP_V2_FACTORY_ABI, UNISWAP_V2_PAIR_ABI, ERC20_ABI } from '../config/abis';
import { useContractAddresses, useTokenInfo } from './useUniswapV2';

export interface PoolData {
  id: string;
  pairAddress: Address;
  tokenA: {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logo?: string;
  };
  tokenB: {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logo?: string;
  };
  tvl: string;
  tvlUSD: number;
  reserveA: string;
  reserveB: string;
  totalSupply: string;
  myLiquidity: string;
  myLiquidityUSD: number;
  myShare: string;
  volume24h?: string;
  fees24h?: string;
  apr?: string;
}

// 获取所有流动性池数量
export function useAllPairsLength() {
  const addresses = useContractAddresses();

  const { data: pairsLength } = useReadContract({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'allPairsLength',
    query: {
      enabled: !!addresses?.factory,
    },
  });

  return pairsLength as bigint | undefined;
}

// 获取指定索引的流动性池地址
export function usePairByIndex(index: number) {
  const addresses = useContractAddresses();

  const { data: pairAddress } = useReadContract({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'allPairs',
    args: [BigInt(index)],
    query: {
      enabled: !!addresses?.factory && index >= 0,
    },
  });

  return pairAddress as Address | undefined;
}

// 获取单个池子的详细信息
export function usePairDetails(pairAddress: Address | undefined) {
  const { address: userAddress } = useAccount();

  // 获取池子的基本信息
  const pairContracts = pairAddress ? [
    {
      address: pairAddress,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'token0',
    },
    {
      address: pairAddress,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'token1',
    },
    {
      address: pairAddress,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'getReserves',
    },
    {
      address: pairAddress,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'totalSupply',
    },
  ] : [];

  const { data: pairData } = useReadContracts({
    contracts: pairContracts,
    query: {
      enabled: !!pairAddress,
    },
  });

  // 获取用户的LP代币余额
  const { data: userBalance } = useReadContract({
    address: pairAddress,
    abi: UNISWAP_V2_PAIR_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!(pairAddress && userAddress),
    },
  });

  const token0Address = pairData?.[0]?.result as Address | undefined;
  const token1Address = pairData?.[1]?.result as Address | undefined;
  const reserves = pairData?.[2]?.result as [bigint, bigint, number] | undefined;
  const totalSupply = pairData?.[3]?.result as bigint | undefined;

  // 获取代币信息
  const token0Info = useTokenInfo(token0Address || '0x0000000000000000000000000000000000000000' as Address);
  const token1Info = useTokenInfo(token1Address || '0x0000000000000000000000000000000000000000' as Address);

  return useMemo(() => {
    if (!pairAddress || !pairData || !token0Address || !token1Address || !reserves || !totalSupply) {
      return null;
    }

    const [reserve0, reserve1] = reserves;
    const userLPBalance = userBalance as bigint || BigInt(0);
    
    // 计算用户份额
    const userShare = totalSupply > 0 ? Number(userLPBalance * BigInt(10000) / totalSupply) / 100 : 0;
    
    // 计算用户的代币数量
    const userToken0Amount = totalSupply > 0 ? (reserve0 * userLPBalance) / totalSupply : BigInt(0);
    const userToken1Amount = totalSupply > 0 ? (reserve1 * userLPBalance) / totalSupply : BigInt(0);

    const poolData: PoolData = {
      id: pairAddress,
      pairAddress,
      tokenA: {
        address: token0Address,
        symbol: token0Info.symbol || 'Unknown',
        name: token0Info.name || 'Unknown Token',
        decimals: token0Info.decimals || 18,
        logo: getTokenLogo(token0Info.symbol || ''),
      },
      tokenB: {
        address: token1Address,
        symbol: token1Info.symbol || 'Unknown',
        name: token1Info.name || 'Unknown Token',
        decimals: token1Info.decimals || 18,
        logo: getTokenLogo(token1Info.symbol || ''),
      },
      tvl: '$0', // 需要价格数据来计算
      tvlUSD: 0,
      reserveA: formatUnits(reserve0, token0Info.decimals || 18),
      reserveB: formatUnits(reserve1, token1Info.decimals || 18),
      totalSupply: formatUnits(totalSupply, 18),
      myLiquidity: userLPBalance > 0 ? `${formatUnits(userToken0Amount, token0Info.decimals || 18)} ${token0Info.symbol} + ${formatUnits(userToken1Amount, token1Info.decimals || 18)} ${token1Info.symbol}` : '$0',
      myLiquidityUSD: 0, // 需要价格数据来计算
      myShare: userShare > 0 ? `${userShare.toFixed(4)}%` : '0%',
      volume24h: '$0',
      fees24h: '$0',
      apr: '0%',
    };

    return poolData;
  }, [pairAddress, pairData, token0Address, token1Address, reserves, totalSupply, userBalance, token0Info, token1Info]);
}

// 获取所有池子的信息
export function useAllPools(limit: number = 10) {
  const addresses = useContractAddresses();
  const { address: userAddress } = useAccount();

  // 获取池子总数
  const { data: pairsLength } = useReadContract({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'allPairsLength',
    query: {
      enabled: !!addresses?.factory,
    },
  });

  // 获取前几个池子的地址
  const poolCount = Math.min(Number(pairsLength || 0), limit);
  const poolContracts = Array.from({ length: poolCount }, (_, i) => ({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'allPairs',
    args: [BigInt(i)],
  }));

  const { data: pairAddresses, isLoading: pairAddressesLoading } = useReadContracts({
    contracts: poolContracts,
    query: {
      enabled: !!addresses?.factory && poolCount > 0,
    },
  });

  // 获取有效的池子地址
  const validPairAddresses = useMemo(() => {
    return (pairAddresses?.map(result => result.result).filter(Boolean) || []) as Address[];
  }, [pairAddresses]);

  // 为每个池子获取详细信息
  const poolDetailsQueries = useMemo(() => {
    return validPairAddresses.flatMap(pairAddress => [
      {
        address: pairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'token0',
      },
      {
        address: pairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'token1',
      },
      {
        address: pairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'getReserves',
      },
      {
        address: pairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'totalSupply',
      },
    ]);
  }, [validPairAddresses]);

  const { data: poolDetailsData, isLoading: poolDetailsLoading } = useReadContracts({
    contracts: poolDetailsQueries,
    query: {
      enabled: validPairAddresses.length > 0,
    },
  });

  // 获取用户在每个池子的LP代币余额
  const userBalanceQueries = useMemo(() => {
    if (!userAddress) return [];
    return validPairAddresses.map(pairAddress => ({
      address: pairAddress,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }));
  }, [validPairAddresses, userAddress]);

  const { data: userBalancesData, isLoading: userBalancesLoading } = useReadContracts({
    contracts: userBalanceQueries,
    query: {
      enabled: userBalanceQueries.length > 0,
    },
  });

  // 获取所有代币的信息
  const tokenAddresses = useMemo(() => {
    if (!poolDetailsData) return [];
    const addresses: Address[] = [];
    for (let i = 0; i < validPairAddresses.length; i++) {
      const token0 = poolDetailsData[i * 4]?.result as Address;
      const token1 = poolDetailsData[i * 4 + 1]?.result as Address;
      if (token0) addresses.push(token0);
      if (token1) addresses.push(token1);
    }
    return [...new Set(addresses)]; // 去重
  }, [poolDetailsData, validPairAddresses]);

  const tokenInfoQueries = useMemo(() => {
    return tokenAddresses.flatMap(tokenAddress => [
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
    ]);
  }, [tokenAddresses]);

  const { data: tokenInfoData, isLoading: tokenInfoLoading } = useReadContracts({
    contracts: tokenInfoQueries,
    query: {
      enabled: tokenAddresses.length > 0,
    },
  });

  // 使用 useMemo 处理数据，避免死循环
  const { pools, loading } = useMemo(() => {
    if (!addresses?.factory) {
      return { pools: [], loading: false };
    }

    if (validPairAddresses.length === 0) {
      if (pairAddressesLoading) {
        return { pools: [], loading: true };
      }
      console.log('No pools found - this is normal if no liquidity has been added yet');
      return { pools: [], loading: false };
    }

    if (poolDetailsLoading || tokenInfoLoading || userBalancesLoading || !poolDetailsData || !tokenInfoData) {
      return { pools: [], loading: true };
    }

    console.log(`Processing ${validPairAddresses.length} pools...`);
    
    const processedPools: PoolData[] = [];

    // 创建代币信息映射
    const tokenInfoMap = new Map<Address, { symbol: string; name: string; decimals: number }>();
    for (let i = 0; i < tokenAddresses.length; i++) {
      const address = tokenAddresses[i];
      const symbol = tokenInfoData[i * 3]?.result as string || 'Unknown';
      const name = tokenInfoData[i * 3 + 1]?.result as string || 'Unknown Token';
      const decimals = tokenInfoData[i * 3 + 2]?.result as number || 18;
      tokenInfoMap.set(address, { symbol, name, decimals });
    }

    for (let i = 0; i < validPairAddresses.length; i++) {
      const pairAddress = validPairAddresses[i];
      const token0Address = poolDetailsData[i * 4]?.result as Address;
      const token1Address = poolDetailsData[i * 4 + 1]?.result as Address;
      const reserves = poolDetailsData[i * 4 + 2]?.result as [bigint, bigint, number];
      const totalSupply = poolDetailsData[i * 4 + 3]?.result as bigint;

      if (!token0Address || !token1Address || !reserves || !totalSupply) {
        continue;
      }

      const token0Info = tokenInfoMap.get(token0Address);
      const token1Info = tokenInfoMap.get(token1Address);

      if (!token0Info || !token1Info) {
        continue;
      }

      const [reserve0, reserve1] = reserves;
      const reserveA = formatUnits(reserve0, token0Info.decimals);
      const reserveB = formatUnits(reserve1, token1Info.decimals);
      
      // 估算 TVL
      const tvlUSD = estimatePoolTVL(reserveA, reserveB, token0Info.symbol, token1Info.symbol);

      // 计算用户流动性
      const userLPBalance = userBalancesData?.[i]?.result as bigint || BigInt(0);
      let myLiquidity = '$0';
      let myLiquidityUSD = 0;
      let myShare = '0%';

      if (userLPBalance > 0 && totalSupply > 0) {
        // 计算用户份额
        const userSharePercent = Number(userLPBalance * BigInt(10000) / totalSupply) / 100;
        myShare = `${userSharePercent.toFixed(4)}%`;
        
        // 计算用户的代币数量
        const userToken0Amount = (reserve0 * userLPBalance) / totalSupply;
        const userToken1Amount = (reserve1 * userLPBalance) / totalSupply;
        
        const userToken0Formatted = formatUnits(userToken0Amount, token0Info.decimals);
        const userToken1Formatted = formatUnits(userToken1Amount, token1Info.decimals);
        
        myLiquidity = `${parseFloat(userToken0Formatted).toFixed(6)} ${token0Info.symbol} + ${parseFloat(userToken1Formatted).toFixed(6)} ${token1Info.symbol}`;
        
        // 估算用户流动性的USD价值
        myLiquidityUSD = estimatePoolTVL(userToken0Formatted, userToken1Formatted, token0Info.symbol, token1Info.symbol);
      }

      const poolData: PoolData = {
        id: pairAddress,
        pairAddress,
        tokenA: {
          address: token0Address,
          symbol: token0Info.symbol,
          name: token0Info.name,
          decimals: token0Info.decimals,
          logo: getTokenLogo(token0Info.symbol),
        },
        tokenB: {
          address: token1Address,
          symbol: token1Info.symbol,
          name: token1Info.name,
          decimals: token1Info.decimals,
          logo: getTokenLogo(token1Info.symbol),
        },
        tvl: `$${tvlUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        tvlUSD,
        reserveA,
        reserveB,
        totalSupply: formatUnits(totalSupply, 18),
        myLiquidity,
        myLiquidityUSD,
        myShare,
        volume24h: '$0',
        fees24h: '$0',
        apr: '0%',
      };

      processedPools.push(poolData);
    }

    console.log(`Successfully processed ${processedPools.length} pools:`, processedPools);
    return { pools: processedPools, loading: false };
  }, [
    addresses?.factory,
    validPairAddresses,
    poolDetailsData,
    tokenInfoData,
    userBalancesData,
    tokenAddresses,
    pairAddressesLoading,
    poolDetailsLoading,
    tokenInfoLoading,
    userBalancesLoading,
    userAddress,
  ]);

  return { 
    pools, 
    loading, 
    totalPools: Number(pairsLength || 0),
    pairAddresses: validPairAddresses // 返回池子地址供调试
  };
}

// 使用新的详细信息获取逻辑的池子列表
export function useAllPoolsWithDetails(limit: number = 10) {
  const addresses = useContractAddresses();
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取池子总数
  const { data: pairsLength } = useReadContract({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'allPairsLength',
    query: {
      enabled: !!addresses?.factory,
    },
  });

  // 获取前几个池子的地址
  const poolCount = Math.min(Number(pairsLength || 0), limit);
  const poolContracts = Array.from({ length: poolCount }, (_, i) => ({
    address: addresses?.factory,
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: 'allPairs',
    args: [BigInt(i)],
  }));

  const { data: pairAddresses } = useReadContracts({
    contracts: poolContracts,
    query: {
      enabled: !!addresses?.factory && poolCount > 0,
    },
  });

  const validPairAddresses = (pairAddresses?.map(result => result.result).filter(Boolean) || []) as Address[];

  useEffect(() => {
    const fetchPoolsData = async () => {
      if (!addresses?.factory || validPairAddresses.length === 0) {
        console.log('No pools found');
        setPools([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log(`Fetching details for ${validPairAddresses.length} pools...`);
      
      const poolsData: PoolData[] = [];

      // 这里我们需要为每个池子地址获取详细信息
      // 由于 React hooks 的限制，我们不能在循环中使用 hooks
      // 所以先返回基本信息，后续可以优化
      for (const pairAddress of validPairAddresses) {
        poolsData.push({
          id: pairAddress,
          pairAddress,
          tokenA: {
            address: '0x0000000000000000000000000000000000000000' as Address,
            symbol: 'Loading...',
            name: 'Loading...',
            decimals: 18,
            logo: '/favicon.jpg',
          },
          tokenB: {
            address: '0x0000000000000000000000000000000000000000' as Address,
            symbol: 'Loading...',
            name: 'Loading...',
            decimals: 18,
            logo: '/favicon.jpg',
          },
          tvl: '$0',
          tvlUSD: 0,
          reserveA: '0',
          reserveB: '0',
          totalSupply: '0',
          myLiquidity: '$0',
          myLiquidityUSD: 0,
          myShare: '0%',
        });
      }

      setPools(poolsData);
      setLoading(false);
    };

    fetchPoolsData();
  }, [addresses?.factory, validPairAddresses.length]);

  return { 
    pools, 
    loading, 
    totalPools: Number(pairsLength || 0)
  };
}

// 获取用户参与的流动性池
export function useMyPools() {
  const { pools, loading } = useAllPools(20);

  const myPools = useMemo(() => {
    return pools.filter((pool: PoolData) => pool.myLiquidityUSD > 0 || pool.myShare !== '0%');
  }, [pools]);

  return { pools: myPools, loading };
}

// 获取流动性池统计数据
export function usePoolsStats() {
  const { pools } = useAllPools(20);
  const { address } = useAccount();

  return useMemo(() => {
    const totalTVL = pools.reduce((sum: number, pool: PoolData) => sum + pool.tvlUSD, 0);
    const myTotalLiquidity = pools.reduce((sum: number, pool: PoolData) => sum + pool.myLiquidityUSD, 0);
    
    return {
      totalTVL: `$${totalTVL.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      totalVolume24h: '$0',
      totalFees24h: '$0',
      myTotalLiquidity: `$${myTotalLiquidity.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      totalPools: pools.length,
      myActivePools: pools.filter((p: PoolData) => p.myLiquidityUSD > 0).length,
    };
  }, [pools, address]);
}

// 辅助函数：获取代币图标
function getTokenLogo(symbol: string): string {
  const logoMap: Record<string, string> = {
    'ETH': '/eth.png',
    'WETH': '/eth.png',
    'USDC': '/usdc.png',
    'USDT': '/usdt.png',
    'CAFE': '/favicon.jpg',
    'DAI': '/dai.png',
  };
  return logoMap[symbol] || '/favicon.jpg';
}

// 辅助函数：估算池子 TVL（简化版本）
function estimatePoolTVL(
  reserveA: string,
  reserveB: string,
  symbolA: string,
  symbolB: string
): number {
  // 简化的价格估算（实际应该使用价格预言机）
  const prices: Record<string, number> = {
    'ETH': 2000,
    'WETH': 2000,
    'USDC': 1,
    'USDT': 1,
    'CAFE': 0.1,
  };

  const priceA = prices[symbolA] || 0.1;
  const priceB = prices[symbolB] || 0.1;

  const valueA = parseFloat(reserveA) * priceA;
  const valueB = parseFloat(reserveB) * priceB;

  return valueA + valueB;
} 