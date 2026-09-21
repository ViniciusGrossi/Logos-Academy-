"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CinematicPage, DataList, FilterBar, GlowField, MagneticAction, MetricStrip, PageHeader, ProgressRail, SpotlightCard, SpringCard, StateScene, StatusBadge, Ticker, WordReveal } from ".";

const evidence = [
  { id: "rag", label: "Mapa de recuperação", status: "Ajuste solicitado" },
  { id: "prompt", label: "Prompt documentado", status: "Aprovado" },
];

export function ComponentGallery() {
  return (
    <CinematicPage className="component-gallery">
      <PageHeader eyebrow="Laboratório de componentes" title="Cinema de Evidências" description="Estados, movimento e densidade compartilhados por toda a plataforma." marker="v0.8" />
      <div style={{ position: "relative", minHeight: "12rem", overflow: "hidden", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)" }}>
        <GlowField grid />
        <div style={{ position: "relative", padding: "calc(var(--spacing-unit) * 7)" }}>
          <WordReveal amplitudePx={4} staggerMs={70}>
            Primitivos vivos da Home Premium
          </WordReveal>
        </div>
      </div>
      <Ticker items={["Missão 04 · Retrieval", "Evidência aprovada", "Percurso Explorer · ciclo 02", "Checkpoint atualizado"]} />
      <SpotlightCard beam className="component-gallery__surface">
        <StatusBadge tone="explorer">Halo de Prioridade (beam)</StatusBadge>
        <h2>Risco urgente ou próxima missão</h2>
        <p>Feixe de borda animado — reservado, nunca decoração em série.</p>
      </SpotlightCard>
      <MetricStrip metrics={[
        { id: "a", label: "Frequência", value: "100%", detail: "requisito do módulo", emphasis: true },
        { id: "b", label: "Evidências", value: "08", detail: "entregas registradas" },
        { id: "c", label: "Revisões", value: "02", detail: "aguardando leitura" },
      ]} />
      <div className="component-gallery__grid">
        <SpotlightCard interactive className="component-gallery__surface">
          <StatusBadge tone="explorer">Próxima missão</StatusBadge>
          <h2>Construa um buscador com RAG</h2>
          <p>Uma superfície com spotlight localizado, foco por teclado e resposta contida.</p>
          <MagneticAction><Button>Continuar atividade</Button></MagneticAction>
        </SpotlightCard>
        <SpringCard eyebrow="Conceito 04" title="Retrieval-Augmented Generation" summary="Abra para revisar o conceito antes da atividade.">
          RAG combina recuperação de fontes relevantes com geração de texto. A evidência deve mostrar de onde cada resposta veio.
        </SpringCard>
      </div>
      <ProgressRail items={[
        { id: "1", label: "Contexto", detail: "Problema definido", status: "complete" },
        { id: "2", label: "Recuperação", detail: "Em construção", status: "current" },
        { id: "3", label: "Avaliação", detail: "Libera após a entrega", status: "locked" },
      ]} />
      <FilterBar resultLabel="2 evidências"><Button variant="outline">Todas</Button><Button variant="ghost">Ajustes</Button></FilterBar>
      <DataList items={evidence} ariaLabel="Evidências de exemplo" renderItem={(item) => <><strong>{item.label}</strong><StatusBadge tone={item.status === "Aprovado" ? "success" : "warning"}>{item.status}</StatusBadge></>} />
      <div className="component-gallery__states">
        <StateScene state="loading" />
        <StateScene state="empty" />
        <StateScene state="error" action={<Button variant="outline">Tentar novamente</Button>} />
      </div>
    </CinematicPage>
  );
}
