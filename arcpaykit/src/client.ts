export class ArcPayClient {
  constructor(
    private apiKey: string,
    private baseUrl = "https://pay.arcpaykit.com"
  ) {}

  async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }
}

