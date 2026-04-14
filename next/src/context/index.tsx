'use client'
import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { mainnet, sepolia } from '@reown/appkit/networks'
import { ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

const queryClient = new QueryClient()

const metadata = {
    name: 'wallet-project',
    description: 'ERC20 Wallet',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003',
    icons: []
}

createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [mainnet, sepolia],
    defaultNetwork: sepolia,
    metadata,
    features: {
        analytics: true,
    },
    themeMode: 'light'
})

export default function ContextProvider({ children, cookies }: { children: ReactNode, cookies: string | null }) {
    const initialState = cookieToInitialState(
        wagmiAdapter.wagmiConfig as Config,
        cookies
      );
    
      return (
        <WagmiProvider
          config={wagmiAdapter.wagmiConfig as Config}
          initialState={initialState}
        >
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
      );
}