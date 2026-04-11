import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogFooter,
    DialogTitle
  } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Field, FieldLabel } from "@/components/ui/field"
import { CopyIcon } from "lucide-react"
import { useConnection, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from "react"
import { TOKEN_ADDRESS, TOKEN_ABI } from '@/config/contracts'

const INTERVAL = 5 * 60

export default function Claim() {
    const [remaining, setRemaining] = useState(0)
    const [dialogOpen, setDialogOpen] = useState(false)
    const { address } = useConnection()
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
            setDialogOpen(true)
            refetch()
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
                functionName: 'claim',
                args: []
            })
        } catch (error) {
            console.error('Claim failed:', error)
        }
    }
    const copyHandle = () => {
        if(writeContract.data) {
            navigator.clipboard.writeText(writeContract.data)
            toast("copy success!")
        }
        
    }

    return (
        <>
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg">
                        <Spinner className="size-8" />
                        <span className="text-sm text-gray-600">
                            {writeContract.isPending ? '等待钱包确认...' : '交易确认中...'}
                        </span>
                    </div>
                </div>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader className="items-center text-center">
                        <DialogTitle className="text-lg">Claim Success</DialogTitle>
                        <DialogDescription>
                            Successfully claimed <span className="font-semibold text-foreground">100 {tokenSymbol}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <Separator />
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="">Address</p>
                            <p className="px-3 py-2 text-xs bg-gray-100 break-all">{address}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="">Hash</p>
                            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                                <p className="flex-1 bg-gray-100 text-xs break-all">{writeContract.data}</p>
                                <Button variant="ghost" size="icon-sm" onClick={copyHandle} className="shrink-0">
                                    <CopyIcon className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter showCloseButton />
                </DialogContent>
            </Dialog>
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
        </>
    )
}