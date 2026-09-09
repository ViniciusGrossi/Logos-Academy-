import { Suspense } from "react";
import { AppShell } from "@/components/prototype/app-shell";
import { ProjectPortal } from "@/components/prototype/project-portal";
import { LoadingState } from "@/components/prototype/state-lab";
export default function ProjectsPage(){return <AppShell><Suspense fallback={<LoadingState/>}><ProjectPortal/></Suspense></AppShell>}
