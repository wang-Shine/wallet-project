import { useConnection, useBalance, useReadContract } from 'wagmi'
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card"
import { TOKEN_ADDRESS, TOKEN_ABI } from '@/config/contracts'

export default function WalletInfo() {
    const { address, connector } = useConnection()
    const { data: ethBalance } = useBalance({ address })

    const { data: tokenBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined
    })
    return (
        <Card>
            <CardHeader>
                <div className='flex items-center'>
                    <img src={connector?.icon || '/default-wallet.png'} alt={connector?.name || 'wallet'} className='w-6 h-6 mr-2' />
                    <div className='text-xl font-bold'>
                        {connector?.name || 'wallet'}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className='flex'>
                    <span className='font-bold'>address：</span>
                    <p>{address}</p>
                </div>
                <div className='flex'>
                    <span className='font-bold'>ETH Balance：</span>
                    <p>{ethBalance?.value}</p>
                </div>
                <div className='flex'>
                    <span className='font-bold'>Token Balance：</span>
                    <p>{tokenBalance}</p>
                </div>
            </CardContent>
        </Card>
    )
}