export type ActivityTemplate = Readonly<{
  id: string;
  lessonId: string;
  title: string;
  objective: string;
  instructions: string;
  continuityGuidance: string;
  criterion: string;
}>;

export type LessonTemplate = Readonly<{
  id: string;
  position: number;
  title: string;
  objective: string;
  referenceContent: string;
  activity: ActivityTemplate;
}>;

export type CycleTemplate = Readonly<{
  id: string;
  position: number;
  title: string;
  projectTitle: string;
  lessons: readonly LessonTemplate[];
}>;

export type CurriculumTemplate = Readonly<{
  id: string;
  tenantId: string;
  name: "Explorer";
  version: "2026.1";
  cycles: readonly CycleTemplate[];
}>;

export interface CurriculumStore {
  findByVersion(tenantId: string, name: string, version: string): Promise<CurriculumTemplate | null>;
  save(template: CurriculumTemplate): Promise<CurriculumTemplate>;
}

export class InMemoryCurriculumRepository implements CurriculumStore {
  private readonly templates = new Map<string, CurriculumTemplate>();

  async findByVersion(tenantId: string, name: string, version: string): Promise<CurriculumTemplate | null> {
    return this.templates.get(`${tenantId}:${name}:${version}`) ?? null;
  }

  async save(template: CurriculumTemplate): Promise<CurriculumTemplate> {
    const key = `${template.tenantId}:${template.name}:${template.version}`;
    const existing = this.templates.get(key);
    if (existing) return existing;
    this.templates.set(key, template);
    return template;
  }

  snapshot(tenantId: string): { curricula: number; cycles: number; lessons: number; projects: number } {
    const templates = [...this.templates.values()].filter((template) => template.tenantId === tenantId);
    const cycles = templates.flatMap((template) => template.cycles);
    return {
      curricula: templates.length,
      cycles: cycles.length,
      lessons: cycles.flatMap((cycle) => cycle.lessons).length,
      projects: cycles.length,
    };
  }

  curriculum(id: string): CurriculumTemplate {
    const template = [...this.templates.values()].find((candidate) => candidate.id === id);
    if (!template) throw new Error("Currículo não encontrado.");
    return template;
  }
}
