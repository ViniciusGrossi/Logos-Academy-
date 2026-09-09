"use client";

import { FormEvent, useEffect, useState } from "react";
import { Github, Save } from "lucide-react";
import type { MeProfile } from "@/specs/api.contracts";
import { MagneticAction, PageHeader, StateScene, StatusBadge } from "@/components/academy";
import { apiMutation, useLiveApi } from "@/components/prototype/live-api";
import styles from "./student-pages.module.css";

export function StudentProfile() {
  const profile = useLiveApi<MeProfile>("/api/me");
  const [displayName,setDisplayName]=useState(""); const [githubUsername,setGithubUsername]=useState("");
  const [pending,setPending]=useState(false); const [notice,setNotice]=useState<string|null>(null);
  useEffect(()=>{ if(profile.data){setDisplayName(profile.data.displayName);setGithubUsername(profile.data.githubUsername??"");}},[profile.data]);
  async function save(event: FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setNotice(null);try{await apiMutation<MeProfile>("/api/me","PATCH",{displayName,githubUsername:githubUsername||null});setNotice("Perfil atualizado. Sua identidade de construção está em dia.");await profile.reload();}catch(cause){setNotice(cause instanceof Error?cause.message:"Não foi possível salvar.");}finally{setPending(false);}}
  if(profile.loading)return <StateScene state="loading" title="Preparando seu perfil" description="Reunindo identidade e vínculo do GitHub." />;
  if(profile.error)return <StateScene state="error" title="Não foi possível abrir seu perfil" description={profile.error.message} action={<button onClick={()=>void profile.reload()}>Tentar novamente</button>} />;
  if(!profile.data)return <StateScene state="empty" title="Perfil indisponível" description="Entre novamente para continuar." />;
  const initial=profile.data.displayName.trim().charAt(0).toUpperCase();
  return <div className={styles.page}><PageHeader eyebrow="Passaporte do estudante" marker="Perfil individual" title="Sua identidade de construção" description="Seus dados, sua conta GitHub e a assinatura que acompanha cada evidência produzida na Academy." />
    <div className={styles.profileGrid}><aside className={styles.identity} data-initial={initial}><div className={styles.identityBadge}>{initial}</div><h2>{profile.data.displayName}</h2><p>{profile.data.email}</p><StatusBadge tone={profile.data.githubUsername?"success":"warning"}>{profile.data.githubUsername?"GitHub conectado":"GitHub pendente"}</StatusBadge><div className={styles.identityMarker}>Student Passport · {profile.data.role === "admin" ? "Admin" : "Explorer"}</div></aside>
      <form className={styles.profileForm} onSubmit={save}><h2>Dados visíveis</h2><p>Use o nome pelo qual você quer ser reconhecido nas atividades e no portfólio interno.</p><div className={styles.field}><label htmlFor="displayName">Nome de exibição</label><input id="displayName" value={displayName} onChange={(event)=>setDisplayName(event.target.value)} minLength={1} maxLength={120} required /><small>Este nome aparece nas suas evidências.</small></div><div className={styles.field}><label htmlFor="githubUsername"><Github size={16} /> Usuário do GitHub</label><input id="githubUsername" value={githubUsername} onChange={(event)=>setGithubUsername(event.target.value)} pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?" placeholder="seu-usuario" /><small>O GitHub é requisito do curso; basta vincular o perfil e enviar os repositórios.</small></div><MagneticAction><button className={styles.save} disabled={pending}><Save size={16} /> {pending?"Salvando…":"Salvar perfil"}</button></MagneticAction>{notice&&<div className={styles.notice} role="status">{notice}</div>}</form>
    </div></div>;
}
