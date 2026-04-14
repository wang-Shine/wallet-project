import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogFooter,
    DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CopyIcon } from "lucide-react"
export default function DialogBody({type, tokenSymbol, address, amount, hash, open, onOpenChange}: {type: "claim"| "transfer", tokenSymbol?: string, address?: string, amount?: string,hash?: string, open: boolean, onOpenChange: (open: boolean) => void}) {

    const copyHandle = () => {
        if(hash) {
            navigator.clipboard.writeText(hash)
            toast("copy success!")
        }
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                {
                    type === 'transfer' ? 
                    (
                        <DialogHeader className="items-center text-center">
                            <DialogTitle className="text-lg">Transfer Success</DialogTitle>
                            <DialogDescription>
                                Successfully transferred <span className="font-semibold text-foreground">{amount} {tokenSymbol}</span>
                            </DialogDescription>
                        </DialogHeader>
                    ) : (
                        <DialogHeader className="items-center text-center">
                            <DialogTitle className="text-lg">Claim Success</DialogTitle>
                            <DialogDescription>
                                Successfully claimed <span className="font-semibold text-foreground">100 {tokenSymbol}</span>
                            </DialogDescription>
                        </DialogHeader>
                    )
                }
                <div className="space-y-3">
                    <div className="space-y-1">
                        <p className="">Address</p>
                        <p className="px-3 py-2 text-xs bg-gray-100 break-all">{address}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="">Hash</p>
                        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                            <p className="flex-1 bg-gray-100 text-xs break-all">{hash}</p>
                            <Button variant="ghost" size="icon-sm" onClick={copyHandle} className="shrink-0">
                                <CopyIcon className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter showCloseButton />
            </DialogContent>
        </Dialog>
    )
}