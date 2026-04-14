import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSendTransaction, useWriteContract, useWaitForTransactionReceipt, useConnection } from 'wagmi' 
import { Field, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { isAddress, parseEther } from 'viem'
import { useEffect, useState } from "react"
import { TOKEN_ADDRESS, TOKEN_ABI } from '@/config/contracts'
import DialogBody from '@/components/Dialog'
import LoadingBody from '@/components/Loading'
import { useTransactionStore } from '@/store/transactionStore'

export default function Send() {
    const [selectValue, setSelectValue] = useState("")
    const [addressValue, setAddressValue] = useState("")
    const [amountValue, setAmountValue] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const sendTransaction = useSendTransaction()
    const writeContract = useWriteContract()
    const { address, chain } = useConnection()
    const setHistory = useTransactionStore(state => state.setHistory)

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: sendTransaction.data || writeContract.data,
    })
    const isLoading = sendTransaction.isPending || writeContract.isPending || isConfirming
    
    const transferHandle = async () => {
        if (!selectValue) return toast('Please select a token')
        if (!isAddress(addressValue)) return toast.error('Invalid address')
        const amount = Number(amountValue)
        if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount')
        try {
            if(selectValue == 'ETH') {
                await sendTransaction.mutateAsync({
                    to: addressValue,
                    value: parseEther(amountValue),
                })
            } else {
                await writeContract.mutateAsync({
                    abi: TOKEN_ABI,
                    address: TOKEN_ADDRESS,
                    functionName: 'transfer',
                    args: [addressValue, parseEther(amountValue)],
                })
            }
        } catch (error) {
            console.error('Transfer failed:', error)
        }
    }

    useEffect(() => {
        if(isSuccess) {
            setDialogOpen(true)
            if(!writeContract.data || !address || !selectValue || !chain) return
            setHistory({
                id: new Date().getTime().toString(),
                type: selectValue === 'token' ? 'token' : 'ETH',
                status: 'success',
                hash: sendTransaction.data || writeContract.data,
                from: address,
                to: addressValue,
                amount: amountValue,
                symbol: selectValue,
                network: chain.id
            })
        }
    }, [isSuccess])

    return (
        <div className="mt-10">
            {isLoading && <LoadingBody isPending={sendTransaction.isPending || writeContract.isPending} />}
            <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Select a Tokens" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>options</SelectLabel>
                        <SelectItem value="token">Token</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            <Separator className="my-6" />
            <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input id="address" placeholder="address" value={addressValue} onChange={(e) => setAddressValue(e.target.value)} />
                <FieldLabel htmlFor="amount">amount</FieldLabel>
                <Input id="amount" placeholder="amount" value={amountValue} onChange={(e) => setAmountValue(e.target.value)} />
            </Field>
            <Button variant="outline" className="mt-2" onClick={transferHandle}>Transfer</Button>
            <DialogBody type="transfer" tokenSymbol={selectValue} address={addressValue} amount={amountValue} hash={sendTransaction.data || writeContract.data} open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    )
}