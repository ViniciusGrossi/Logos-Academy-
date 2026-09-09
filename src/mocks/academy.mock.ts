export const studentHome = {
  student: "Marina",
  session: "Sessão 07 · 02 set",
  notice: "Você tem um feedback novo e uma entrega de aproximadamente 25 minutos.",
  mission: {
    project: "Creative Studio",
    title: "Revise a hierarquia do cartaz e envie a versão 03.",
    description: "Vinicius marcou dois pontos na v02: dê mais contraste ao título e reduza o texto de apoio.",
    progress: 62,
  },
  checkpoints: [
    { code: "01", label: "Brief", note: "decisão registrada", status: "done" },
    { code: "02", label: "Direção", note: "v02 comentada", status: "done" },
    { code: "03", label: "Refino", note: "v03 em edição", status: "current" },
    { code: "04", label: "Project Day", note: "apresentação final", status: "locked" },
  ],
  evidence: [
    { title: "Meu Assistente", skill: "Prompting · prototipação", status: "Publicado", version: "final" },
    { title: "Campanha que Move", skill: "Design · comunicação", status: "Em revisão", version: "v03" },
    { title: "Automation Lab", skill: "Fluxos · integração", status: "Bloqueado", version: "v01" },
  ],
};

export const activity = {
  title: "Cartaz que orienta uma decisão",
  project: "Creative Studio · atividade 07",
  estimate: "25 min",
  deadline: "Hoje, 20:00",
  objective: "Refinar a hierarquia visual e provar que a mensagem principal funciona à distância.",
  steps: ["Compare a v02 com o feedback publicado.", "Reduza o apoio para uma frase.", "Envie a v03 e registre a decisão tomada."],
  criteria: ["Título legível a três metros", "Uma única mensagem principal", "Decisão explicada no envio"],
  versions: [
    { version: "v02", date: "Hoje, 11:42", status: "Ajustes pedidos", feedback: "O título já tem presença. Reduza o apoio e aumente o contraste entre os dois níveis." },
    { version: "v01", date: "30 ago, 16:18", status: "Histórico", feedback: "Primeira hipótese preservada para tornar a evolução visível." },
  ],
};

export const adminDashboard = {
  metrics: [
    { value: "07", label: "na fila de feedback" },
    { value: "03", label: "vencem em 4 horas" },
    { value: "02", label: "alunos em risco" },
    { value: "84%", label: "entregas no prazo" },
  ],
  classes: [
    { name: "Explorer A", schedule: "Ter e Qui · 14:00", students: "6 alunos", attendance: "92%" },
    { name: "Explorer B", schedule: "Qua e Sex · 09:00", students: "5 alunos", attendance: "88%" },
  ],
  queue: [
    { student: "Marina", project: "Campanha que Move · v03", age: "18 min", priority: "Nova" },
    { student: "Caio", project: "Meu Assistente · v02", age: "31 h", priority: "Prioridade" },
    { student: "Rafa", project: "Automation Lab · v01", age: "2 h", priority: "2ª tentativa" },
  ],
  risks: [
    { title: "Luiza faltou 2 encontros", note: "Última atividade há 8 dias" },
    { title: "João ainda não conectou o GitHub", note: "Bloqueia a próxima entrega" },
  ],
};

export type DemoState = "content" | "loading" | "empty" | "error";
