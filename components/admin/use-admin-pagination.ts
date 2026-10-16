"use client";

import { useState } from "react";
import type { Page } from "@/specs/api.contracts";
import { useLiveApi } from "@/components/prototype/live-api";

export function useAdminPagination<T>(base: string | null) {
  const [navigation, setNavigation] = useState<{ base: string | null; cursors: readonly (string | null)[]; index: number }>({ base, cursors: [null], index: 0 });
  const current = navigation.base === base ? navigation : { base, cursors: [null], index: 0 };
  const cursor = current.cursors[current.index];
  const url = base && cursor ? `${base}${base.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}` : base;
  const result = useLiveApi<Page<T>>(url);
  const nextCursor = result.data?.nextCursor;
  function nextPage() {
    if (result.loading || !nextCursor || nextCursor === cursor) return;
    setNavigation({ base, cursors: [...current.cursors.slice(0, current.index + 1), nextCursor], index: current.index + 1 });
  }
  function previousPage() {
    if (result.loading || current.index === 0) return;
    setNavigation({ ...current, index: current.index - 1 });
  }
  return { ...result, page: current.index + 1, hasPrevious: current.index > 0, hasNext: Boolean(nextCursor), nextPage, previousPage };
}
