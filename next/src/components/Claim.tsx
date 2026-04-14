import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Field, FieldLabel } from "@/components/ui/field"
import { useConnection, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from "react"
import { TOKEN_ADDRESS, TOKEN_ABI } from '@/config/contracts'
import DialogBody from '@/components/Dialog'
import LoadingBody from '@/components/Loading'
import { useTransactionStore } from '@/store/transactionStore'

const INTERVAL = 5 * 60

export default function Claim() {
    const [remaining, setRemaining] = useState(0)
    const [dialogOpen, setDialogOpen] = useState(false)
    const setHistory = useTransactionStore(state => state.setHistory)
    
    const { address, chain } = useConnection()
    const writeContract = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: writeContract.data,
    })

    const { data: lastClaimTime, refetch } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'lastClaimTime',
        args: address ? [address] : undefined
    })

    const calcRemaining = () => {
        if (!lastClaimTime) return 0
        const nextClaimTime = Number(lastClaimTime) + INTERVAL
        const now = Math.floor(Date.now() / 1000)
        const remainingSeconds = nextClaimTime - now
        return Math.max(0, remainingSeconds)
    }

    useEffect(() => {
        setRemaining(calcRemaining())
        const timer = setInterval(() => {
            setRemaining(calcRemaining())
            if (calcRemaining() <= 0) clearInterval(timer)
        }, 1000)
        return () => clearInterval(timer)
    }, [calcRemaining])

    useEffect(() => {
        if (isSuccess) {
            if(!writeContract.data || !address || !tokenSymbol || !chain) return
            setDialogOpen(true)
            refetch()
            setHistory({
                id: new Date().getTime().toString(),
                type: 'claim',
                status: 'success',
                hash: writeContract.data,
                from: address,
                to: '',
                amount: '100',
                symbol: tokenSymbol,
                network: chain.id
            })
        }
    }, [isSuccess])

    const { data: tokenSymbol } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'symbol'
    })

    const isLoading = writeContract.isPending || isConfirming
    const isCooldown = remaining > 0
    const progress = isCooldown ? Math.round(((INTERVAL - remaining) / INTERVAL) * 100) : 100
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60

    const claimHandle = async () => {
        try {
            await writeContract.mutateAsync({
                abi: TOKEN_ABI,
                address: TOKEN_ADDRESS,
                functionName: 'claim'
            })
        } catch (error) {
            console.error('Claim failed:', error)
        }
    }

    return (
        <>
            {isLoading && <LoadingBody isPending={writeContract.isPending} />}
            <div className="mt-10">
                <Field className="w-full max-w-sm">
                    <FieldLabel htmlFor="progress-upload">
                        <span>Until the next claim</span>
                        <span className="ml-auto">
                            {isCooldown ? `${minutes}:${String(seconds).padStart(2, '0')}` : 'Ready'}
                        </span>
                    </FieldLabel>
                    <Progress value={progress} className="mb-4" />
                </Field>
                <Button variant="outline" onClick={claimHandle} disabled={isLoading || isCooldown}>
                    {isLoading ? <Spinner data-icon="inline-start" /> : isCooldown ? `Wait ${minutes}:${String(seconds).padStart(2, '0')}` : 'Claim'}
                </Button>
            </div>
            <DialogBody type="claim" tokenSymbol={tokenSymbol} address={address} hash={writeContract.data} open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
    )
}