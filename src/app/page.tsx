import { redirect } from "next/navigation";

// This route redirects instead of rendering an instant navigation shell.
export const instant = false;

export default function Home() {
  redirect("/login");
}
