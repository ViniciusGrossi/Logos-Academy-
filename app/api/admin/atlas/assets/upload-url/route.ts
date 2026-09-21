import { adminAtlasUploadUrlController } from "@/src/modules/knowledge-atlas/controller";

export async function POST(request: Request) {
  return adminAtlasUploadUrlController(request);
}
