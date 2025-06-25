# Deployment Summary

**Chain ID:** 31337
**Timestamp:** 2025-06-22T15:02:59.232Z

## Contract Addresses

- **Factory:** `0xC32609C91d6B6b51D48f2611308FEf121B02041f`
- **Router:** `0x262e2b50219620226C5fB5956432A88fffd94Ba7`
- **WETH:** `0xBEe6FFc1E8627F51CcDF0b4399a1e1abc5165f15`

## Frontend Integration

The contract addresses have been automatically updated in the frontend configuration.
You can now use these contracts in your dApp:

```typescript
import { getContractAddresses } from './config/addresses';

const addresses = getContractAddresses(31337);
console.log('Factory:', addresses.factory);
console.log('Router:', addresses.router);
console.log('WETH:', addresses.weth);
```

## Next Steps

1. Start your frontend application: `cd frontend && npm run dev`
2. Connect your wallet to the local network (Chain ID: 31337)
3. Test token swaps and liquidity operations
