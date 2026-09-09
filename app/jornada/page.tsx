import { Suspense } from "react";
import { AppShell } from "@/components/prototype/app-shell";
import { JourneyPage } from "@/components/prototype/journey-page";
import { LoadingState } from "@/components/prototype/state-lab";
export default function Page(){return <AppShell><Suspense fallback={<LoadingState/>}><JourneyPage/></Suspense></AppShell>}
