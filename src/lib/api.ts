export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "player";
  donationTier: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const baseUrl = typeof window === "undefined"
      ? `${(process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "")}/api`
      : (process.env.NEXT_PUBLIC_API_URL || "/api").trim().replace(/\/+$/, "");
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Cannot reach the server. Make sure the API is running and try again.");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) throw new ApiError(response.status, body.error?.message ?? "Something went wrong. Please try again.");
  return body.data as T;
}
