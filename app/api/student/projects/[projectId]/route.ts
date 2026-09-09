import { projectController } from "@/src/modules/projects-portfolio-completion/controller";
export async function GET(_request:Request,{params}:{params:Promise<{projectId:string}>}){const {projectId}=await params;return projectController(false,(s,a,r)=>s.detail(a,projectId,r));}
