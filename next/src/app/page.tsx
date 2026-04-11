"use client"
import { AppKitButton } from '@reown/appkit/react'
import WalletInfo from '@/components/WalletInfo'
import Claim from '@/components/Claim'
import Send from '@/components/Send'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function Home() {

  return (
    <div className="min-h-screen bg-white">
      <div className='flex justify-between items-center px-10 py-6 border-b-1'>
        <div className='text-2xl font-semibold'>Wallet</div>
        <AppKitButton />
      </div>
      <div className='w-1/2 m-auto mt-6'>
        <WalletInfo />
      </div>
      <div className='w-1/2 m-auto mt-6'>
        <Tabs defaultValue='claim'>
          <TabsList>
            <TabsTrigger value="claim">Claim Token</TabsTrigger>
            <TabsTrigger value='send'>Send Token</TabsTrigger>
          </TabsList>
          <TabsContent value='claim'>
            <Claim />
          </TabsContent>
          <TabsContent value='send'>
            <Send />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}