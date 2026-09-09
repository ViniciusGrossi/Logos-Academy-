import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/auth-experience";

export default function LoginPage() {
  return <Suspense><AuthExperience mode="login" /></Suspense>;
}
