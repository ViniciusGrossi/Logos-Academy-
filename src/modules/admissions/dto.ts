/**
 * Seleciona uma matrícula já projetada pela RPC segura de detalhe do aluno.
 * Nunca usa o resultado parcial das RPCs de escrita como resposta HTTP.
 */
export function enrollmentFromStudentDetail(
  detail: Record<string, unknown>,
  enrollmentId: string,
): Record<string, unknown> | null {
  if (!Array.isArray(detail.enrollments)) return null;

  return detail.enrollments.find(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && item.id === enrollmentId,
  ) ?? null;
}
