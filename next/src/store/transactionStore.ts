import { create } from "zustand"
import { persist } from 'zustand/middleware'

type TransactionDetail = {
    id: string,
    type: 'claim' | 'token' | 'ETH',
    status: 'pending' | 'success' | 'failed',
    hash: string,
    from: string,
    to: string,
    amount: string,
    symbol: string,
    network: number
}

type TransactionStore = {
    list: TransactionDetail[]
    setHistory: (transaction: TransactionDetail) => void
}

const MAX_NUMBER = 10

export const useTransactionStore = create<TransactionStore>()(
    persist(
        (set, get) => ({
            list: [],
            setHistory: (transaction: TransactionDetail) => {
                set(state => ({
                    list: [transaction, ...state.list].slice(0, MAX_NUMBER)
                }))
            }
        }), {
            name: 'transferHistory'
        }
    )
)