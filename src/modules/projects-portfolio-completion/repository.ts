import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CompletionCheck, Page, PresentationRecord, ProjectDetail, ProjectSummary } from "@/specs/api.contracts";
import { AppError } from "@/src/lib/api-error";
import { getAdminSupabaseEnv } from "@/src/lib/supabase/env";
import { mapRpcError } from "@/src/lib/supabase/rpc-error";
import type { PortfolioQuery, PresentationInput } from "./schema";

export type Actor = Readonly<{ tenantId:string; userId:string; role:"admin"|"student" }>;
export interface ProjectStore { projects(actor:Actor,enrollmentId:string|undefined,requestId:string):Promise<ProjectSummary[]>; detail(actor:Actor,projectId:string,requestId:string):Promise<ProjectDetail>; portfolio(actor:Actor,q:PortfolioQuery,requestId:string):Promise<Page<ProjectDetail>>; completion(actor:Actor,enrollmentId:string,requestId:string):Promise<CompletionCheck>; presentation(actor:Actor,enrollmentId:string,input:PresentationInput,requestId:string):Promise<PresentationRecord>; complete(actor:Actor,enrollmentId:string,requestId:string):Promise<CompletionCheck>; }
export class ProjectRepository implements ProjectStore {
  private readonly client:SupabaseClient; private readonly key:string;
  constructor(){const env=getAdminSupabaseEnv();this.key=env.PII_ENCRYPTION_KEY;this.client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});}
  async projects(a:Actor,e:string|undefined,r:string){return this.rpc("student_projects",{p_tenant_id:a.tenantId,p_actor_user_id:a.userId,p_enrollment_id:e??null},r) as Promise<ProjectSummary[]>;}
  async detail(a:Actor,p:string,r:string){return this.rpc("student_project_detail",{p_tenant_id:a.tenantId,p_actor_user_id:a.userId,p_project_id:p,p_encryption_key:this.key},r) as Promise<ProjectDetail>;}
  async portfolio(a:Actor,q:PortfolioQuery,r:string){return this.rpc("student_portfolio_page",{p_tenant_id:a.tenantId,p_actor_user_id:a.userId,p_enrollment_id:q.enrollmentId??null,p_cursor:q.cursor??null,p_limit:q.limit},r) as Promise<Page<ProjectDetail>>;}
  async completion(a:Actor,e:string,r:string){return this.rpc("admin_completion_check",{p_tenant_id:a.tenantId,p_actor_user_id:a.userId,p_enrollment_id:e},r) as Promise<CompletionCheck>;}
  async presentation(a:Actor,e:string,i:PresentationInput,r:string){return this.rpc("admin_record_presentation",{p_tenant_id:a.tenantId,p_actor_user_id:a.userId,p_enrollment_id:e,p_kind:i.kind,p_performed_at:i.performedAt,p_contextual_note:i.contextualNote??null,p_encryption_key:this.key,p_request_id:r},r) as Promise<PresentationRecord>;}
  async complete(a:Actor,e:string,r:string){return this.rpc("admin_complete_enrollment",{p_tenant_id:a.tenantId,p_actor_user_id:a.userId,p_enrollment_id:e,p_request_id:r},r) as Promise<CompletionCheck>;}
  private async rpc(n:string,p:Record<string,unknown>,r:string):Promise<unknown>{const {data,error}=await this.client.schema("logos_academy" as "public").rpc(n as never,p as never);if(error||data===null)throw new AppError(error?.code==="22023"?"VALIDATION_ERROR":mapRpcError(error?.code),"Não foi possível consultar a formação.",r);return data;}
}
