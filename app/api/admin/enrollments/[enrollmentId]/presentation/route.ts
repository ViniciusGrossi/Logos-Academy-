import { projectController } from "@/src/modules/projects-portfolio-completion/controller";
export async function POST(request:Request,{params}:{params:Promise<{enrollmentId:string}>}){const {enrollmentId}=await params;return projectController(true,async(s,a,r)=>s.presentation(a,enrollmentId,await request.json(),r));}
