import { useConnection, useBalance, useReadContract } from 'wagmi'
import { formatEther } from "viem";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card"
import { TOKEN_ADDRESS, TOKEN_ABI } from '@/config/contracts'

export default function WalletInfo() {
    const { address, connector, chain } = useConnection()
    const { data: ethBalance } = useBalance({ address })

    const { data: tokenBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined
    })
    const { data: tokenSymbol } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'symbol'
    })
    return (
        <>
            {
                connector ? (
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
                                <span className='font-bold'>{chain?.name}ETH Balance：</span>
                                <p>{ethBalance ? Number(formatEther(ethBalance.value)).toFixed(3) + 'ETH' : '0.0ETH'}</p>
                            </div>
                            <div className='flex'>
                                <span className='font-bold'>{tokenSymbol} Balance：</span>
                                <p>{tokenBalance ? Number(formatEther(tokenBalance)).toFixed(3) + tokenSymbol : '0.0'+tokenSymbol}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <div className='text-center font-bold'>
                                Please connect wallet
                            </div>
                        </CardHeader>
                    </Card>
                )
            }
        </>
    )
}