import { AdminResourceControls } from "@/components/admin/resource-controls";
export default function AdminLevelsPage() {
  return <><h1 className="text-3xl">Account levels</h1><p className="mt-2 text-sm text-slate-500">Add levels to one account or a donation tier.</p><AdminResourceControls key="levels" resource="levels" /></>;
}
