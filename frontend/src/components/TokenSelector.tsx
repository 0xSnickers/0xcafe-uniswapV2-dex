'use client';

import { useState, useEffect, useMemo } from 'react';
import { Select, Input, Button, Typography, Avatar, message, Modal, Form, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { isAddress } from 'viem';
import { useTokenInfo } from '@/hooks/useUniswapV2';

const { Text } = Typography;
const { Option } = Select;

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isCustom?: boolean;
}

// 预定义的常用代币列表
const DEFAULT_TOKENS: TokenInfo[] = [
  {
    address: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: '/eth.png'
  },
];

interface TokenSelectorProps {
  value?: TokenInfo | null;
  onChange?: (token: TokenInfo | null) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeTokens?: string[];
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
}

const CUSTOM_TOKENS_KEY = 'uniswap_custom_tokens';

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

function getCustomTokens(): TokenInfo[] {
  try {
    const stored = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (stored) {
      const tokens = JSON.parse(stored);
      return Array.isArray(tokens) ? tokens : [];
    }
  } catch (error) {
    console.error('Failed to load custom tokens:', error);
  }
  return [];
}

function saveCustomTokens(tokens: TokenInfo[]) {
  try {
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to save custom tokens:', error);
  }
}

export default function TokenSelector({
  value,
  onChange,
  placeholder = '选择代币',
  disabled = false,
  excludeTokens = [],
  style,
  size = 'middle'
}: TokenSelectorProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false);
  const [form] = Form.useForm();

  const shouldFetchTokenInfo = newTokenAddress && isAddress(newTokenAddress);
  const newTokenInfo = useTokenInfo(
    shouldFetchTokenInfo ? (newTokenAddress as `0x${string}`) : ('0x0000000000000000000000000000000000000000' as `0x${string}`)
  );

  useEffect(() => {
    setCustomTokens(getCustomTokens());
  }, []);

  const allTokens = useMemo(() => {
    const tokens = [...DEFAULT_TOKENS, ...customTokens];
    return tokens.filter(token => !excludeTokens.includes(token.address));
  }, [customTokens, excludeTokens]);

  const filteredTokens = useMemo(() => {
    if (!searchValue) return allTokens;
    
    const search = searchValue.toLowerCase();
    return allTokens.filter(token => 
      token.symbol.toLowerCase().includes(search) ||
      token.name.toLowerCase().includes(search) ||
      token.address.toLowerCase().includes(search)
    );
  }, [allTokens, searchValue]);

  const handleTokenSelect = (tokenAddress: string) => {
    const selectedToken = allTokens.find(token => token.address === tokenAddress);
    if (selectedToken && onChange) {
      onChange(selectedToken);
    }
    setSearchValue('');
  };

  const handleAddCustomToken = async () => {
    if (!shouldFetchTokenInfo) {
      message.error('请输入有效的代币合约地址');
      return;
    }

    setIsLoadingTokenInfo(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!newTokenInfo.symbol || !newTokenInfo.name || !newTokenInfo.decimals) {
        message.error('无法获取代币信息，请检查合约地址是否正确');
        return;
      }

      const exists = allTokens.some(token => 
        token.address.toLowerCase() === newTokenAddress.toLowerCase()
      );
      
      if (exists) {
        message.warning('该代币已存在');
        return;
      }

      const newToken: TokenInfo = {
        address: newTokenAddress,
        symbol: newTokenInfo.symbol,
        name: newTokenInfo.name,
        decimals: newTokenInfo.decimals,
        logoURI: getTokenLogo(newTokenInfo.symbol),
        isCustom: true
      };

      const updatedCustomTokens = [...customTokens, newToken];
      setCustomTokens(updatedCustomTokens);
      saveCustomTokens(updatedCustomTokens);
      
      message.success(`成功添加代币 ${newToken.symbol}`);
      setShowAddModal(false);
      setNewTokenAddress('');
      form.resetFields();
      
      if (onChange) {
        onChange(newToken);
      }
    } catch (error) {
      console.error('Failed to add custom token:', error);
      message.error('添加代币失败');
    } finally {
      setIsLoadingTokenInfo(false);
    }
  };

  const handleDeleteCustomToken = (tokenAddress: string) => {
    const updatedCustomTokens = customTokens.filter(token => token.address !== tokenAddress);
    setCustomTokens(updatedCustomTokens);
    saveCustomTokens(updatedCustomTokens);
    message.success('代币已删除');
    
    if (value?.address === tokenAddress && onChange) {
      onChange(null);
    }
  };

  const renderTokenOption = (token: TokenInfo) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '6px 10px',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      minWidth: '280px',
      width: '100%',
      height: '44px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Avatar
          src={token.logoURI}
          size={20}
          style={{ 
            marginRight: 10,
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ 
            color: '#ffffff', 
            fontWeight: 600, 
            fontSize: '13px',
            lineHeight: '16px',
            marginBottom: '1px'
          }}>
            {token.symbol}
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '11px',
            lineHeight: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '120px'
          }}>
            {token.name}
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        flexShrink: 0 
      }}>
        {/* 显示合约地址前后缀 */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '10px',
          fontFamily: 'monospace',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {token.address.slice(0, 6)}...{token.address.slice(-4)}
        </div>
        
        {token.isCustom && (
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCustomToken(token.address);
            }}
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              padding: '2px',
              width: '20px',
              height: '20px',
              minWidth: '20px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      <Select
        value={value?.address}
        onChange={handleTokenSelect}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          fontSize: '13px',
          width: '100%',
          height: size === 'large' ? '48px' : size === 'small' ? '36px' : '40px',
          ...style
        }}
        size={size}
        showSearch
        searchValue={searchValue}
        onSearch={setSearchValue}
        filterOption={false}
        dropdownMatchSelectWidth={false}
        optionLabelProp="label"
        dropdownStyle={{
          background: '#2d3748',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          maxHeight: '320px',
          fontSize: '13px',
          minWidth: '300px',
          width: '100%',
          zIndex: 9999
        }}
        dropdownClassName="token-selector-dropdown"
        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
        dropdownRender={(menu) => (
          <div style={{ minWidth: '300px' }}>
            <div style={{ 
              maxHeight: '260px', 
              overflowY: 'auto',
            }}>
              {menu}
            </div>
            <Divider style={{ 
              margin: '6px 0', 
              borderColor: 'rgba(255, 255, 255, 0.1)' 
            }} />
            <div style={{ padding: '6px 8px' }}>
              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={() => setShowAddModal(true)}
                style={{
                  width: '100%',
                  height: '28px',
                  fontSize: '11px',
                  border: '1px dashed rgba(102, 126, 234, 0.4)',
                  color: '#ffffff',
                  background: '#667eea',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }}
              >
                添加自定义代币
              </Button>
            </div>
          </div>
        )}
      >
        {filteredTokens.map((token) => (
          <Option 
            key={token.address} 
            value={token.address}
            label={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                height: '100%',
              }}>
                <Avatar
                  src={token.logoURI}
                  size={18}
                  style={{ marginRight: 8 }}
                />
                <span style={{ 
                  fontWeight: 600,
                  fontSize: '14px'
                }}>{token.symbol}</span>
              </div>
            }
          >
            {renderTokenOption(token)}
          </Option>
        ))}
      </Select>

      <Modal
        title={
          <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>
            <PlusOutlined style={{ marginRight: 8 }} />
            添加自定义代币
          </div>
        }
        open={showAddModal}
        onCancel={() => {
          setShowAddModal(false);
          setNewTokenAddress('');
          form.resetFields();
        }}
        footer={null}
        centered
        width={480}
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
        zIndex={10001}
      >
        <div style={{ padding: '16px' }}>
          <Form form={form} layout="vertical">
            <Form.Item
              label={<Text style={{ color: '#ffffff' }}>代币合约地址</Text>}
              name="address"
              rules={[
                { required: true, message: '请输入代币合约地址' },
                {
                  validator: (_, value) => {
                    if (!value || isAddress(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('请输入有效的合约地址'));
                  }
                }
              ]}
            >
              <Input
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                placeholder="0x..."
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
              />
            </Form.Item>

            {shouldFetchTokenInfo && newTokenInfo.symbol && (
              <div style={{
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <Avatar
                    src={getTokenLogo(newTokenInfo.symbol)}
                    size={32}
                    style={{ marginRight: 12 }}
                  />
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '16px' }}>
                      {newTokenInfo.symbol}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                      {newTokenInfo.name}
                    </div>
                  </div>
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                  精度: {newTokenInfo.decimals} 位小数
                </div>
              </div>
            )}

         

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTokenAddress('');
                  form.resetFields();
                }}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                loading={isLoadingTokenInfo}
                onClick={handleAddCustomToken}
                disabled={!shouldFetchTokenInfo || !newTokenInfo.symbol}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                添加代币
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
} 