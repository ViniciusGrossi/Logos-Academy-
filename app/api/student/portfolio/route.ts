import { projectController } from "@/src/modules/projects-portfolio-completion/controller";
export async function GET(request:Request){return projectController(false,(s,a,r)=>s.portfolio(a,Object.fromEntries(new URL(request.url).searchParams),r));}
