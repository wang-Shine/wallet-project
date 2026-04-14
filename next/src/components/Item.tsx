import {
    Card,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { useTransactionStore } from '@/store/transactionStore'
export default function ItemBody() {
    const list = useTransactionStore(state => state.list)
    return (
        <>
            {
                list.map(item => (
                    <Card className="mt-2">
                        <CardHeader>
                            <CardTitle>type: {item.type}</CardTitle>
                            <CardTitle>state: {item.status}</CardTitle>
                            <CardTitle>hash: {item.hash}</CardTitle>
                            <CardTitle>from: {item.from}</CardTitle>
                            <CardTitle>to: {item.to}</CardTitle>
                            <CardTitle>amount: {item.amount}</CardTitle>
                            <CardTitle>symbol: {item.symbol}</CardTitle>
                            <CardTitle>newwork: {item.network}</CardTitle>
                        </CardHeader>
                    </Card>
                ))
            }
        </>
    )
}