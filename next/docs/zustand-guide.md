# Zustand 完全指南 — 在 Next.js 项目中使用

> 适用版本：Zustand v5 + Next.js 16 + React 19 + TypeScript

---

## 目录

1. [Zustand 是什么](#1-zustand-是什么)
2. [安装](#2-安装)
3. [核心概念与基础用法](#3-核心概念与基础用法)
4. [TypeScript 类型定义](#4-typescript-类型定义)
5. [在 Next.js 中使用（SSR 注意事项）](#5-在-nextjs-中使用ssr-注意事项)
6. [浏览器永久缓存（persist 中间件）](#6-浏览器永久缓存persist-中间件)
7. [中间件系统详解](#7-中间件系统详解)
8. [高级用法](#8-高级用法)
9. [最佳实践](#9-最佳实践)
10. [在本项目中的实际使用示例](#10-在本项目中的实际使用示例)

---

## 1. Zustand 是什么

Zustand（德语"状态"的意思）是一个轻量、快速、可扩展的 React 状态管理库。

### 与其他方案对比

| 特性 | Zustand | Redux | Context API | Jotai |
|------|---------|-------|-------------|-------|
| 包大小 | ~1KB | ~7KB | 0 (内置) | ~2KB |
| 样板代码 | 极少 | 大量 | 中等 | 少 |
| 学习曲线 | 低 | 高 | 低 | 中 |
| 中间件 | 支持 | 支持 | 不支持 | 部分 |
| DevTools | 支持 | 支持 | 不支持 | 支持 |
| SSR 支持 | 支持 | 支持 | 支持 | 支持 |
| 组件外访问 | 支持 | 支持 | 不支持 | 不支持 |
| 性能优化 | 自动（选择器） | 需手动 | 需手动 | 自动 |

### 核心优势

- **极简 API**：一个 `create` 函数搞定一切
- **无 Provider 包裹**：不需要 Context Provider（除非 SSR 场景）
- **组件外可用**：在普通函数/工具方法中也能读写状态
- **自动性能优化**：通过选择器（selector）精确订阅，避免不必要的重渲染
- **中间件扩展**：persist、devtools、immer 等开箱即用

---

## 2. 安装

```bash
# npm
npm install zustand

# yarn
yarn add zustand

# pnpm
pnpm add zustand
```

> 本项目已安装 `zustand@^5.0.12`，无需重复安装。

### 可选依赖

```bash
# 如果需要 immer 中间件（不可变数据更新）
npm install immer
```

---

## 3. 核心概念与基础用法

### 3.1 创建 Store

```ts
// src/store/counter.ts
import { create } from 'zustand'

// 定义接口
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
  incrementBy: (amount: number) => void
}

// 创建 store
export const useCounterStore = create<CounterState>((set, get) => ({
  // -------- 状态 --------
  count: 0,

  // -------- 操作 --------
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  incrementBy: (amount) => set((state) => ({ count: state.count + amount })),
}))
```

### 3.2 在组件中使用

```tsx
'use client'
import { useCounterStore } from '@/store/counter'

export default function Counter() {
  // 方式 1：选择单个状态（推荐 — 精确订阅，性能最优）
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
    </div>
  )
}
```

### 3.3 选择器（Selector）的重要性

```tsx
// ❌ 不推荐：取出整个 state，任何字段变化都会导致组件重渲染
const { count, increment } = useCounterStore()

// ✅ 推荐：精确选择，只有 count 变化时才重渲染
const count = useCounterStore((s) => s.count)

// ✅ 推荐：多个字段用 useShallow（Zustand v5 新特性）
import { useShallow } from 'zustand/shallow'

const { count, increment } = useCounterStore(
  useShallow((s) => ({ count: s.count, increment: s.increment }))
)
```

### 3.4 `set` 函数的两种用法

```ts
// 方式 1：传入部分状态对象（浅合并）
set({ count: 10 })

// 方式 2：传入函数（基于前一个状态计算）
set((state) => ({ count: state.count + 1 }))

// 第二个参数 true 表示替换整个 state（而非合并）
set({ count: 0 }, true) // 替换
```

### 3.5 `get` 函数 — 在 action 内读取当前状态

```ts
const useStore = create<StoreState>((set, get) => ({
  count: 0,
  doubleCount: () => {
    const current = get().count  // 读取当前的 count
    set({ count: current * 2 })
  },
}))
```

### 3.6 在组件外使用（重要特性）

```ts
// 在任何 .ts 文件中直接使用，无需 hooks
import { useCounterStore } from '@/store/counter'

// 读取状态
const currentCount = useCounterStore.getState().count

// 修改状态
useCounterStore.setState({ count: 100 })

// 调用 action
useCounterStore.getState().increment()

// 订阅变化
const unsubscribe = useCounterStore.subscribe((state, prevState) => {
  console.log('count changed:', prevState.count, '->', state.count)
})

// 取消订阅
unsubscribe()
```

---

## 4. TypeScript 类型定义

### 4.1 基本类型定义

```ts
// 推荐：将状态和操作分开定义
interface CounterState {
  count: number
  name: string
}

interface CounterActions {
  increment: () => void
  setName: (name: string) => void
}

// 合并后传给 create
type CounterStore = CounterState & CounterActions

export const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,
  name: 'default',
  increment: () => set((s) => ({ count: s.count + 1 })),
  setName: (name) => set({ name }),
}))
```

### 4.2 使用中间件时的类型（注意额外的括号）

```ts
// 使用中间件时，create 需要柯里化调用：create<Type>()(...)
// 注意 create<Type>() 多了一对空括号 ()
export const useStore = create<MyState>()(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'storage-key' }
  )
)
```

---

## 5. 在 Next.js 中使用（SSR 注意事项）

### 5.1 核心问题：Hydration Mismatch

Next.js 使用 SSR/SSG，服务端渲染时 `localStorage` 不存在。如果 Store 使用了 `persist`，服务端和客户端的初始状态会不一致，导致 **Hydration Mismatch** 错误。

### 5.2 必须添加 `'use client'`

所有使用 Zustand Store 的组件都必须是客户端组件：

```tsx
'use client'  // ← 必须
import { useCounterStore } from '@/store/counter'

export default function Counter() {
  const count = useCounterStore((s) => s.count)
  return <div>{count}</div>
}
```

### 5.3 方案 A：`_hasHydrated` 标记（推荐方案）

在 Store 内部维护一个 hydration 状态标记：

```ts
// src/store/user.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserState {
  name: string
  theme: 'light' | 'dark'
  setName: (name: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  // hydration 相关
  _hasHydrated: boolean
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: '',
      theme: 'light',
      setName: (name) => set({ name }),
      setTheme: (theme) => set({ theme }),
      _hasHydrated: false,
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      // 排除 _hasHydrated，不需要持久化
      partialize: (state) => ({
        name: state.name,
        theme: state.theme,
      }),
      // hydration 完成后设置标记
      onRehydrateStorage: () => (state) => {
        if (state) {
          useUserStore.setState({ _hasHydrated: true })
        }
      },
    }
  )
)
```

在组件中使用：

```tsx
'use client'
import { useUserStore } from '@/store/user'

export default function UserProfile() {
  const name = useUserStore((s) => s.name)
  const hasHydrated = useUserStore((s) => s._hasHydrated)

  // 未 hydrate 时显示骨架屏
  if (!hasHydrated) {
    return <div className="animate-pulse h-6 w-32 bg-gray-200 rounded" />
  }

  return <div>Welcome, {name}</div>
}
```

### 5.4 方案 B：`skipHydration` + 手动触发（精确控制）

```ts
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'user-storage',
      skipHydration: true,  // ← 跳过自动 hydration
    }
  )
)
```

```tsx
// 在布局组件中手动触发一次
'use client'
import { useEffect } from 'react'
import { useUserStore } from '@/store/user'

export function StoreHydration() {
  useEffect(() => {
    useUserStore.persist.rehydrate()
  }, [])
  return null
}

// 在 layout.tsx 中使用
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <StoreHydration />
        {children}
      </body>
    </html>
  )
}
```

### 5.5 方案 C：自定义 `useHydrated` Hook（通用方案）

```ts
// src/hooks/useHydrated.ts
'use client'
import { useState, useEffect } from 'react'

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
```

```tsx
'use client'
import { useHydrated } from '@/hooks/useHydrated'
import { useUserStore } from '@/store/user'

export default function UserProfile() {
  const hydrated = useHydrated()
  const name = useUserStore((s) => s.name)

  if (!hydrated) return <Skeleton />
  return <div>{name}</div>
}
```

---

## 6. 浏览器永久缓存（persist 中间件）

### 6.1 基本持久化

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsState {
  language: string
  notifications: boolean
  setLanguage: (lang: string) => void
  toggleNotifications: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      notifications: true,
      setLanguage: (language) => set({ language }),
      toggleNotifications: () => set((s) => ({
        notifications: !s.notifications,
      })),
    }),
    {
      name: 'app-settings',  // localStorage 的 key 名
      // 默认就是 localStorage，可省略
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

执行后，打开浏览器 DevTools → Application → Local Storage，可以看到：

```json
{
  "state": {
    "language": "zh-CN",
    "notifications": true
  },
  "version": 0
}
```

### 6.2 选择性持久化（partialize）

不是所有状态都需要存到 localStorage，用 `partialize` 筛选：

```ts
persist(
  (set) => ({
    // 需要持久化的
    token: '',
    theme: 'light',
    // 不需要持久化的（临时状态）
    isLoading: false,
    error: null,
    modalOpen: false,
  }),
  {
    name: 'app-store',
    // 只持久化 token 和 theme
    partialize: (state) => ({
      token: state.token,
      theme: state.theme,
    }),
  }
)
```

### 6.3 不同存储引擎

```ts
// 1. localStorage — 永久存储（默认）
storage: createJSONStorage(() => localStorage)

// 2. sessionStorage — 关闭标签页即清除
storage: createJSONStorage(() => sessionStorage)

// 3. 自定义存储（如 IndexedDB）
const indexedDBStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await openDB()
    return db.get('store', name)
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const db = await openDB()
    await db.put('store', value, name)
  },
  removeItem: async (name: string): Promise<void> => {
    const db = await openDB()
    await db.delete('store', name)
  },
}

storage: createJSONStorage(() => indexedDBStorage)
```

### 6.4 版本管理与数据迁移（migrate）

当 Store 结构变化时，旧的 localStorage 数据需要迁移：

```ts
interface SettingsV2 {
  language: string
  notifications: boolean
  // v2 新增字段
  fontSize: number
  colorMode: 'light' | 'dark' | 'system'
}

export const useSettingsStore = create<SettingsV2>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      notifications: true,
      fontSize: 14,
      colorMode: 'system',
    }),
    {
      name: 'app-settings',
      version: 2,  // ← 当前版本号
      migrate: (persistedState: any, version: number) => {
        // 从 v0/v1 迁移到 v2
        if (version < 2) {
          // 旧版本没有 fontSize 和 colorMode
          persistedState.fontSize = 14
          persistedState.colorMode = 'system'
          // 旧字段 theme 改名为 colorMode
          if (persistedState.theme) {
            persistedState.colorMode = persistedState.theme
            delete persistedState.theme
          }
        }
        return persistedState as SettingsV2
      },
    }
  )
)
```

### 6.5 Hydration 生命周期

```ts
persist(
  (set) => ({ /* ... */ }),
  {
    name: 'my-store',
    // hydration 开始前
    onRehydrateStorage: (state) => {
      console.log('开始从 localStorage 恢复数据...')

      // 返回的函数在 hydration 完成后调用
      return (state, error) => {
        if (error) {
          console.error('恢复失败:', error)
        } else {
          console.log('恢复成功:', state)
        }
      }
    },
  }
)
```

### 6.6 手动操作持久化

```ts
// 手动重新从 localStorage 读取
useSettingsStore.persist.rehydrate()

// 检查是否已完成 hydration
const isHydrated = useSettingsStore.persist.hasHydrated()

// 监听 hydration 完成
useSettingsStore.persist.onFinishHydration((state) => {
  console.log('hydration 完成:', state)
})

// 清除 localStorage 中的数据
useSettingsStore.persist.clearStorage()

// 获取 persist 配置
const options = useSettingsStore.persist.getOptions()

// 手动设置 persist 配置
useSettingsStore.persist.setOptions({ name: 'new-key' })
```

### 6.7 存储方式对比

| 存储引擎 | 容量限制 | 生命周期 | 同步/异步 | 适用场景 |
|---------|---------|---------|----------|---------|
| `localStorage` | ~5-10 MB | 永久（除非手动清除） | 同步 | 用户设置、主题、语言 |
| `sessionStorage` | ~5-10 MB | 标签页关闭即清除 | 同步 | 表单临时数据、会话状态 |
| `IndexedDB` | 几乎无限 | 永久 | 异步 | 大量数据、离线缓存 |
| `Cookie` | ~4 KB | 可设过期时间 | 同步 | SSR 需要的数据 |

---

## 7. 中间件系统详解

### 7.1 devtools — 开发者工具

配合 [Redux DevTools 浏览器扩展](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) 使用：

```ts
import { devtools } from 'zustand/middleware'

export const useStore = create<MyState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set(
        (s) => ({ count: s.count + 1 }),
        undefined,
        'increment'  // ← 在 DevTools 中显示的 action 名称
      ),
    }),
    {
      name: 'MyStore',          // DevTools 中显示的 store 名
      enabled: process.env.NODE_ENV === 'development', // 仅开发环境
    }
  )
)
```

### 7.2 immer — 不可变数据更新

让你用 "可变" 的写法更新嵌套数据，背后自动使用不可变更新：

```bash
npm install immer
```

```ts
import { immer } from 'zustand/middleware/immer'

interface TodoState {
  todos: { id: number; text: string; done: boolean }[]
  addTodo: (text: string) => void
  toggleTodo: (id: number) => void
  updateTodoText: (id: number, text: string) => void
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],
    addTodo: (text) => set((state) => {
      // 直接 push！immer 会自动处理不可变更新
      state.todos.push({ id: Date.now(), text, done: false })
    }),
    toggleTodo: (id) => set((state) => {
      const todo = state.todos.find((t) => t.id === id)
      if (todo) todo.done = !todo.done  // 直接修改！
    }),
    updateTodoText: (id, text) => set((state) => {
      const todo = state.todos.find((t) => t.id === id)
      if (todo) todo.text = text  // 直接修改！
    }),
  }))
)
```

### 7.3 subscribeWithSelector — 精确订阅

```ts
import { subscribeWithSelector } from 'zustand/middleware'

export const useStore = create<MyState>()(
  subscribeWithSelector((set) => ({
    count: 0,
    name: 'zustand',
    increment: () => set((s) => ({ count: s.count + 1 })),
  }))
)

// 只在 count 变化时触发回调（而非 state 任何变化）
useStore.subscribe(
  (state) => state.count,          // 选择器
  (count, prevCount) => {          // 回调
    console.log('count:', prevCount, '->', count)
  },
  {
    equalityFn: Object.is,         // 自定义比较函数
    fireImmediately: true,         // 立即触发一次
  }
)
```

### 7.4 中间件组合顺序

多个中间件嵌套时，**顺序非常重要**：

```ts
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export const useStore = create<MyState>()(
  devtools(                          // 最外层
    subscribeWithSelector(           // 第二层
      persist(                       // 第三层
        immer(                       // 最内层
          (set) => ({
            // ... store 定义
          })
        ),
        { name: 'my-store' }         // persist 配置
      )
    ),
    { name: 'MyStore' }              // devtools 配置
  )
)
```

> **规则**：`devtools` > `subscribeWithSelector` > `persist` > `immer`（从外到内）

---

## 8. 高级用法

### 8.1 Store 拆分与组合（Slices Pattern）

大型应用中，可以将 store 拆分为多个 slice：

```ts
// src/store/slices/userSlice.ts
import { StateCreator } from 'zustand'

export interface UserSlice {
  userName: string
  setUserName: (name: string) => void
}

export const createUserSlice: StateCreator<
  UserSlice & CounterSlice,  // 完整 Store 类型
  [],
  [],
  UserSlice
> = (set) => ({
  userName: '',
  setUserName: (name) => set({ userName: name }),
})

// src/store/slices/counterSlice.ts
export interface CounterSlice {
  count: number
  increment: () => void
}

export const createCounterSlice: StateCreator<
  UserSlice & CounterSlice,
  [],
  [],
  CounterSlice
> = (set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
})

// src/store/index.ts — 组合
import { create } from 'zustand'
import { createUserSlice, UserSlice } from './slices/userSlice'
import { createCounterSlice, CounterSlice } from './slices/counterSlice'

type StoreState = UserSlice & CounterSlice

export const useAppStore = create<StoreState>()((...args) => ({
  ...createUserSlice(...args),
  ...createCounterSlice(...args),
}))
```

### 8.2 异步操作

```ts
interface DataState {
  data: any[]
  loading: boolean
  error: string | null
  fetchData: () => Promise<void>
}

export const useDataStore = create<DataState>((set) => ({
  data: [],
  loading: false,
  error: null,
  fetchData: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/data')
      const data = await response.json()
      set({ data, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false,
      })
    }
  },
}))
```

### 8.3 计算属性（Derived State）

```ts
interface CartState {
  items: { id: string; name: string; price: number; qty: number }[]
  addItem: (item: CartState['items'][0]) => void
  // 计算属性：不存储在 state 中
  getTotalPrice: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  // 用 get() 实时计算
  getTotalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.qty, 0)
  },
  getTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0)
  },
}))

// 使用
const totalPrice = useCartStore((s) => s.getTotalPrice())
```

### 8.4 重置 Store

```ts
interface StoreState {
  count: number
  name: string
  increment: () => void
  reset: () => void
}

// 提取初始状态
const initialState = {
  count: 0,
  name: '',
}

export const useStore = create<StoreState>((set) => ({
  ...initialState,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set(initialState),  // 一键重置
}))
```

---

## 9. 最佳实践

### 9.1 文件组织

```
src/
├── store/
│   ├── index.ts            # 导出所有 store（可选）
│   ├── useWalletStore.ts   # 钱包状态
│   ├── useSettingsStore.ts # 用户设置
│   └── useUIStore.ts       # UI 状态（弹窗、loading 等）
```

### 9.2 命名规范

- Store 文件以 `use` + 名称 + `Store` 命名：`useWalletStore.ts`
- localStorage key 用 kebab-case：`wallet-storage`
- action 用动词开头：`setName`、`toggleTheme`、`fetchData`

### 9.3 什么该放 Zustand，什么不该

| 适合放 Zustand | 不适合放 Zustand |
|---------------|----------------|
| 用户设置（语言、主题） | 服务端数据（用 TanStack Query / wagmi） |
| UI 状态（弹窗、侧边栏开关） | 表单数据（用 react-hook-form） |
| 跨组件共享的状态 | 仅单个组件使用的状态（用 useState） |
| 需要持久化的数据 | URL 状态（用 searchParams） |
| 需要在组件外访问的状态 | |

### 9.4 性能优化

```tsx
// ✅ 使用选择器，精确订阅
const count = useStore((s) => s.count)

// ✅ 使用 useShallow 避免引用变化导致的重渲染
import { useShallow } from 'zustand/shallow'
const { a, b } = useStore(useShallow((s) => ({ a: s.a, b: s.b })))

// ❌ 避免在选择器中创建新对象（每次都是新引用）
const data = useStore((s) => ({ count: s.count })) // 每次渲染都会触发！

// ✅ 正确：用 useShallow 包裹
const data = useStore(useShallow((s) => ({ count: s.count })))
```

### 9.5 安全提醒

```
⚠️ 永远不要在 localStorage 中存储：
  - 私钥 / 助记词
  - API 密钥 / Access Token
  - 密码
  - 任何敏感信息

localStorage 对同源页面完全透明，XSS 攻击可以直接读取。
```

---

## 10. 在本项目中的实际使用示例

> 以下示例基于本项目（Wallet Project）的实际代码，展示如何用 Zustand 优化现有架构。

### 10.1 目前的问题

当前项目中：
- `WalletInfo.tsx` 和 `Claim.tsx` 分别独立调用 `useReadContract` 获取 `tokenSymbol`，存在重复请求
- `Send.tsx` 和 `Claim.tsx` 各自维护 `dialogOpen` 状态，无法统一管理
- 没有全局的 UI 状态管理

### 10.2 创建 Store 目录

```bash
mkdir src/store
```

### 10.3 示例：UI Store（弹窗/Loading 状态管理）

```ts
// src/store/useUIStore.ts
import { create } from 'zustand'

interface DialogState {
  open: boolean
  type: 'transfer' | 'claim' | null
  txHash: string
}

interface UIState {
  // 弹窗状态
  dialog: DialogState
  openDialog: (type: DialogState['type'], txHash: string) => void
  closeDialog: () => void

  // 全局 Loading
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
}

const initialDialog: DialogState = {
  open: false,
  type: null,
  txHash: '',
}

export const useUIStore = create<UIState>((set) => ({
  dialog: initialDialog,
  openDialog: (type, txHash) =>
    set({ dialog: { open: true, type, txHash } }),
  closeDialog: () => set({ dialog: initialDialog }),

  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}))
```

在组件中使用：

```tsx
// src/components/Claim.tsx
'use client'
import { useUIStore } from '@/store/useUIStore'

export default function Claim() {
  const openDialog = useUIStore((s) => s.openDialog)

  const handleClaim = async () => {
    // ... 执行 claim 交易
    openDialog('claim', txHash)
  }

  return <button onClick={handleClaim}>Claim</button>
}

// src/components/Dialog.tsx — 统一的弹窗组件
'use client'
import { useUIStore } from '@/store/useUIStore'
import { useShallow } from 'zustand/shallow'

export default function SuccessDialog() {
  const { dialog, closeDialog } = useUIStore(
    useShallow((s) => ({ dialog: s.dialog, closeDialog: s.closeDialog }))
  )

  return (
    <Dialog open={dialog.open} onOpenChange={() => closeDialog()}>
      <DialogContent>
        <p>{dialog.type === 'claim' ? 'Claim' : 'Transfer'} 成功!</p>
        <p>TxHash: {dialog.txHash}</p>
      </DialogContent>
    </Dialog>
  )
}
```

### 10.4 示例：设置 Store（带永久缓存）

```ts
// src/store/useSettingsStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsState {
  // 持久化字段
  defaultNetwork: 'mainnet' | 'sepolia'
  recentAddresses: string[]  // 最近转账地址

  // 操作
  setDefaultNetwork: (network: SettingsState['defaultNetwork']) => void
  addRecentAddress: (address: string) => void
  clearRecentAddresses: () => void

  // hydration
  _hasHydrated: boolean
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      defaultNetwork: 'sepolia',
      recentAddresses: [],

      setDefaultNetwork: (network) => set({ defaultNetwork: network }),

      addRecentAddress: (address) => {
        const current = get().recentAddresses
        // 去重，最多保留 10 个
        const updated = [
          address,
          ...current.filter((a) => a !== address),
        ].slice(0, 10)
        set({ recentAddresses: updated })
      },

      clearRecentAddresses: () => set({ recentAddresses: [] }),

      _hasHydrated: false,
    }),
    {
      name: 'wallet-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // 不持久化 _hasHydrated
      partialize: (state) => ({
        defaultNetwork: state.defaultNetwork,
        recentAddresses: state.recentAddresses,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          useSettingsStore.setState({ _hasHydrated: true })
        }
      },
    }
  )
)
```

在 Send 组件中使用最近地址：

```tsx
// src/components/Send.tsx
'use client'
import { useSettingsStore } from '@/store/useSettingsStore'

export default function Send() {
  const recentAddresses = useSettingsStore((s) => s.recentAddresses)
  const addRecentAddress = useSettingsStore((s) => s.addRecentAddress)
  const hasHydrated = useSettingsStore((s) => s._hasHydrated)

  const handleSend = async (toAddress: string) => {
    // ... 执行转账
    addRecentAddress(toAddress)  // 记录最近转账地址
  }

  return (
    <div>
      <input placeholder="收款地址" />
      {/* 最近转账地址列表 */}
      {hasHydrated && recentAddresses.length > 0 && (
        <div>
          <p>最近地址：</p>
          {recentAddresses.map((addr) => (
            <button key={addr} onClick={() => setAddress(addr)}>
              {addr.slice(0, 6)}...{addr.slice(-4)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 10.5 完整的中间件组合示例

```ts
// src/store/useSettingsStore.ts（完整生产版）
import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'

interface SettingsState {
  defaultNetwork: 'mainnet' | 'sepolia'
  recentAddresses: string[]
  setDefaultNetwork: (network: SettingsState['defaultNetwork']) => void
  addRecentAddress: (address: string) => void
  _hasHydrated: boolean
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        defaultNetwork: 'sepolia',
        recentAddresses: [],
        setDefaultNetwork: (network) => set(
          { defaultNetwork: network },
          undefined,
          'setDefaultNetwork'
        ),
        addRecentAddress: (address) => {
          const current = get().recentAddresses
          set(
            { recentAddresses: [address, ...current.filter((a) => a !== address)].slice(0, 10) },
            undefined,
            'addRecentAddress'
          )
        },
        _hasHydrated: false,
      }),
      {
        name: 'wallet-settings',
        storage: createJSONStorage(() => localStorage),
        version: 1,
        partialize: (state) => ({
          defaultNetwork: state.defaultNetwork,
          recentAddresses: state.recentAddresses,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) useSettingsStore.setState({ _hasHydrated: true })
        },
      }
    ),
    {
      name: 'SettingsStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)
```

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────────┐
│                   Zustand 速查表                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  创建 Store:                                            │
│    const useStore = create<T>()((set, get) => ({ ... }))│
│                                                         │
│  组件中使用:                                             │
│    const val = useStore((s) => s.val)   // 精确订阅      │
│                                                         │
│  组件外使用:                                             │
│    useStore.getState().action()                          │
│    useStore.setState({ key: value })                    │
│                                                         │
│  持久化:                                                │
│    persist((set) => ({...}), { name: 'key' })           │
│                                                         │
│  中间件顺序（外→内）:                                    │
│    devtools > subscribeWithSelector > persist > immer   │
│                                                         │
│  Next.js SSR 防错:                                      │
│    1. 组件加 'use client'                                │
│    2. 用 _hasHydrated 或 skipHydration                  │
│    3. 未 hydrate 时显示骨架屏                             │
│                                                         │
│  清除缓存:                                              │
│    useStore.persist.clearStorage()                       │
│                                                         │
│  ⚠️ 不要存敏感数据到 localStorage                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
