"use client";

import styles from "./admin-experience.module.css";

export interface AdminPaginationProps {
  page?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  loading?: boolean;
  nextPage?: () => void;
  previousPage?: () => void;
}

export function AdminPagination({ page = 1, hasPrevious, hasNext, loading, nextPage, previousPage }: AdminPaginationProps) {
  if (!hasPrevious && !hasNext) return null;
  return <nav className={styles.formActions} aria-label="Paginação"><button type="button" className={styles.secondaryAction} disabled={!hasPrevious || loading} onClick={previousPage}>Página anterior</button><span role="status">Página {page}</span><button type="button" className={styles.secondaryAction} disabled={!hasNext || loading} onClick={nextPage}>Próxima página</button></nav>;
}
