import { fileDownloadController } from "@/src/modules/activity-submission-files/controller";
/** SR-A7 (Release 2): aceita aluno dono do arquivo ou admin do mesmo tenant. */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) { const { fileId } = await params; return fileDownloadController(request, fileId); }
