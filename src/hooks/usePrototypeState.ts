"use client";

import { useSearchParams } from "next/navigation";
import type { DemoState } from "@/src/mocks/academy.mock";

const validStates: DemoState[] = ["content", "loading", "empty", "error"];

export function usePrototypeState(): DemoState {
  const state = useSearchParams().get("state") as DemoState | null;
  return state && validStates.includes(state) ? state : "content";
}
