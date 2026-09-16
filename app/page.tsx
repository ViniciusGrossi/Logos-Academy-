import { Suspense } from "react";
import { AppShell } from "@/components/prototype/app-shell";
import { LoadingState } from "@/components/prototype/state-lab";
import { StudentHome } from "@/components/prototype/student-home";

export default function HomePage() {
  return <AppShell><Suspense fallback={<LoadingState layout="home" />}><StudentHome /></Suspense></AppShell>;
}
