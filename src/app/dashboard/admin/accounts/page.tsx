import { AdminAccountControls } from "@/components/admin/account-controls";

export default function AdminAccountsPage() {
  return <><h1 className="font-sans text-3xl">Account management</h1><p className="mt-2 text-sm text-slate-500">Find an account to grant wish currency or update its donation tier.</p><AdminAccountControls /></>;
}
