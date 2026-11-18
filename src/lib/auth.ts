"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";

const sessionKey = ["auth", "session"] as const;

export function useRegistrationCode() {
  return useMutation({
    mutationFn: (email: string) => api<{ message: string; expiresIn: number }>("/auth/register/code", { method: "POST", body: JSON.stringify({ email }) }),
  });
}

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: () => api<{ user: User }>("/auth/me"), refetchInterval: 30000 });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    onSuccess: async (session) => {
      await client.cancelQueries({ queryKey: sessionKey });
      client.setQueryData(sessionKey, session);
    },
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await client.cancelQueries();
      client.clear();
    },
  });
}

export function useRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password: string; confirmPassword: string; email: string; code: string }) =>
      api<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(credentials) }),
    onSuccess: async (session) => {
      await client.cancelQueries();
      client.clear();
      client.setQueryData(sessionKey, session);
    },
  });
}
