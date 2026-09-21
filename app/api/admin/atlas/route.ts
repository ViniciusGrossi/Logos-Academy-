import { adminAtlasCreateController, adminAtlasListController } from "@/src/modules/knowledge-atlas/controller";

export async function GET(request: Request) {
  return adminAtlasListController(request);
}

export async function POST(request: Request) {
  return adminAtlasCreateController(request);
}
