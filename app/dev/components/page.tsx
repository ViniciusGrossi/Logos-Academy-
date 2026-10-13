import { notFound } from "next/navigation";
import { AdminEditorialPreview } from "@/src/components/ui-shared/admin-editorial.preview";

export default function ComponentsLab() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminEditorialPreview />;
}
