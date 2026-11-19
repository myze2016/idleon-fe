import Image from "next/image";
import { currencyImages } from "@/lib/currency-images";

export function CurrencyIcon({ kind, size = 24 }: { kind: "wish" | "gold"; size?: number }) {
  return <Image src={currencyImages[kind]} alt="" aria-hidden="true" width={size} height={size} className="inline-block shrink-0 align-middle object-contain" style={{ width: size, height: size }} />;
}
