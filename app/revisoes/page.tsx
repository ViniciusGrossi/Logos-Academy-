import { Suspense } from "react";
import { AppShell } from "@/components/prototype/app-shell";
import { ReviewQueue } from "@/components/prototype/review-queue";
import { LoadingState } from "@/components/prototype/state-lab";
export default function ReviewsPage(){return <AppShell><Suspense fallback={<LoadingState/>}><ReviewQueue/></Suspense></AppShell>}
