import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/auth-experience";

export default function ActivatePage() {
  return <Suspense><AuthExperience mode="activate" /></Suspense>;
}
