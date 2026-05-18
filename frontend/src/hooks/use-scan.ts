import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ScanResponse } from "@/lib/types"

export function useScan() {
  return useMutation<ScanResponse, Error, string>({
    mutationFn: (address: string) => api.scanAddress(address),
  })
}

export function useGenerateReport() {
  return useMutation<string, Error, string>({
    mutationFn: (scanId: string) => api.generateReport(scanId),
  })
}
