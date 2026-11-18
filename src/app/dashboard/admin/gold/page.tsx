import { AdminResourceControls } from "@/components/admin/resource-controls";
export default function AdminGoldPage() {
  return <><h1 className="text-3xl">Gold</h1><p className="mt-2 text-sm text-slate-500">Add gold to one account or a donation tier.</p><AdminResourceControls key="gold" resource="gold" /></>;
}
