import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(
    "flex h-12 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-700/10 disabled:opacity-50 aria-invalid:border-destructive",
    className,
  )} {...props} />;
}
