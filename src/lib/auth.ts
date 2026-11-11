"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";

const sessionKey = ["auth", "session"] as const;

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: () => api<{ user: User }>("/auth/me") });
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
