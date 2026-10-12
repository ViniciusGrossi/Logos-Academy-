import { AppShell } from "@/components/layout/app-shell";
import { AtlasCmsEditor } from "@/components/atlas/atlas-cms-editor";
export default async function AdminAtlasEditorPage({ params }: { params: Promise<{ itemId: string }> }) { const { itemId } = await params; return <AppShell><AtlasCmsEditor itemId={itemId} /></AppShell>; }
