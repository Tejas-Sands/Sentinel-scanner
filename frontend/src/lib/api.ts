import { ScanResponse, User } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
const BASE_URL = API_URL.split('/api/v1')[0]

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    
    // Quick local storage check for token
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("sentinel_token")
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }
    
    return headers
  }

  async scanAddress(address: string, chain = "ethereum"): Promise<ScanResponse> {
    const res = await fetch(`${API_URL}/scan`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ address, chain }),
    })
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.detail?.message || error.detail || "Failed to scan address")
    }
    
    return res.json()
  }

  async getScan(scan_id: string): Promise<ScanResponse> {
    const res = await fetch(`${API_URL}/scan/${scan_id}`, {
        headers: this.getHeaders()
    })
    
    if (!res.ok) {
      throw new Error("Scan not found")
    }
    
    return res.json()
  }

  async generateReport(scanId: string): Promise<string> {
    const res = await fetch(`${API_URL}/reports/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ scan_id: scanId }),
    })
    
    if (!res.ok) {
      throw new Error("Failed to generate report")
    }
    
    const data = await res.json()
    // Prepend API base URL since backend returns relative path
    return `${BASE_URL}${data.download_url}`
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_URL}/user/me`, {
      headers: this.getHeaders(),
    })
    
    if (!res.ok) {
      throw new Error("Not authenticated")
    }
    
    return res.json()
  }

  async getUserScans(limit = 20, offset = 0): Promise<{ scans: ScanResponse[]; total: number }> {
    const res = await fetch(`${API_URL}/user/scans?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders(),
    })
    
    if (!res.ok) {
      throw new Error("Failed to fetch user scans")
    }
    
    return res.json()
  }

  // --- Auth Methods ---

  async googleLogin(idToken: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    })
    if (!res.ok) throw new Error("Google login failed")
    const data = await res.json()
    localStorage.setItem("sentinel_token", data.token)
    return data
  }

  async getMetamaskNonce(address: string): Promise<{ address: string; message: string }> {
    const res = await fetch(`${API_URL}/auth/metamask/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
    if (!res.ok) throw new Error("Failed to get nonce")
    return res.json()
  }

  async metamaskLogin(address: string, signature: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_URL}/auth/metamask/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, signature }),
    })
    if (!res.ok) throw new Error("Metamask login failed")
    const data = await res.json()
    localStorage.setItem("sentinel_token", data.token)
    return data
  }

  logout() {
    localStorage.removeItem("sentinel_token")
    window.location.reload()
  }
}

export const api = new ApiClient()
