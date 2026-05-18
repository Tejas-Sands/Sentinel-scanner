export const TIER_COLORS = {
  LOW: "text-green-500",
  MEDIUM: "text-yellow-500",
  HIGH: "text-orange-500",
  CRITICAL: "text-red-500",
}

export const TIER_BG_COLORS = {
  LOW: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
}

export const TIER_BG_LIGHT_COLORS = {
  LOW: "bg-green-500/10",
  MEDIUM: "bg-yellow-500/10",
  HIGH: "bg-orange-500/10",
  CRITICAL: "bg-red-500/10",
}

export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return "N/A"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(isoString))
}
