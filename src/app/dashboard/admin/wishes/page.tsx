import { AdminWishControls } from "@/components/admin/wish-controls";

export default function AdminWishesPage() {
  return <><h1 className="font-sans text-3xl">Wish currency</h1><p className="mt-2 text-sm text-slate-500">Send wish currency to one account or to every account in a selected donation tier.</p><AdminWishControls /></>;
}
