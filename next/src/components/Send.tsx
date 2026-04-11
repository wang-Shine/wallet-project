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
export default function Send() {
    return (
        <div className="mt-10">
            <Select>
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
            <Input id="address" placeholder="address" className="mt-4" />
            <Button variant="outline" className="mt-2">Transfer</Button>
        </div>
    )
}