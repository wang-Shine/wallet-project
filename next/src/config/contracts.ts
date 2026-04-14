export const TOKEN_ADDRESS = '0x706485847D5c8a82178C6E9163D56A1B00E55C4F' as const

export const TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{name: 'to', type: 'address'}, {name: 'amount', type: 'uint256'}],
    outputs: [{name: '', type: 'bool'}]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{name: '', type: 'string'}],
  },
  {
    name: 'lastClaimTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: '', type: 'address'}],
    outputs: [{name: '', type: 'uint256'}],
  }
] as const
