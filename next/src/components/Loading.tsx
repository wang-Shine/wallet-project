
export default function LoadingBody({isPending}: {isPending: boolean}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg">
                <span className="text-sm text-gray-600">
                    {isPending ? '等待钱包确认...' : '交易确认中...'}
                </span>
            </div>
        </div>
    )
}