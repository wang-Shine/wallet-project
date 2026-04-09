"use client"
import { AppKitButton } from '@reown/appkit/react'
import WalletInfo from '@/components/WalletInfo'

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
    </div>
  )
}