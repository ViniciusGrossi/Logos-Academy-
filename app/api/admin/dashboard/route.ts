import { NextResponse } from "next/server";
import { AppError,toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { AdminDashboardRepository } from "@/src/modules/admin-dashboard/repository";
import { AdminDashboardService } from "@/src/modules/admin-dashboard/service";
const status=(c:AppError["code"]):number=>({UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,VALIDATION_ERROR:400,CONFLICT:409,RATE_LIMITED:429,INTERNAL_ERROR:500})[c];
export async function GET(request:Request){const r=crypto.randomUUID();try{const c=await createSupabaseServerClient();const {data:{user}}=await c.auth.getUser();if(!user)throw new AppError("UNAUTHENTICATED","Sessão obrigatória.",r);const i=await new IdentityService(new IdentityRepository(c)).requireAdmin(user.id,r);const service=new AdminDashboardService(new AdminDashboardRepository());return NextResponse.json({ok:true,data:await service.dashboard(i,Object.fromEntries(new URL(request.url).searchParams),r)});}catch(e:unknown){const x=e instanceof AppError?e:new AppError("INTERNAL_ERROR","Não foi possível consultar o painel.",r);return NextResponse.json(toApiResult(x),{status:status(x.code)});}}
