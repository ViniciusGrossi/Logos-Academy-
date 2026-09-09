import { NextResponse } from "next/server";
import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { IdentityRepository } from "@/src/modules/identity/repository";
import { IdentityService } from "@/src/modules/identity/service";
import { ProjectRepository, type Actor } from "./repository";
import { ProjectService } from "./service";
const status=(c:AppError["code"]):number=>({UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,VALIDATION_ERROR:400,CONFLICT:409,RATE_LIMITED:429,INTERNAL_ERROR:500})[c];
export async function projectController<T>(admin:boolean,op:(s:ProjectService,a:Actor,r:string)=>Promise<T>):Promise<NextResponse>{const r=crypto.randomUUID();try{const c=await createSupabaseServerClient();const {data:{user}}=await c.auth.getUser();if(!user)throw new AppError("UNAUTHENTICATED","Sessão obrigatória.",r);const i=await new IdentityService(new IdentityRepository(c))[admin?"requireAdmin":"requireAuthenticated"](user.id,r);if(!admin&&i.role!=="student")throw new AppError("FORBIDDEN","Acesso de estudante obrigatório.",r);const a:Actor={tenantId:i.tenantId,userId:i.userId,role:i.role};return NextResponse.json({ok:true,data:await op(new ProjectService(new ProjectRepository()),a,r)});}catch(e:unknown){const x=asApiError(e,r,"Não foi possível concluir a formação.");return NextResponse.json(toApiResult(x),{status:status(x.code)});}}
