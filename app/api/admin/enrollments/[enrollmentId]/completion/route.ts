import { projectController } from "@/src/modules/projects-portfolio-completion/controller";
export async function GET(_request:Request,{params}:{params:Promise<{enrollmentId:string}>}){const {enrollmentId}=await params;return projectController(true,(s,a,r)=>s.completion(a,enrollmentId,r));}
