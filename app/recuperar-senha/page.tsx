import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/auth-experience";

export default function RecoverPasswordPage() {
  return <Suspense><AuthExperience mode="recover" /></Suspense>;
}
