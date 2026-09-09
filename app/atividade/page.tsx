import { Suspense } from "react";
import { ActivityDetail } from "@/components/prototype/activity-detail";
import { AppShell } from "@/components/prototype/app-shell";
import { LoadingState } from "@/components/prototype/state-lab";

export default function ActivityPage() {
  return <AppShell><Suspense fallback={<LoadingState />}><ActivityDetail /></Suspense></AppShell>;
}
