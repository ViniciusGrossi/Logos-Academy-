import { AppShell } from "@/components/prototype/app-shell";
import { KnowledgeAtlas } from "@/components/student/knowledge-atlas";
import { normalizeAtlasTab } from "@/src/lib/knowledge-atlas";

type AtlasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AtlasPage({ searchParams }: AtlasPageProps) {
  const params = await searchParams;
  const tab = normalizeAtlasTab(
    typeof params.tab === "string" ? params.tab : undefined,
  );
  const item = typeof params.item === "string" ? params.item : null;
  const search = typeof params.q === "string" ? params.q : "";

  return (
    <AppShell>
      <KnowledgeAtlas
        initialTab={tab}
        initialItem={item}
        initialSearch={search}
      />
    </AppShell>
  );
}
