import { AppError } from "@/src/lib/api-error";
import type { ActivityTemplate, CurriculumStore, CurriculumTemplate, LessonTemplate } from "@/src/modules/curriculum/repository";
import { CanonicalMutationSchema, CurriculumImportInputSchema, ExecutionOverridesSchema } from "@/src/modules/curriculum/schema";

export type ActivityExecution = Readonly<{
  activityTemplateId: string;
  dueAt: string | null;
  supplementalInstructions: string | null;
}>;

export class CurriculumImportService {
  constructor(private readonly repository: CurriculumStore) {}

  async importExplorer(input: unknown): Promise<{ curriculumId: string }> {
    const parsed = CurriculumImportInputSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Importação de currículo inválida.", crypto.randomUUID());

    const existing = await this.repository.findByVersion(parsed.data.tenantId, "Explorer", "2026.1");
    if (existing) return { curriculumId: existing.id };

    const template = parseExplorerDocument(parsed.data.tenantId, parsed.data.document);
    const saved = await this.repository.save(template);
    return { curriculumId: saved.id };
  }

  createExecution(template: ActivityTemplate, overrides: unknown): ActivityExecution {
    const parsed = ExecutionOverridesSchema.safeParse(overrides);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Dados de execução inválidos.", crypto.randomUUID());
    return {
      activityTemplateId: template.id,
      dueAt: parsed.data.dueAt ?? null,
      supplementalInstructions: parsed.data.supplementalInstructions ?? null,
    };
  }

  assertExecutionOnly(input: unknown): void {
    if (CanonicalMutationSchema.safeParse(input).success) {
      throw new AppError("FORBIDDEN", "Templates canônicos são imutáveis.", crypto.randomUUID());
    }
    const parsed = ExecutionOverridesSchema.safeParse(input);
    if (!parsed.success) throw new AppError("FORBIDDEN", "A execução aceita apenas prazo e instrução complementar.", crypto.randomUUID());
  }
}

function parseExplorerDocument(tenantId: string, document: string): CurriculumTemplate {
  const cycleMatches = [...document.matchAll(/^# Ciclo (\d+) — (.+)$/gmu)];
  if (cycleMatches.length !== 4) throw invalidStructure("O Explorer deve ter quatro ciclos.");

  const cycles = cycleMatches.map((match, index) => {
    const section = document.slice(match.index, cycleMatches[index + 1]?.index);
    const cyclePosition = Number(match[1]);
    const projectTitle = readSection(section, "Resultado esperado").replace(/^Projeto \d+ — /u, "").split(":")[0]?.trim();
    const lessons = parseLessons(section, cyclePosition);
    if (!projectTitle || lessons.length !== 4) throw invalidStructure("Cada ciclo deve conter projeto e quatro aulas.");
    return Object.freeze({
      id: stableId(tenantId, `cycle-${cyclePosition}`),
      position: cyclePosition,
      title: match[2]?.trim() ?? "",
      projectTitle,
      lessons: Object.freeze(lessons),
    });
  });

  const lessons = cycles.flatMap((cycle) => cycle.lessons);
  const demoDay = lessons.at(-1);
  if (lessons.length !== 16 || !demoDay?.title.includes("Demo Day") || !demoDay.referenceContent.includes("reflexão final")) {
    throw invalidStructure("O Explorer deve manter 16 aulas e a marca de reflexão/Demo Day.");
  }

  return Object.freeze({
    id: stableId(tenantId, "explorer-2026.1"),
    tenantId,
    name: "Explorer",
    version: "2026.1",
    cycles: Object.freeze(cycles),
  });
}

function parseLessons(cycle: string, cyclePosition: number): LessonTemplate[] {
  const lessonMatches = [...cycle.matchAll(/^## Aula (\d+) — (.+)$/gmu)];
  return lessonMatches.map((match, index) => {
    const section = cycle.slice(match.index, lessonMatches[index + 1]?.index);
    const position = Number(match[1]);
    if (Math.ceil(position / 4) !== cyclePosition) throw invalidStructure("A ordem das aulas não corresponde ao ciclo.");
    const id = stableId("explorer", `lesson-${position}`);
    const objective = readSection(section, "Objetivo da aula");
    const referenceContent = `${readSection(section, "Conteúdo")}\n\nEntrega do aluno:\n${readSection(section, "Entrega do aluno")}`;
    const activity = Object.freeze({
      id: stableId("explorer", `activity-${position}`),
      lessonId: id,
      title: `Missão ${String(position).padStart(2, "0")}`,
      objective,
      instructions: readSection(section, "Atividade prática"),
      continuityGuidance: readSection(section, "Tarefa pós-aula"),
      criterion: readSection(section, "Critério de conclusão"),
    });
    return Object.freeze({ id, position, title: match[2]?.trim() ?? "", objective, referenceContent, activity });
  });
}

function readSection(document: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`^#{2,3} ${escaped}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n#{1,3} |$)`, "mu").exec(document);
  const value = match?.[1]?.trim();
  if (!value) throw invalidStructure(`Seção obrigatória ausente: ${heading}.`);
  return value;
}

function stableId(namespace: string, value: string): string {
  return `${namespace}:${value}`;
}

function invalidStructure(message: string): AppError {
  return new AppError("VALIDATION_ERROR", message, crypto.randomUUID());
}
