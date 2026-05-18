import { Counterparty } from "@/lib/types"
import { formatAddress, formatCurrency } from "@/lib/display"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function CounterpartyTable({ counterparties }: { counterparties: Counterparty[] }) {
  if (!counterparties || counterparties.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20">
        No counterparties detected in recent transactions.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Volume (USD)</TableHead>
            <TableHead className="text-right">Txs</TableHead>
            <TableHead>Risk Indicators</TableHead>
            <TableHead>Label</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {counterparties.map((cp) => (
            <TableRow key={cp.address}>
              <TableCell className="font-mono text-xs">
                {formatAddress(cp.address)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(cp.total_volume_usd)}
              </TableCell>
              <TableCell className="text-right">
                {cp.tx_count}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {cp.is_sanctioned && (
                    <Badge variant="destructive" className="text-[10px]">SANCTIONED</Badge>
                  )}
                  {cp.is_mixer && (
                    <Badge variant="outline" className="text-orange-500 border-orange-500 bg-orange-500/10 text-[10px]">
                      MIXER
                    </Badge>
                  )}
                  {!cp.is_sanctioned && !cp.is_mixer && (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {cp.label || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
