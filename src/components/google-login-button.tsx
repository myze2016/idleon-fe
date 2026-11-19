"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";

const errors: Record<string, string> = {
  unavailable: "Google sign-in is not configured yet. Please use your username and password.",
  failed: "Google sign-in was cancelled or could not be completed. Please try again.",
  existing_account: "This email already has an account. Sign in with your username and password.",
};

export function GoogleLoginButton({ disabled }: { disabled: boolean }) {
  const params = useSearchParams();
  const message = errors[params.get("googleError") ?? ""];
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/+$/, "");
  return <div className="mt-5 space-y-3">
    <div className="flex items-center gap-3 text-xs text-[#71583c]"><span className="h-px flex-1 bg-[#ac8a5d]/50" />or<span className="h-px flex-1 bg-[#ac8a5d]/50" /></div>
    <a href={`${base}/auth/google`} aria-label="Sign in with Google" aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} className="flex h-12 w-full items-center justify-center overflow-hidden rounded-lg border border-[#747775] bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#805523] aria-disabled:opacity-50" onClick={(event) => { if (disabled) event.preventDefault(); }}>
      <Image src="/optimized/ui/google-sign-in-light.d36c4a8b8b26.webp" alt="Sign in with Google" width={216} height={48} className="h-12 w-[216px] max-w-full object-contain [clip-path:inset(2px)]" />
    </a>
    {message && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p>}
  </div>;
}
