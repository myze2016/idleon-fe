export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "player";
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? (typeof window === "undefined" ? "http://localhost:8020/api" : `${window.location.protocol}//${window.location.hostname}:8020/api`);
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("Cannot reach the server. Make sure the API is running and try again.");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) throw new ApiError(response.status, body.error?.message ?? "Something went wrong. Please try again.");
  return body.data as T;
}
