import { AdminSupportControls } from "@/components/admin/support-controls";

export default function AdminSupportPage() {
  return <><h1 className="font-sans text-3xl">Support management</h1><p className="mt-2 text-sm text-slate-500">Manage the receiving QR and review supporter submissions.</p><AdminSupportControls /></>;
}
