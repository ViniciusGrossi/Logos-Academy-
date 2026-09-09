import { inviteController } from "@/src/modules/admissions/controller";

export async function POST(request: Request) { return inviteController(request); }
