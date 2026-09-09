import { Suspense } from "react";
import { AdminDashboard } from "@/components/prototype/admin-dashboard";
import { AppShell } from "@/components/prototype/app-shell";
import { LoadingState } from "@/components/prototype/state-lab";

export default function AdminPage() {
  return <AppShell><Suspense fallback={<LoadingState />}><AdminDashboard /></Suspense></AppShell>;
}
