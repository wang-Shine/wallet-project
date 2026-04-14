
export default function LoadingBody({isPending}: {isPending: boolean}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg">
                <span className="text-sm text-gray-600">
                    {isPending ? 'Waiting for wallet confirmation...' : 'Confirming transaction...'}
                </span>
            </div>
        </div>
    )
}