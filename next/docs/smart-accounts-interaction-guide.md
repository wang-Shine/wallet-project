# Reown AppKit 智能账户与嵌入式钱包交互 — 新手完全指南

> 本文基于 [Reown 官方文档](https://docs.reown.com/appkit/next/core/smart-accounts-interaction) 整理。
> 面向**零基础新手**，用大白话 + 生活类比 + 代码实战，一步一步讲清楚。

---

## 目录

- [第一部分：背景知识 — 你得先搞懂这些概念](#第一部分背景知识--你得先搞懂这些概念)
- [第二部分：技术栈 — 你需要会哪些技术](#第二部分技术栈--你需要会哪些技术)
- [第三部分：三个核心方法详解](#第三部分三个核心方法详解)
- [第四部分：在 Next.js 中一步步实现（从零开始）](#第四部分在-nextjs-中一步步实现从零开始)
- [第五部分：完整流程图](#第五部分完整流程图)
- [第六部分：常见问题 FAQ](#第六部分常见问题-faq)

---

# 第一部分：背景知识 — 你得先搞懂这些概念

## 1. 这个文档到底在说什么？解决什么问题？

**一句话总结：** 这个文档教你怎么在你的网站（DApp）里，让用户通过"智能账户"**一次性批量发送多笔区块链交易**。

### 用生活场景理解

假设你在网上购物，你需要：
1. 先授权（approve）支付平台扣你的钱
2. 再执行购买操作
3. 最后领取一个优惠券

**传统方式（EOA 账户）：** 你需要点三次"确认"，每次都要等上一笔完成，弹三次钱包弹窗，签三次名。用户体验很差。

**智能账户 + EIP-5792 方式：** 你只需要点一次"确认"，三个操作打包在一起一次性完成。而且如果其中一个失败了，全部都不执行（原子性），不会出现"钱扣了但东西没买到"的情况。

### 这个技术适合什么场景？

- DeFi（去中心化金融）：一次性完成"授权 + 兑换"
- NFT 市场：一次性"授权 + 购买 + 转移"
- 游戏：一次性"购买道具 + 使用道具 + 升级角色"
- 任何需要多步骤区块链操作的场景

---

## 2. 什么是 Reown？什么是 AppKit？

### Reown（前身是 WalletConnect）

Reown 是一家做 Web3 基础设施的公司。你可以理解为它提供了一套"工具包"，帮助开发者快速在网站里接入区块链钱包功能。

### AppKit

AppKit 是 Reown 提供的一个**前端 UI 组件库 + SDK**，它帮你解决了：

| 功能 | 说明 |
|------|------|
| 钱包连接 | 提供现成的"连接钱包"按钮和弹窗 |
| 多钱包支持 | 支持 MetaMask、Coinbase Wallet、手机钱包扫码等 |
| 嵌入式钱包 | 支持邮箱/Google/Apple 等社交登录方式创建钱包 |
| 智能账户 | 自动为嵌入式钱包用户创建智能账户 |
| 多链支持 | 以太坊、Polygon、Arbitrum、Solana 等 |

**类比：** 如果你做过微信登录，AppKit 就像"微信登录 SDK"，但它是区块链世界的"钱包登录 SDK"。

---

## 3. 什么是钱包（Wallet）？

区块链钱包 **不是** 存钱的地方。代币其实存在区块链上。

钱包的本质是一个 **管理私钥的工具**。私钥就是你的"密码"，有了它你才能证明"这个区块链地址是我的"，才能签名发送交易。

### 钱包的类型

| 类型 | 例子 | 特点 |
|------|------|------|
| 浏览器插件钱包 | MetaMask, Rabby | 安装在浏览器里的扩展程序 |
| 手机钱包 | Trust Wallet, Rainbow | 手机 App，扫码连接 |
| 硬件钱包 | Ledger, Trezor | 实体设备，最安全 |
| **嵌入式钱包** | AppKit 内置 | 邮箱/社交登录自动创建，用户无感知 |

---

## 4. 什么是 EOA（传统账户）？

**EOA = Externally Owned Account = 外部拥有账户**

这是以太坊最原始的账户类型。它由一对密钥组成：

```
私钥 (Private Key) → 绝对保密，相当于银行卡密码
     ↓ 数学推导
公钥 (Public Key) → 可以公开
     ↓ 哈希计算
地址 (Address) → 0x1234...abcd，相当于银行卡号
```

### EOA 的局限性

| 问题 | 说明 |
|------|------|
| 私钥丢了就完了 | 没有"找回密码"功能，资产永久丢失 |
| 不能批量交易 | 一次只能发一笔交易，用户需要反复确认 |
| 不能自定义规则 | 无法设置"每天最多转 1 ETH"这种安全限制 |
| 签名方式单一 | 只能用私钥签名，不支持指纹/面部识别等 |

---

## 5. 什么是智能账户（Smart Account）？

**智能账户 = 一个部署在区块链上的智能合约，但它被当作"账户"来使用。**

### 和 EOA 的核心区别（用保险柜类比）

**EOA（普通保险柜）：**
- 只有一把钥匙
- 钥匙丢了，保险柜永远打不开
- 每次只能取一样东西

**智能账户（智能保险柜）：**
- 可以设置指纹、密码、钥匙等多种开锁方式
- 可以设置"需要 3 个人中的 2 个同意才能打开"
- 可以一次性取出多样东西（批量操作）
- 可以设置"每天最多取 1000 元"等规则
- 钥匙丢了可以通过其他方式恢复

### 智能账户能做什么？

- **多重签名授权：** 一笔交易需要多人批准才能执行，提高安全性
- **委托交易：** 允许第三方在特定条件下代你执行交易
- **增强安全：** 设置时间锁、提款限额等复杂安全机制
- **批量交易：** 一次性执行多笔操作（这就是本文档的核心功能）
- **自定义逻辑：** 创建符合个人或商业需求的自定义交易规则
- **账户命名：** 通过 ENS 给账户起别名（如 `alice.reown.id`），跨网络通用

### 在 AppKit 中的特殊行为

| 特点 | 详细说明 |
|------|---------|
| **默认开启** | 使用 AppKit 时，智能账户功能自动启用，不需要你写任何额外配置 |
| **仅限嵌入式钱包** | 只有通过邮箱/社交登录的用户才有智能账户。MetaMask 等外部钱包用户还是用 EOA |
| **延迟部署** | 智能合约不是一注册就部署的，而是等用户发第一笔交易时才部署。部署前用的是"预计算地址"（可以理解为"预订的门牌号"） |
| **有激活费** | 第一笔交易会额外收一点 gas 费（用于部署智能合约到链上） |
| **不能导出** | 智能账户本身没有私钥/助记词，不能导出。但它底层的 EOA 签名者可以导出 |

---

## 6. 什么是嵌入式钱包（Embedded Wallet）？

嵌入式钱包是"内嵌在你网站里的钱包"，用户**不需要安装任何插件或 App**。

### 对比流程

```
传统方式：
用户 → 安装 MetaMask → 创建钱包 → 记住 12 个助记词 → 连接网站
（很多普通用户到"记住 12 个助记词"这一步就放弃了）

嵌入式钱包方式：
用户 → 输入邮箱/点击 Google 登录 → 自动创建钱包 → 直接使用
（和普通网站注册一样简单）
```

### 为什么嵌入式钱包和智能账户绑定？

因为嵌入式钱包的目标用户是"普通人"，他们不懂什么是 gas、什么是签名。智能账户可以提供更好的用户体验（批量交易、gas 代付等），所以 AppKit 自动为嵌入式钱包用户开通智能账户。

---

## 7. 什么是 EIP-5792？

**EIP = Ethereum Improvement Proposal = 以太坊改进提案**

EIP-5792 就是编号为 5792 的提案，它定义了一套**DApp 和钱包之间通信的标准接口**，核心功能就是**批量发送交易**。

### 它定义了三个方法

| 方法名 | 作用 | 类比 |
|--------|------|------|
| `wallet_getCapabilities` | 问钱包："你支持批量交易吗？" | 问快递公司："你支持同时寄多个包裹吗？" |
| `wallet_sendCalls` | 把多笔交易打包发给钱包执行 | 把多个包裹一起交给快递公司 |
| `wallet_getCallsStatus` | 查询这批交易的执行结果 | 查询这批包裹的物流状态 |

---

## 8. 什么是"原子性"（Atomic）？

**原子性 = 要么全部成功，要么全部失败，不存在"部分成功"。**

### 生活类比

你去银行转账，需要两步：
1. 从你账户扣 100 元
2. 给对方账户加 100 元

**有原子性：** 如果第 2 步失败了，第 1 步也会自动撤销。你不会莫名其妙少了 100 元。

**没有原子性：** 如果第 2 步失败了，第 1 步已经执行了。你的 100 元就凭空消失了。

### 在 EIP-5792 中的三种状态

| 状态值 | 意思 | 详细说明 |
|--------|------|---------|
| `supported` | 完全支持 | 钱包保证原子性执行。所有交易要么全成功，要么全回滚 |
| `ready` | 可以升级 | 钱包技术上可以支持原子性，但需要用户确认升级。就像银行说"我们有这个服务，但你需要先开通" |
| `unsupported` | 不支持 | 钱包不支持原子性，也不打算支持。你需要回退到传统的一笔一笔发送交易的方式 |

---

# 第二部分：技术栈 — 你需要会哪些技术

## 必须掌握的前端技术

| 技术 | 为什么需要 | 学习建议 |
|------|----------|---------|
| **HTML/CSS/JavaScript** | 网页开发基础 | 必须先学会这三个 |
| **React** | AppKit 的 Hooks 和组件都基于 React | 需要理解组件、状态（state）、Hooks（useState, useEffect 等） |
| **Next.js** | 本文档用的框架，AppKit 对它有专门的适配 | 需要理解 App Router、Server Component、Client Component、layout.tsx |
| **TypeScript** | 所有代码示例都用 TS，类型安全 | 理解基本类型标注即可，如 `string`, `number`, `as \`0x${string}\`` |

## 需要安装的 npm 包

| 包名 | 作用 | 一句话说明 |
|------|------|----------|
| `@reown/appkit` | Reown 的核心库 | 提供钱包连接 UI 弹窗、智能账户管理、React Hooks（`useSendCalls` 等） |
| `@reown/appkit-adapter-wagmi` | Wagmi 适配器 | 是 AppKit 和 Wagmi 之间的"翻译层"，让两者能协同工作 |
| `wagmi` | React Hooks for Ethereum | 提供一系列操作以太坊的 React Hooks（读合约、发交易、查余额等） |
| `viem` | 底层以太坊工具库 | Wagmi 的底层依赖，负责地址格式化、ABI 编码解码、数据类型转换等底层工作 |
| `@tanstack/react-query` | 异步数据管理 | Wagmi 内部用它来管理区块链请求的缓存、重试、过期刷新 |

## 这些库之间的关系（从上到下调用）

```
┌─────────────────────────────────────────────────┐
│  你写的 Next.js 页面组件                           │
│  （使用各种 Hooks 和 AppKit 组件）                  │
└───────────────────┬─────────────────────────────┘
                    │ 调用
                    ▼
┌─────────────────────────────────────────────────┐
│  @reown/appkit                                   │
│  提供 Hooks：useSendCalls, useGetCapabilities 等  │
│  提供 UI：<appkit-button> 连接按钮、弹窗           │
└───────────────────┬─────────────────────────────┘
                    │ 内部使用
                    ▼
┌─────────────────────────────────────────────────┐
│  wagmi + @reown/appkit-adapter-wagmi             │
│  管理钱包连接状态、封装以太坊操作为 React Hooks     │
└───────────────────┬─────────────────────────────┘
                    │ 内部使用
                    ▼
┌─────────────────────────────────────────────────┐
│  viem                                            │
│  底层工具：编码交易数据、解析合约 ABI、格式化地址    │
└───────────────────┬─────────────────────────────┘
                    │ 发送 JSON-RPC 请求
                    ▼
┌─────────────────────────────────────────────────┐
│  区块链节点（以太坊、Polygon 等）                   │
│  真正执行交易的地方                                │
└─────────────────────────────────────────────────┘
```

## 还需要什么外部账号？

| 名称 | 用途 | 如何获取 |
|------|------|---------|
| **Reown Dashboard 账号** | 获取 Project ID，AppKit 运行必须有这个 ID | 去 [dashboard.reown.com](https://dashboard.reown.com/) 注册 |

---

# 第三部分：三个核心方法详解

## 方法一：`wallet_getCapabilities` — 问问钱包"你行不行？"

### 它是干嘛的？

向用户的钱包发送一个查询请求，问它："你支持哪些高级功能？特别是，你支持原子批量交易吗？"

### 为什么需要这一步？

因为**不是所有钱包都支持智能账户和批量交易**。

- 嵌入式钱包用户（邮箱/社交登录）→ 有智能账户 → 通常支持
- MetaMask 用户 → 是 EOA → 不支持
- 其他钱包 → 不确定

所以你必须先问一下，再决定用哪种方式发送交易。

### 返回的 `atomic` 字段有三种值

**`supported`（完全支持）：**
- 意味着：钱包 100% 支持原子批量交易
- 你应该做什么：放心用 `wallet_sendCalls`，设 `atomicRequired: true`
- 用户体验：用户看到一个弹窗，确认一次就行

**`ready`（准备好了但需要升级）：**
- 意味着：钱包可以支持，但需要用户先同意升级
- 你应该做什么：可以用 `wallet_sendCalls`，钱包会自动弹窗让用户确认升级
- 用户体验：用户先看到升级提示，确认后再看到交易确认

**`unsupported`（不支持）：**
- 意味着：这个钱包不支持批量交易
- 你应该做什么：**不要用** `wallet_sendCalls`！回退到传统的 `eth_sendTransaction` 一笔一笔发
- 用户体验：和传统的逐笔交易一样，点一次发一笔

### 在代码里怎么用？

```tsx
import { useGetCapabilities } from "@reown/appkit/react";

function MyComponent() {
  // 这个 Hook 会在组件挂载后自动查询钱包能力
  const {
    data: capabilities,  // 查询结果，包含 atomic 等字段
    isLoading,           // 是否正在查询中（true/false）
    error,               // 如果查询出错，错误信息在这里
  } = useGetCapabilities();

  // 使用示例：
  if (isLoading) return <p>正在查询钱包能力...</p>;

  if (capabilities?.atomic === "supported") {
    // 可以使用批量交易
  } else if (capabilities?.atomic === "ready") {
    // 可以升级后使用
  } else {
    // 不支持，需要降级
  }
}
```

---

## 方法二：`wallet_sendCalls` — 打包发送多笔交易

### 它是干嘛的？

把你想执行的多笔交易**打包成一个请求**，一次性发给钱包。用户只需要确认一次，所有交易一起执行。

### 请求参数逐字段讲解

官方文档给的请求示例是这样的：

```json
{
  "from": "0xd46e8dd67c5d32be8058bb8eb970870f07244567",
  "chainId": "0x01",
  "atomicRequired": true,
  "calls": [
    {
      "to": "0xd46e8dd67c5d32be8058bb8eb970870f07244567",
      "value": "0x9184e72a",
      "data": "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675"
    },
    {
      "to": "0xd46e8dd67c5d32be8058bb8eb970870f07244567",
      "value": "0x182183",
      "data": "0xfbadbaf01"
    }
  ]
}
```

下面逐个字段解释：

**`from`（发送者地址）：**
> 就是当前登录用户的钱包地址。在使用 AppKit 的 Hook 时，你不需要手动填这个值，SDK 会自动获取当前连接用户的地址。

**`chainId`（链 ID）：**
> 指定在哪条区块链上执行交易。常见的链 ID：
> - `"0x01"` = 以太坊主网（十进制 1）
> - `"0x89"` = Polygon（十进制 137）
> - `"0xa4b1"` = Arbitrum One（十进制 42161）
>
> 使用 Hook 时也通常不需要手动填，AppKit 会用用户当前连接的网络。

**`atomicRequired`（是否要求原子执行）：**
> - 设为 `true`：要求所有交易要么全成功，要么全失败。如果钱包做不到原子执行，整个请求会被拒绝
> - 设为 `false`：不强制要求原子执行。钱包会尽力执行所有交易，但不保证全成功
>
> **怎么决定设 true 还是 false？**
> | 场景 | 该设什么 | 原因 |
> |------|---------|------|
> | DeFi 操作（授权 + 兑换） | `true` | 授权成功但兑换失败 = 白花 gas |
> | 批量空投/转账给多个人 | `false` | 某一笔失败不影响其他人 |
> | 有前后依赖的多步操作 | `true` | 保证数据一致性 |

**`calls`（交易数组）：**
> 一个数组，每个元素代表一笔独立的交易调用：
>
> - `to`：目标地址（收款地址或合约地址）
> - `value`：发送的 ETH 数量，用十六进制表示，单位是 Wei（1 ETH = 10^18 Wei）。如果只是调用合约函数不转 ETH，设为 `"0x0"`
> - `data`：调用数据。如果是纯 ETH 转账设为 `"0x"`；如果是调用合约函数，这里放 ABI 编码后的函数调用数据

### 返回值

调用成功后返回一个 `batchId`（字符串），这是这批交易的唯一标识。你要保存它，后面查询状态时要用。

### 在代码里怎么用？

```tsx
import { useSendCalls } from "@reown/appkit/react";
import { useState } from "react";

function MyComponent() {
  const [batchId, setBatchId] = useState<string | null>(null);

  const {
    sendCalls,    // 调用这个函数来发送批量交易
    isPending,    // 是否正在等待用户确认（钱包弹窗弹出中）
    error,        // 如果出错了，错误信息在这里
  } = useSendCalls();

  const handleSend = async () => {
    try {
      const result = await sendCalls({
        calls: [
          {
            to: "0x收款地址A" as `0x${string}`,
            value: BigInt(1000000000000000),   // 0.001 ETH
            data: "0x" as `0x${string}`,       // 纯转账，不调用合约
          },
          {
            to: "0x收款地址B" as `0x${string}`,
            value: BigInt(2000000000000000),   // 0.002 ETH
            data: "0x" as `0x${string}`,
          },
        ],
        atomicRequired: true,
      });

      // result 就是 batchId，保存下来
      setBatchId(result);
      console.log("批次ID:", result);
    } catch (err) {
      console.error("发送失败:", err);
    }
  };

  return (
    <button onClick={handleSend} disabled={isPending}>
      {isPending ? "等待钱包确认中..." : "发送批量交易"}
    </button>
  );
}
```

---

## 方法三：`wallet_getCallsStatus` — 查看交易结果

### 它是干嘛的？

用 `wallet_sendCalls` 返回的 `batchId` 去查询这批交易的执行结果。就像用快递单号查物流。

### 返回结果逐字段讲解

```json
{
  "chainId": "0x01",
  "id": "0x00000000...1527331",
  "status": 200,
  "atomic": true,
  "receipts": [
    {
      "logs": [
        {
          "address": "0xa922b54716264130634d6ff183747a8ead91a40b",
          "topics": ["0x5a2a907..."],
          "data": "0xabcd"
        }
      ],
      "status": "0x1",
      "blockHash": "0xf19bba...",
      "blockNumber": "0xabcd",
      "gasUsed": "0xdef",
      "transactionHash": "0x9b7bb8..."
    }
  ]
}
```

**`status`（整体状态）：**
> `200` = 全部执行完成了。其他值 = 可能还在执行中或出错了。

**`atomic`（实际是否原子执行）：**
> - `true` = 钱包确实以原子方式执行了（全部成功或全部失败）
> - `false` = 钱包逐笔执行的，有的可能成功有的可能失败
>
> 注意：这个值影响 `receipts` 的结构。`atomic: true` 时通常所有交易共享一个 receipt；`atomic: false` 时每笔交易各有一个 receipt。

**`receipts`（交易回执数组）：**
> 每个回执包含：
> - `status`：`"0x1"` = 成功，`"0x0"` = 失败
> - `transactionHash`：交易哈希（可以拿去 Etherscan 上查看详情）
> - `blockHash` / `blockNumber`：交易被打包进了哪个区块
> - `gasUsed`：这笔交易消耗了多少 gas
> - `logs`：智能合约发出的事件日志

### 在代码里怎么用？

```tsx
import { useGetCallsStatus } from "@reown/appkit/react";

function MyComponent() {
  const [batchId, setBatchId] = useState<string | null>(null);

  const {
    data: callsStatus,   // 查询到的状态数据
    isLoading,            // 是否正在查询中
  } = useGetCallsStatus({
    id: batchId ?? undefined,
    // 当 batchId 为 null 时传 undefined，Hook 就不会发起请求
    // 当 batchId 有值时才会去查询
  });

  // 使用查询结果
  if (callsStatus) {
    console.log("整体状态:", callsStatus.status);        // 200 = 完成
    console.log("是否原子执行:", callsStatus.atomic);     // true/false
    console.log("回执:", callsStatus.receipts);           // 每笔交易的详细结果
  }
}
```

---

# 第四部分：在 Next.js 中一步步实现（从零开始）

## Step 0：安装依赖包

在你的 Next.js 项目中运行：

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

每个包安装的原因在第二部分已经说明了。

---

## Step 1：获取 Project ID

1. 打开 [Reown Dashboard](https://dashboard.reown.com/)
2. 注册一个账号（或登录已有账号）
3. 点击"Create Project"创建一个新项目
4. 复制生成的 **Project ID**（一串字符）
5. 在你项目根目录创建或编辑 `.env.local` 文件：

```env
NEXT_PUBLIC_PROJECT_ID=你复制的ProjectID
```

**为什么需要这个？**
AppKit 需要通过 Reown 的云服务来工作（如 WalletConnect 中继、区块链 API 等）。Project ID 是你的身份标识，Reown 用它来识别请求来自你的 DApp。`NEXT_PUBLIC_` 前缀表示这个环境变量可以在客户端代码中访问。

---

## Step 2：创建 Wagmi 配置文件

**文件路径：** `config/index.tsx`（放在 `app` 目录**外面**）

```tsx
import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'

// ① 从环境变量读取 Project ID
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

// ② 如果没配置 Project ID 就直接报错，避免运行到后面才出问题
if (!projectId) {
  throw new Error('Project ID is not defined')
}

// ③ 定义你的 DApp 支持哪些区块链网络
//    用户连接后只能在这些网络上操作
export const networks = [mainnet, arbitrum]

// ④ 创建 Wagmi 适配器（这是 AppKit 和 Wagmi 之间的桥梁）
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
    // 为什么用 Cookie？因为 Next.js 有服务端渲染（SSR），
    // Cookie 可以在服务端和客户端之间共享状态。
    // 如果用 localStorage，服务端渲染时读不到，页面会闪烁。
  }),
  ssr: true,
  // 为什么设 true？告诉 Wagmi "我在 Next.js 环境中使用你"，
  // Wagmi 会延迟 hydration，避免服务端和客户端渲染结果不一致导致的报错。
  projectId,
  networks
})

// ⑤ 导出 Wagmi 配置对象（其他文件会用到它）
export const config = wagmiAdapter.wagmiConfig
```

**为什么这个文件要放在 `app` 目录外面？**
因为这个配置在服务端（`layout.tsx` 是 Server Component）和客户端（Context Provider 是 Client Component）都需要用。如果放在有 `'use client'` 指令的文件里，服务端就无法 import 它了。放在外面 = 两边都能用。

---

## Step 3：创建 Context Provider

**文件路径：** `context/index.tsx`（也放在 `app` 目录**外面**）

```tsx
'use client'
// ↑ 标记为客户端组件。为什么？因为下面的代码用到了：
//   - React Hooks（useEffect, useState 等，虽然这里没直接写）
//   - 浏览器 API（createAppKit 内部需要 DOM、WebSocket 等）
//   Next.js 的 Server Component 默认不能用这些，所以必须标记 'use client'

import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { mainnet, arbitrum } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// ① 创建 React Query 客户端
//    React Query 负责管理所有区块链请求的缓存、自动刷新、重试等
//    Wagmi 内部依赖它
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// ② 设置你的 DApp 元数据
//    这些信息会显示在用户的钱包中，让用户知道是哪个网站在请求连接
const metadata = {
  name: 'My Wallet DApp',                // 你的网站名称
  description: 'My Wallet DApp',          // 网站描述
  url: 'https://yourdomain.com',          // 网站域名（必须和实际域名匹配）
  icons: ['https://yourdomain.com/icon.png']  // 网站图标
}

// ③ 创建 AppKit 实例 —— 这是最核心的初始化步骤！
//    调用这个函数后，AppKit 就准备好了：
//    - 钱包连接弹窗可以弹出
//    - 所有的 Hooks 可以使用
//    - 智能账户功能自动激活
const modal = createAppKit({
  adapters: [wagmiAdapter],       // 使用 Wagmi 适配器
  projectId,                       // 你的 Project ID
  networks: [mainnet, arbitrum],   // 支持的网络
  defaultNetwork: mainnet,         // 默认连接到以太坊主网
  metadata: metadata,              // DApp 元数据
  features: {
    analytics: true                // 开启使用分析（可选）
  }
})

// ④ 创建 Context Provider 组件
//    这个组件会包裹整个应用，为所有子组件提供"钱包上下文"
function ContextProvider({
  children,   // 子组件（就是你的整个应用）
  cookies     // 从服务端传过来的 Cookie 字符串
}: {
  children: ReactNode
  cookies: string | null
}) {
  // ⑤ 从 Cookie 中恢复之前的钱包连接状态
  //    比如用户之前已经连接了钱包，刷新页面后不需要重新连接
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  )

  return (
    // ⑥ WagmiProvider：提供 Wagmi 上下文
    //    所有使用 Wagmi Hooks 的组件都必须在它内部
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}  // SSR 初始状态
    >
      {/* ⑦ QueryClientProvider：提供 React Query 上下文 */}
      {/*    Wagmi 内部的异步请求依赖它 */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
```

**这一步创建了什么？** 一个 Provider 组件，它像一个"外壳"，包裹住你的整个应用。包裹后，应用内任何组件都可以使用 AppKit 和 Wagmi 的 Hooks。

---

## Step 4：在 layout.tsx 中包裹应用

**文件路径：** `app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// ① 导入 Next.js 的 headers 函数（用于在服务端读取请求头）
import { headers } from 'next/headers'

// ② 导入我们刚创建的 ContextProvider
import ContextProvider from '@/context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'My Wallet DApp',
  description: 'Powered by Reown',
}

// ③ 这是 Next.js App Router 的根布局组件
//    注意它是 async 的，因为要在服务端读取 headers
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // ④ 在服务端获取请求中的 Cookie
  //    为什么在服务端读？因为 SSR 时需要知道用户之前是否已连接钱包
  const headersObj = await headers()
  const cookies = headersObj.get('cookie')

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ⑤ 用 ContextProvider 包裹整个应用 */}
        {/* 把 cookies 传进去，让 Provider 在 SSR 时能恢复状态 */}
        <ContextProvider cookies={cookies}>
          {children}
        </ContextProvider>
      </body>
    </html>
  )
}
```

**这一步做了什么？** 把 `ContextProvider` 放在了整个应用的最外层。这样无论用户访问哪个页面，都能使用钱包功能。

---

## Step 5：配置 next.config.js

在 `next.config.js` 中添加 webpack 配置：

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: config => {
    // 把这三个库标记为外部依赖
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  }
}

module.exports = nextConfig
```

**为什么需要这步？** AppKit 和 WalletConnect 依赖了一些 Node.js 专用的库。如果不把它们标记为 externals，Webpack 打包时会尝试把它们打进前端 bundle，导致编译报错。加上这个配置 = 告诉 Webpack "别管这几个库"。

---

## Step 6：创建智能账户交互页面

**文件路径：** `app/smart-account/page.tsx`

这是**完整的、可运行的**页面代码，包含了三个核心方法的完整使用：

```tsx
"use client";
// ↑ 必须标记为客户端组件，因为用到了 React Hooks 和用户交互

// ==========================================
// 导入所需的 Hooks
// ==========================================
import { useAppKitAccount } from "@reown/appkit/react";
// useAppKitAccount：获取当前连接的钱包地址和连接状态

import {
  useGetCapabilities,    // 对应 wallet_getCapabilities
  useSendCalls,          // 对应 wallet_sendCalls
  useGetCallsStatus,     // 对应 wallet_getCallsStatus
} from "@reown/appkit/react";

import { useSendTransaction } from "wagmi";
// useSendTransaction：传统的单笔交易发送（降级方案用）

import { useState } from "react";

export default function SmartAccountPage() {
  // ==========================================
  // 基础状态
  // ==========================================
  const { address, isConnected } = useAppKitAccount();
  // address:     用户的钱包地址，如 "0x1234...abcd"
  // isConnected: 用户是否已连接钱包

  const [batchId, setBatchId] = useState<string | null>(null);
  // 保存批量交易返回的 batchId，后面查状态用

  // ==========================================
  // 核心 Hook 1：查询钱包能力
  // ==========================================
  const {
    data: capabilities,
    isLoading: isCapLoading,
    error: capError,
  } = useGetCapabilities();
  // 这个 Hook 在组件挂载时自动调用 wallet_getCapabilities
  // 结果存在 capabilities 里
  // capabilities?.atomic 就是我们关心的"是否支持原子批量交易"

  const atomicStatus = capabilities?.atomic;
  const isAtomicSupported = atomicStatus === "supported";
  const isAtomicReady = atomicStatus === "ready";
  const isAtomicUnsupported = atomicStatus === "unsupported" || !atomicStatus;

  // ==========================================
  // 核心 Hook 2：发送批量交易
  // ==========================================
  const {
    sendCalls,
    isPending: isSending,
    error: sendError,
  } = useSendCalls();
  // sendCalls：调用它来发起批量交易
  // isPending：钱包弹窗弹出后，等待用户确认期间为 true

  // ==========================================
  // 核心 Hook 3：查询交易状态
  // ==========================================
  const {
    data: callsStatus,
    isLoading: isStatusLoading,
  } = useGetCallsStatus({
    id: batchId ?? undefined,
    // batchId 为 null 时传 undefined，Hook 不会发起请求
    // batchId 有值时会自动去查询
  });

  // ==========================================
  // 降级方案：传统单笔交易
  // ==========================================
  const { sendTransaction } = useSendTransaction();
  // 当钱包不支持批量交易时用这个

  // ==========================================
  // 处理函数：发送批量交易
  // ==========================================
  const handleSendBatch = async () => {
    if (!address) return;

    try {
      const result = await sendCalls({
        calls: [
          {
            to: "0x0000000000000000000000000000000000000001" as `0x${string}`,
            // ↑ 替换为真实的目标地址
            value: BigInt(1000000000000000), // 0.001 ETH
            data: "0x" as `0x${string}`,    // 纯 ETH 转账
          },
          {
            to: "0x0000000000000000000000000000000000000002" as `0x${string}`,
            value: BigInt(2000000000000000), // 0.002 ETH
            data: "0x" as `0x${string}`,
          },
        ],
        atomicRequired: isAtomicSupported,
      });

      setBatchId(result);
    } catch (error) {
      console.error("批量交易失败:", error);
    }
  };

  // ==========================================
  // 处理函数：降级方案（传统单笔交易）
  // ==========================================
  const handleSendTraditional = async () => {
    try {
      await sendTransaction({
        to: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        value: BigInt(1000000000000000),
      });
      // 注意：这里用户每笔都需要确认一次
    } catch (error) {
      console.error("交易失败:", error);
    }
  };

  // ==========================================
  // 渲染 UI
  // ==========================================

  if (!isConnected) {
    return (
      <div style={{ padding: 20 }}>
        <h1>智能账户批量交易演示</h1>
        <p>请先连接钱包（使用邮箱或社交登录以获得智能账户）</p>
        {/* appkit-button 是 AppKit 提供的 Web Component，不需要 import */}
        {/* 点击后会弹出钱包连接弹窗 */}
        <appkit-button />
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h1>智能账户批量交易演示</h1>
      <p><strong>当前地址：</strong>{address}</p>

      <hr style={{ margin: "20px 0" }} />

      {/* ========== 第 1 步：显示钱包能力 ========== */}
      <h2>Step 1：查询钱包能力</h2>
      <p style={{ color: "#666" }}>
        调用 wallet_getCapabilities，检查钱包是否支持原子批量交易
      </p>
      {isCapLoading ? (
        <p>正在查询钱包能力...</p>
      ) : capError ? (
        <p style={{ color: "red" }}>查询失败: {capError.message}</p>
      ) : (
        <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
          <p>
            <strong>原子批量交易：</strong>
            {isAtomicSupported && "✅ 完全支持 — 可以安全使用批量交易"}
            {isAtomicReady && "⚠️ 可升级 — 用户确认升级后可使用"}
            {isAtomicUnsupported && "❌ 不支持 — 需使用传统的逐笔发送方式"}
          </p>
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />

      {/* ========== 第 2 步：发送交易 ========== */}
      <h2>Step 2：发送交易</h2>
      {isAtomicUnsupported ? (
        <div>
          <p style={{ color: "#666" }}>
            当前钱包不支持批量交易，使用传统方式（每笔需单独确认）
          </p>
          <button onClick={handleSendTraditional}>
            传统方式：发送 0.001 ETH
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: "#666" }}>
            调用 wallet_sendCalls，打包发送两笔交易（只需确认一次）
          </p>
          <button onClick={handleSendBatch} disabled={isSending}>
            {isSending ? "等待钱包确认..." : "批量发送（0.001 + 0.002 ETH）"}
          </button>
          {sendError && (
            <p style={{ color: "red" }}>发送错误: {sendError.message}</p>
          )}
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />

      {/* ========== 第 3 步：查询交易状态 ========== */}
      <h2>Step 3：查询交易状态</h2>
      <p style={{ color: "#666" }}>
        调用 wallet_getCallsStatus，用 batchId 查询执行结果
      </p>
      {!batchId ? (
        <p>还没有发送批量交易，发送后这里会显示结果</p>
      ) : isStatusLoading ? (
        <p>正在查询交易状态...</p>
      ) : callsStatus ? (
        <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
          <p><strong>批次 ID：</strong>{batchId}</p>
          <p><strong>状态码：</strong>{callsStatus.status === 200 ? "✅ 已完成" : callsStatus.status}</p>
          <p><strong>原子执行：</strong>{callsStatus.atomic ? "是（全部成功或全部失败）" : "否（逐笔执行）"}</p>
          <p><strong>回执数量：</strong>{callsStatus.receipts?.length ?? 0}</p>

          {callsStatus.receipts?.map((receipt: any, i: number) => (
            <div key={i} style={{ marginTop: 10, paddingLeft: 16, borderLeft: "3px solid #ccc" }}>
              <p><strong>回执 #{i + 1}</strong></p>
              <p>状态: {receipt.status === "0x1" ? "✅ 成功" : "❌ 失败"}</p>
              <p>交易哈希: {receipt.transactionHash}</p>
              <p>区块号: {receipt.blockNumber}</p>
              <p>Gas 消耗: {receipt.gasUsed}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>查询中...</p>
      )}
    </div>
  );
}
```

---

# 第五部分：完整流程图

```
┌─────────────────────────────────────────────────────────┐
│                    用户访问你的 DApp                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  用户点击 <appkit-button />，弹出连接弹窗                  │
│                                                         │
│  选择登录方式：                                           │
│  • 邮箱登录 → 创建嵌入式钱包 → 自动开通智能账户             │
│  • Google 登录 → 同上                                    │
│  • MetaMask → 使用自己的 EOA → 没有智能账户                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  useGetCapabilities()                                    │
│  "钱包，你支持原子批量交易吗？"                             │
└───────┬──────────────┬──────────────┬───────────────────┘
        │              │              │
        ▼              ▼              ▼
   "supported"     "ready"     "unsupported"
   完全支持         可升级        不支持
        │              │              │
        │              │              ▼
        │              │    ┌──────────────────────┐
        │              │    │  降级方案：             │
        │              │    │  用 useSendTransaction │
        │              │    │  一笔一笔发送           │
        │              │    └──────────────────────┘
        │              │
        ▼              ▼
┌─────────────────────────────────────────────────────────┐
│  useSendCalls()                                          │
│                                                         │
│  sendCalls({                                            │
│    calls: [交易1, 交易2, ...],                            │
│    atomicRequired: true/false                            │
│  })                                                     │
│                                                         │
│  → 用户在钱包弹窗中确认（只需一次）                         │
│  → 返回 batchId                                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  useGetCallsStatus({ id: batchId })                      │
│                                                         │
│  返回：                                                  │
│  • status: 200（完成）                                    │
│  • atomic: true/false                                    │
│  • receipts: [{ status, transactionHash, ... }]          │
└─────────────────────────────────────────────────────────┘
```

---

# 第六部分：常见问题 FAQ

### Q1: 我用 MetaMask 连接能用智能账户吗？

**不能。** 智能账户只对嵌入式钱包用户（邮箱/社交登录）可用。MetaMask 用户使用的是 EOA，`useGetCapabilities` 会返回 `unsupported`。你的代码需要做降级处理。

### Q2: 智能账户需要额外付费吗？

**第一次交易需要。** 智能账户的本质是智能合约，首次使用时需要部署到链上，部署费用附加在第一笔交易中。之后的 gas 费和普通交易差不多。

### Q3: 什么是预计算地址（Counterfactual Address）？

智能合约在部署前，系统可以数学计算出它**未来会在哪个地址**。这个地址就是预计算地址。合约还没部署，但这个地址已经可以接收资产了（就像你已经知道新房门牌号，虽然房子还没盖好，但快递已经可以寄到那个地址了）。

### Q4: 智能账户可以导出吗？

**不能导出智能账户本身**（它是链上合约，没有私钥/助记词）。但它底层的 EOA 签名者可以导出。

### Q5: 智能账户里的资金可以全部取出吗？

**可以。** 你可以随时提取智能账户中的全部资金。

### Q6: 如何验证智能账户的签名？

使用 viem 库的 `verifyMessage` 函数。智能账户发出的签名遵循 ERC-1271（已部署）和 ERC-6492（未部署）标准。

### Q7: 支持哪些区块链网络？

支持多条 EVM 网络，完整列表见 [Pimlico 支持的链](https://docs.pimlico.io/infra/platform/supported-chains)。

### Q8: `atomicRequired` 到底该设 true 还是 false？

| 场景 | 设为 | 原因 |
|------|------|------|
| DeFi 兑换（授权 + 交易） | `true` | 授权成功但交易失败 = 白花 gas |
| 批量空投/转账 | `false` | 某笔失败不影响其他 |
| 步骤之间有依赖 | `true` | 保证一致性 |

### Q9: 如果我的用户可能用 MetaMask 也可能用嵌入式钱包怎么办？

写降级兼容代码。先用 `useGetCapabilities` 查能力，根据结果选方案：

```tsx
const { data: capabilities } = useGetCapabilities();

if (capabilities?.atomic === "unsupported" || !capabilities) {
  // 传统方式：useSendTransaction 逐笔发
} else {
  // 批量方式：useSendCalls 打包发
}
```

### Q10: 什么是账户命名？

通过 ENS 给智能账户起别名，如 `alice.reown.id`。别人转账给你时不用复制粘贴 `0x...` 地址，直接输名字就行。这个名字跨网络通用（以太坊、Polygon、Arbitrum 等都能用）。

---

*文档来源：*
- *[Smart Accounts](https://docs.reown.com/appkit/next/core/smart-accounts)*
- *[Embedded Wallets Interactions (EIP-5792)](https://docs.reown.com/appkit/next/core/smart-accounts-interaction)*
- *[AppKit Next.js Installation](https://docs.reown.com/appkit/next/core/installation)*
