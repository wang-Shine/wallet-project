# 项目代码审查报告

> 审查范围：`wallet-project/next/src/` 全部源代码  
> 审查日期：2026/04/14  
> 审查重点：逻辑处理、类型安全、架构设计、代码质量（不含样式）

---

## 目录

- [一、🐛 Bug（必须修复）](#一-bug必须修复)
- [二、⚠️ 逻辑/UX 问题](#二️-逻辑ux-问题)
- [三、🔒 类型安全问题](#三-类型安全问题)
- [四、🏗️ 架构与代码质量](#四️-架构与代码质量)
- [五、📦 依赖与配置问题](#五-依赖与配置问题)
- [六、🔐 安全隐患](#六-安全隐患)
- [七、✅ 做得好的地方](#七-做得好的地方)
- [八、📋 优化建议总结](#八-优化建议总结)

---

## 一、🐛 Bug（必须修复）

### Bug-1：`Claim.tsx` — `calcRemaining` 导致 useEffect 无限循环

**文件**：`src/components/Claim.tsx`

```tsx
// ❌ 当前代码
const calcRemaining = () => {
    if (!lastClaimTime) return 0
    const nextClaimTime = Number(lastClaimTime) + INTERVAL
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, nextClaimTime - now)
}

useEffect(() => {
    setRemaining(calcRemaining())
    const timer = setInterval(() => {
        setRemaining(calcRemaining())
        if (calcRemaining() <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
}, [calcRemaining])  // ← 问题在这里
```

**问题**：`calcRemaining` 是组件函数体内定义的普通函数，**每次渲染都会生成新的引用**，导致 `useEffect` 的依赖永远不等于上一次，形成 "设置定时器 → 更新状态 → 重渲染 → 重新设置定时器" 的**无限循环**。

> 注意：项目开启了 `reactCompiler: true`，React Compiler 可能会自动 memoize 这个函数从而掩盖此 bug。但不应依赖编译器的隐式行为。

**修复方向**：
```tsx
// ✅ 方案：用 useCallback 包裹，只在 lastClaimTime 变化时重新创建
const calcRemaining = useCallback(() => {
    if (!lastClaimTime) return 0
    const nextClaimTime = Number(lastClaimTime) + INTERVAL
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, nextClaimTime - now)
}, [lastClaimTime])

useEffect(() => {
    setRemaining(calcRemaining())
    const timer = setInterval(() => {
        const r = calcRemaining()
        setRemaining(r)
        if (r <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
}, [calcRemaining])
```

---

### Bug-2：`Claim.tsx` — Dialog 永远显示 "Transfer Success" 而非 "Claim Success"

**文件**：`src/components/Claim.tsx` → `src/components/Dialog.tsx`

```tsx
// Claim.tsx 中的调用
<DialogBody
    tokenSymbol={tokenSymbol}
    address={address}
    amount="0"     // ← 传了字符串 "0"
    hash={writeContract.data}
    open={dialogOpen}
    onOpenChange={setDialogOpen}
/>
```

```tsx
// Dialog.tsx 中的判断逻辑
{
    amount ?     // ← "0" 是 truthy！永远走这个分支
    (<DialogTitle>Transfer Success</DialogTitle>) :
    (<DialogTitle>Claim Success</DialogTitle>)
}
```

**问题**：JavaScript 中字符串 `"0"` 是 **truthy**，所以 `amount ? ... : ...` 永远走 Transfer 分支，Claim 成功后弹窗标题显示的是 **"Transfer Success"**——这是一个逻辑错误。

**修复方向**：改用明确的 `type` 属性来区分场景，而不是靠 `amount` 的真假值判断：

```tsx
// Dialog.tsx — 增加 type prop
interface DialogProps {
    type: 'transfer' | 'claim'
    tokenSymbol?: string
    // ...
}

// Claim.tsx
<DialogBody type="claim" ... />

// Send.tsx
<DialogBody type="transfer" ... />
```

---

### Bug-3：`WalletInfo.tsx` — Token 余额显示了错误的单位

**文件**：`src/components/WalletInfo.tsx`

```tsx
// ❌ Token 余额后面跟的是 'ETH'
<p>{tokenBalance ? Number(formatEther(tokenBalance)).toFixed(3) + 'ETH' : '0.0ETH'}</p>
```

**问题**：这里显示的是 ERC-20 代币余额，但后缀写的是 `ETH`。应该使用 `tokenSymbol` 变量。

**修复方向**：
```tsx
// ✅ 
<p>{tokenBalance
    ? `${Number(formatEther(tokenBalance)).toFixed(3)} ${tokenSymbol ?? ''}`
    : `0.000 ${tokenSymbol ?? ''}`
}</p>
```

---

### Bug-4：`Send.tsx` — Loading 状态文案错误

**文件**：`src/components/Send.tsx`

```tsx
{isLoading && <LoadingBody isPending={writeContract.isPending} />}
```

**问题**：当用户选择发送 **ETH** 时，使用的是 `sendTransaction` 而非 `writeContract`。但 `LoadingBody` 的 `isPending` 只绑定了 `writeContract.isPending`。在 ETH 发送等待钱包确认期间，`writeContract.isPending` 为 `false`，所以 Loading 组件会显示"交易确认中..."而不是正确的"等待钱包确认..."。

**修复方向**：
```tsx
<LoadingBody isPending={sendTransaction.isPending || writeContract.isPending} />
```

---

### Bug-5：`Claim.tsx` — useEffect 缺少 `refetch` 依赖

**文件**：`src/components/Claim.tsx`

```tsx
useEffect(() => {
    if (isSuccess) {
        setDialogOpen(true)
        refetch()               // ← 使用了 refetch
    }
}, [isSuccess])                 // ← 但依赖数组中没有 refetch
```

**问题**：`refetch` 在 effect 内部使用但未列入依赖。虽然 wagmi 的 `refetch` 引用通常是稳定的，但这违反了 React hooks 规则，可能导致 stale closure 问题。

---

## 二、⚠️ 逻辑/UX 问题

### UX-1：`Dialog.tsx` — Transfer 描述用了 "claimed" 而非 "sent"

```tsx
// Transfer Success 分支
<DialogDescription>
    Successfully claimed {amount} {tokenSymbol}
    //             ^^^^^^^ 应该是 "sent" 或 "transferred"
</DialogDescription>
```

Transfer 和 Claim 两个分支的描述文案都用了 "claimed"，Transfer 应使用 "transferred" 或 "sent"。

---

### UX-2：`Loading.tsx` — 中英文混用

```tsx
{isPending ? '等待钱包确认...' : '交易确认中...'}
```

整个项目界面都是英文（`Claim Token`、`Send Token`、`Transfer Success`...），但 Loading 组件使用了中文文案，风格不一致。

**建议**：统一为英文 `Waiting for wallet confirmation...` / `Confirming transaction...`，或者引入 i18n 方案。

---

### UX-3：`WalletInfo.tsx` — 未连接钱包时没有空状态提示

当用户未连接钱包时，`address`、`connector`、`ethBalance`、`tokenBalance` 均为 `undefined`，页面会显示空白内容或 `0.0ETH`，没有提示用户需要先连接钱包。

**建议**：增加未连接状态的判断：

```tsx
if (!address) {
    return (
        <Card>
            <CardContent>
                <p>Please connect your wallet first.</p>
            </CardContent>
        </Card>
    )
}
```

---

### UX-4：`WalletInfo.tsx` — `{chain?.name}ETH Balance：` 缺少空格

```tsx
<span className='font-bold'>{chain?.name}ETH Balance：</span>
```

渲染结果为 `SepoliaETH Balance：`（无空格）。应改为 `{chain?.name} ETH Balance：`。

---

### UX-5：`Send.tsx` — 无任何输入校验

| 问题 | 说明 |
|------|------|
| 地址未校验 | `addressValue` 直接 `as \`0x${string}\``，没有检查是否是合法的以太坊地址 |
| 金额未校验 | `parseEther(amountValue)` 传入非数字字符串会直接 **throw** |
| 无最大值限制 | 用户可以输入超过自己余额的金额 |
| 无空值防护 | 虽然有 `if (!addressValue || !amountValue || !selectValue) return`，但没有给用户任何错误提示 |

**建议**：增加 viem 的 `isAddress()` 校验地址，用正则或 `Number()` 校验金额，提供 toast 错误提示：

```tsx
import { isAddress, parseEther } from 'viem'

const transferHandle = async () => {
    if (!selectValue) return toast.error('Please select a token')
    if (!isAddress(addressValue)) return toast.error('Invalid address')
    const amount = Number(amountValue)
    if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount')
    // ...
}
```

---

### UX-6：`Send.tsx` — 交易成功后表单未重置

交易成功后，Dialog 弹出但 `addressValue`、`amountValue`、`selectValue` 仍保留旧值。用户关闭 Dialog 后可能误以为需要再次操作。

**建议**：在 `isSuccess` 时重置表单状态。

---

### UX-7：`WalletInfo.tsx` — 使用 `<img>` 而非 Next.js `<Image>`

```tsx
<img src={connector?.icon || '/default-wallet.png'} alt={...} className='w-6 h-6 mr-2' />
```

使用原生 `<img>` 标签丢失了 Next.js 的图片优化能力（自动 WebP、lazy loading、尺寸优化等），且可能触发 ESLint `@next/next/no-img-element` 警告。

> 注意：`connector?.icon` 可能是外部 URL（如 MetaMask 图标），Next.js `<Image>` 需要在 `next.config.ts` 中配置 `images.remotePatterns`。如果不方便配置，至少对本地图标用 `<Image>`。

---

## 三、🔒 类型安全问题

### Type-1：`Dialog.tsx` — Props 使用内联类型，缺少 interface 定义

```tsx
export default function DialogBody(
    {tokenSymbol, address, amount, hash, open, onOpenChange}:
    {tokenSymbol?: string, address?: string, amount?: string, hash?: string,
     open: boolean, onOpenChange: (open: boolean) => void}
) {
```

**问题**：6 个属性全部写在参数的内联类型中，可读性差、不可复用、难以维护。

**建议**：提取为独立 interface：

```tsx
interface DialogBodyProps {
    type: 'transfer' | 'claim'
    tokenSymbol?: string
    address?: string
    amount?: string
    hash?: `0x${string}`
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function DialogBody(props: DialogBodyProps) { ... }
```

---

### Type-2：`Send.tsx` — 地址类型使用 `as` 强转而非类型守卫

```tsx
to: addressValue as `0x${string}`
args: [addressValue as `0x${string}`, parseEther(amountValue)]
```

**问题**：`as` 类型断言不进行运行时检查，如果 `addressValue` 不是合法的 `0x...` 格式，TypeScript 不会报错但运行时会失败。

**建议**：使用 viem 的 `isAddress()` 进行运行时校验后再使用：

```tsx
import { isAddress } from 'viem'

if (!isAddress(addressValue)) {
    toast.error('Invalid Ethereum address')
    return
}
// addressValue 现在类型收窄为 `0x${string}`
```

---

### Type-3：`Loading.tsx` — Props 使用内联类型

```tsx
export default function LoadingBody({isPending}: {isPending: boolean}) {
```

虽然只有一个属性可以接受，但保持统一的 interface 风格会更好：

```tsx
interface LoadingBodyProps {
    isPending: boolean
}
export default function LoadingBody({ isPending }: LoadingBodyProps) {
```

---

### Type-4：`src/types/` 目录为空

项目存在 `src/types/` 目录但没有任何文件。项目中有多处可以提取的共享类型：

| 可提取的类型 | 当前散落位置 |
|-------------|-------------|
| `TokenSymbol` / `Address` 等基础类型 | 各组件内的 inline 类型 |
| `TransactionHash` | 多个组件中重复使用 `hash?: string` |
| `DialogProps` | `Dialog.tsx` 内联 |

**建议**：创建 `src/types/index.ts`，提取共享类型：

```ts
// src/types/index.ts
export type Address = `0x${string}`
export type TransactionHash = `0x${string}`

export interface TokenInfo {
    address: Address
    symbol: string
    decimals: number
}
```

---

### Type-5：`contracts.ts` — `TOKEN_ADDRESS` 缺少类型注解

```tsx
export const TOKEN_ADDRESS = '0x706485847D5c8a82178C6E9163D56A1B00E55C4F' as const
```

虽然 `as const` 能保留字面量类型，但更明确的做法是声明为 viem 的 `Address` 类型：

```tsx
import type { Address } from 'viem'
export const TOKEN_ADDRESS: Address = '0x706485847D5c8a82178C6E9163D56A1B00E55C4F'
```

---

## 四、🏗️ 架构与代码质量

### Arch-1：`context/index.tsx` — `QueryClient` 在模块顶层创建

```tsx
const queryClient = new QueryClient()  // ← 模块级别
```

**问题**：在 Next.js SSR 环境中，模块级别创建的 `QueryClient` 会在**所有请求之间共享**。这意味着不同用户的请求可能读到彼此的缓存数据，造成数据泄漏。

**修复方向**（TanStack Query 官方推荐的 Next.js 模式）：

```tsx
'use client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function ContextProvider({ children, cookies }: Props) {
    // 每个组件实例创建自己的 QueryClient
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 可选：设置默认 stale time
            },
        },
    }))

    return (
        <WagmiProvider ...>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    )
}
```

---

### Arch-2：`context/index.tsx` — `createAppKit` 在模块顶层执行（副作用）

```tsx
// 在模块导入时就执行，不管是服务端还是客户端
createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [mainnet, sepolia],
    // ...
})
```

**问题**：模块顶层的副作用在 SSR 期间也会执行。虽然目前通过 `'use client'` 标记在客户端执行，但这种模式脆弱，依赖于 bundler 的行为。

**建议**：将 `createAppKit` 的调用移入组件内部或使用惰性初始化：

```tsx
let appKitInitialized = false

function initAppKit() {
    if (appKitInitialized) return
    createAppKit({ ... })
    appKitInitialized = true
}

export default function ContextProvider({ children, cookies }: Props) {
    initAppKit()
    // ...
}
```

---

### Arch-3：重复的 `projectId` 校验

```tsx
// config/index.ts
if (!projectId) {
    throw new Error('Project ID is not defined')
}

// context/index.tsx
if (!projectId) {
    throw new Error('projectId is not defined')  // ← 重复校验
}
```

`context/index.tsx` 导入了 `config/index.ts`，后者在导入时已经校验过了。重复校验虽然无害，但增加了维护成本且错误信息还不一致。

**建议**：只在 `config/index.ts` 中保留一次校验即可。

---

### Arch-4：重复的合约数据读取

| 数据 | 读取位置 | 次数 |
|------|---------|------|
| `tokenSymbol` | `WalletInfo.tsx` + `Claim.tsx` | 2 次独立 RPC 调用 |
| `address` | `WalletInfo.tsx` + `Claim.tsx` + `Send.tsx` | 3 次 `useConnection()` |

虽然 TanStack Query 有去重和缓存机制，但更清晰的做法是提取共享 hooks：

```tsx
// src/hooks/useTokenInfo.ts
export function useTokenInfo() {
    const { data: symbol } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'symbol',
    })
    const { data: balance, refetch } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })
    return { symbol, balance, refetch }
}
```

---

### Arch-5：`config` 导出未使用

```tsx
// config/index.ts
export const config = wagmiAdapter.wagmiConfig  // ← 没有任何地方导入
```

`context/index.tsx` 直接使用 `wagmiAdapter.wagmiConfig`，这个 `config` 导出是死代码。

**建议**：要么删除这个导出，要么在 `context/index.tsx` 中统一使用 `config`。

---

### Arch-6：`page.tsx` 整页标记为 `'use client'`

```tsx
"use client"  // ← 整个页面都是客户端组件
export default function Home() { ... }
```

**问题**：将页面级组件标记为 `'use client'` 意味着整个页面（包括布局结构、标题、Tab 容器等）都失去了 SSR/SSG 的优势。

**建议**：只将需要交互的部分提取为客户端组件，页面本身保持为服务端组件：

```tsx
// page.tsx (Server Component — 不需要 'use client')
import WalletHeader from '@/components/WalletHeader'  // client
import WalletTabs from '@/components/WalletTabs'      // client

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            <WalletHeader />
            <WalletTabs />
        </div>
    )
}
```

---

### Arch-7：没有统一的错误处理

所有交易的错误处理只是 `console.error`：

```tsx
// Claim.tsx
catch (error) {
    console.error('Claim failed:', error)
}

// Send.tsx
catch (error) {
    console.error('Transfer failed:', error)
}
```

用户看不到任何反馈。

**建议**：使用已安装的 `sonner` toast 进行错误提示：

```tsx
import { toast } from 'sonner'

catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Claim failed: ${message}`)
}
```

---

### Arch-8：`Toaster` 组件放在 `ContextProvider` 外部

```tsx
// layout.tsx
<ContextProvider cookies={cookies}>{children}</ContextProvider>
<Toaster />  // ← 在 ContextProvider 外面
```

虽然 `sonner` 的 `Toaster` 不依赖 wagmi/query context 所以目前能工作，但按照 React 组件树的最佳实践，所有 UI 组件应该在 Provider 内部，以确保将来如果 Toaster 需要访问任何 context 数据时不会出问题。

---

## 五、📦 依赖与配置问题

### Dep-1：未使用的依赖

| 依赖 | 状态 | 建议 |
|------|------|------|
| `@solana/kit` | 全项目无一处 import | 删除 |
| `axios` | 全项目无一处 import | 删除 |
| `zustand` | 已安装但零使用 | 保留（如计划使用）或删除 |
| `next-themes` | 全项目无一处 import | 删除 |

```bash
npm uninstall @solana/kit axios next-themes
```

---

### Dep-2：`Send.tsx` 中 Token 类型的值 `"token"` 含义不明

```tsx
<SelectItem value="token">Token</SelectItem>
<SelectItem value="ETH">ETH</SelectItem>
```

```tsx
if (selectValue == 'ETH') {
    // ETH 转账
} else {
    // Token 转账
}
```

`"token"` 既不是代币 symbol 也不是具体名称，语义不明。应使用 `tokenSymbol`（如 `"MTK"`）或至少一个更具体的标识。

---

## 六、🔐 安全隐患

### Sec-1：合约地址未按链区分

```tsx
export const TOKEN_ADDRESS = '0x706485847D5c8a82178C6E9163D56A1B00E55C4F' as const
```

项目配置了 `mainnet` 和 `sepolia` 两个网络，但合约地址只有一个且是 Sepolia 上的。如果用户切换到 mainnet，所有合约调用都会失败或者指向错误的合约。

**建议**：

```tsx
// src/config/contracts.ts
export const TOKEN_ADDRESSES: Record<number, `0x${string}`> = {
    1: '0x...mainnet_address...',       // mainnet
    11155111: '0x706485847D5c8a82178C6E9163D56A1B00E55C4F',  // sepolia
}

export function getTokenAddress(chainId: number): `0x${string}` {
    const address = TOKEN_ADDRESSES[chainId]
    if (!address) throw new Error(`Token not deployed on chain ${chainId}`)
    return address
}
```

---

### Sec-2：`navigator.clipboard.writeText` 缺少错误处理

```tsx
const copyHandle = () => {
    if(hash) {
        navigator.clipboard.writeText(hash)  // ← 可能失败（HTTP 环境、权限）
        toast("copy success!")                // ← 无论成功失败都提示成功
    }
}
```

**修复方向**：

```tsx
const copyHandle = async () => {
    if (!hash) return
    try {
        await navigator.clipboard.writeText(hash)
        toast.success('Copied!')
    } catch {
        toast.error('Copy failed — please copy manually')
    }
}
```

---

## 七、✅ 做得好的地方

值得肯定的实现：

| 方面 | 说明 |
|------|------|
| **wagmi v3 使用正确** | `useWriteContract` + `useWaitForTransactionReceipt` 配合使用，交易流程正确 |
| **SSR Cookie 水合** | `cookieToInitialState` 配合 `cookieStorage` 正确处理了 wagmi 的 SSR 初始化 |
| **ABI `as const`** | `TOKEN_ABI` 使用 `as const` 确保 viem/wagmi 的完整类型推导 |
| **冷却计算逻辑** | `calcRemaining` 的数学逻辑本身是正确的（Bug 仅在于引用稳定性） |
| **shadcn/ui 组件** | 统一使用 shadcn 组件，保持了一致的组件体系 |
| **项目结构清晰** | `config`/`context`/`components`/`lib` 分层合理 |
| **TypeScript strict** | `tsconfig.json` 开启了 `"strict": true` |

---

## 八、📋 优化建议总结

### 按优先级排列

#### 🔴 P0 — 必须修复（Bug）

| # | 问题 | 文件 |
|---|------|------|
| 1 | `calcRemaining` 导致 useEffect 无限循环 | `Claim.tsx` |
| 2 | Dialog 永远显示 "Transfer Success"（应显示 "Claim Success"） | `Claim.tsx` → `Dialog.tsx` |
| 3 | Token 余额单位错误显示 `ETH` | `WalletInfo.tsx` |
| 4 | ETH 发送时 Loading 文案不正确 | `Send.tsx` |

#### 🟡 P1 — 强烈建议修复

| # | 问题 | 文件 |
|---|------|------|
| 5 | `QueryClient` 模块顶层创建（SSR 数据泄漏风险） | `context/index.tsx` |
| 6 | Send 组件缺少地址/金额校验 | `Send.tsx` |
| 7 | 交易错误只有 console.error，用户无感知 | `Claim.tsx`、`Send.tsx` |
| 8 | 合约地址未按链区分 | `contracts.ts` |
| 9 | 未连接钱包时无空状态提示 | `WalletInfo.tsx` |

#### 🟢 P2 — 建议优化

| # | 问题 | 文件 |
|---|------|------|
| 10 | Props 提取为 interface 定义 | `Dialog.tsx`、`Loading.tsx` |
| 11 | Dialog 文案 "claimed" 改为 "transferred" | `Dialog.tsx` |
| 12 | Loading 中英文统一 | `Loading.tsx` |
| 13 | 删除未使用的依赖 | `package.json` |
| 14 | 提取共享 hooks（`useTokenInfo`） | 新文件 |
| 15 | `page.tsx` 拆分客户端/服务端组件 | `page.tsx` |
| 16 | `src/types/` 创建共享类型 | `types/index.ts` |
| 17 | 交易成功后重置表单 | `Send.tsx` |
| 18 | `<img>` 改为 `<Image>` | `WalletInfo.tsx` |
| 19 | `clipboard.writeText` 增加错误处理 | `Dialog.tsx` |
| 20 | 删除重复的 `projectId` 校验 | `context/index.tsx` |
| 21 | 删除未使用的 `config` 导出 | `config/index.ts` |

---

> 总结：项目整体框架搭建合理，wagmi/viem 的使用姿势基本正确。主要问题集中在 **4 个 Bug**（无限循环、Dialog 判断错误、单位错误、Loading 状态错误）、**类型安全不够严格**（大量 `as` 断言和内联类型）、以及**缺少输入校验和错误提示**。建议按优先级逐步修复。
