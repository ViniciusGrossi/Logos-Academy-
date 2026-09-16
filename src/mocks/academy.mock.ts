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

export type ExplorerActivitySeed = {
  project: number;
  title: string;
  challenge: string;
  objective: string;
  steps: readonly string[];
  requirements: readonly { kind: "text" | "file" | "external_link" | "github_repository"; label: string; required: boolean }[];
  criteria: readonly string[];
  planB: string;
};

export type ExplorerActivityGuidance = {
  context: string;
  continuity: string;
  evidence: string;
  reflection: string;
  tools: string;
};

/** Conteúdo compacto do currículo Explorer v2 para o modo demo. */
export const explorerActivitySeeds: readonly ExplorerActivitySeed[] = [
  {
    project: 1, title: "Primeiro experimento com IA",
    challenge: "Descobrir em quatro testes quando uma resposta de IA ajuda, surpreende, parece estranha ou precisa ser verificada.",
    objective: "Explicar entrada e saída de uma IA generativa e reconhecer pelo menos uma resposta que exige verificação.",
    steps: ["Faça quatro perguntas com intenções diferentes.", "Classifique cada resposta.", "Escolha uma resposta que precisa ser conferida."],
    requirements: [{ kind: "text", label: "Registro dos quatro testes", required: true }, { kind: "text", label: "Explicação crítica", required: true }, { kind: "file", label: "Evidência visual", required: false }],
    criteria: ["Identifica a entrada enviada à IA", "Identifica a saída devolvida pela IA", "Registra exatamente quatro testes", "Aponta uma resposta que exige verificação", "Explica por que a IA pode errar"],
    planB: "Use respostas previamente salvas ou simule previsões de palavras no papel.",
  },
  {
    project: 1, title: "Duelo de ferramentas",
    challenge: "Executar a mesma tarefa em duas ferramentas e escolher a mais adequada com base em critérios observáveis.",
    objective: "Comparar duas ferramentas de IA pela mesma tarefa e justificar qual serve melhor ao assistente do ciclo.",
    steps: ["Defina uma tarefa única.", "Execute a mesma instrução em duas ferramentas.", "Compare clareza, utilidade e confiabilidade.", "Registre a escolha no formato X para Y porque Z."],
    requirements: [{ kind: "text", label: "Tabela comparativa", required: true }, { kind: "text", label: "Escolha justificada", required: true }, { kind: "file", label: "Comparação visual", required: false }],
    criteria: ["Usa a mesma tarefa nas duas ferramentas", "Compara a clareza", "Compara a utilidade", "Considera a verificação", "Justifica com um critério observável"],
    planB: "Compare respostas salvas ou exemplos impressos preparados pelo orientador.",
  },
  {
    project: 1, title: "Laboratório de prompts: da v0 à v3",
    challenge: "Transformar uma instrução vaga em um prompt com contexto, objetivo, restrições e formato de saída.",
    objective: "Produzir e comparar quatro estados do mesmo prompt: original, v1, v2 e v3.",
    steps: ["Registre o prompt original.", "Torne o pedido específico na v1.", "Acrescente contexto e objetivo na v2.", "Defina restrições e formato na v3.", "Compare os resultados."],
    requirements: [{ kind: "text", label: "Histórico do prompt", required: true }, { kind: "text", label: "Amostra de respostas", required: true }, { kind: "text", label: "Análise da iteração", required: true }],
    criteria: ["A v3 informa o contexto", "A v3 declara um objetivo", "A v3 contém uma restrição", "A v3 define o formato esperado", "A análise compara versões"],
    planB: "Revise prompts impressos em grupo e simule respostas com colegas.",
  },
  {
    project: 1, title: "Project Day: Meu Assistente Inteligente",
    challenge: "Entregar um assistente de escopo pequeno que reconheça limites e melhore após testes.",
    objective: "Construir, testar, corrigir, documentar e apresentar o Projeto 1.",
    steps: ["Defina problema e público.", "Escreva personalidade, prompt e limites.", "Crie três exemplos.", "Execute cinco testes.", "Aplique uma melhoria.", "Prepare a demonstração."],
    requirements: [{ kind: "text", label: "Ficha do assistente", required: true }, { kind: "text", label: "Prompt principal", required: true }, { kind: "text", label: "Exemplos", required: true }, { kind: "text", label: "Relatório de testes", required: true }, { kind: "text", label: "Melhoria aplicada", required: true }, { kind: "external_link", label: "Demonstração gravada", required: false }],
    criteria: ["Resolve um problema específico", "O prompt contém papel, objetivo, tom e limites", "Possui três exemplos", "Registra cinco testes", "Aplica uma melhoria baseada em teste", "Pode ser explicado em três minutos"],
    planB: "Demonstre com respostas salvas e apresente o roteiro de testes.",
  },
  {
    project: 2, title: "Três direções para uma imagem",
    challenge: "Gerar três versões da mesma ideia, alterando somente um elemento visual por vez.",
    objective: "Experimentar estilo, luz, cenário ou composição e justificar uma escolha visual.",
    steps: ["Defina ideia e mensagem.", "Produza a imagem-base.", "Crie duas variações controladas.", "Compare as versões.", "Escolha uma direção."],
    requirements: [{ kind: "file", label: "Grade visual", required: true }, { kind: "text", label: "Prompts", required: true }, { kind: "text", label: "Curadoria", required: true }],
    criteria: ["A grade contém três versões", "Cada variação muda um elemento", "Os prompts identificam a mudança", "A justificativa cita um aspecto visual", "A escolha sustenta a mensagem"],
    planB: "Monte um moodboard ou escreva os três prompts para geração posterior.",
  },
  {
    project: 2, title: "Brief de campanha que comunica",
    challenge: "Transformar a direção visual em uma campanha com público, mensagem, slogan, copy e tom coerentes.",
    objective: "Definir o conceito criativo completo do Projeto 2.",
    steps: ["Nomeie a campanha.", "Defina o público.", "Escreva a mensagem central.", "Defina estilo e tom.", "Crie slogan e copy.", "Selecione a imagem."],
    requirements: [{ kind: "text", label: "Brief criativo", required: true }, { kind: "text", label: "Slogan e copy", required: true }, { kind: "file", label: "Imagem principal", required: true }],
    criteria: ["O público é específico", "A mensagem cabe em uma frase", "O slogan sustenta a mensagem", "A copy é adequada ao público", "A imagem sustenta a campanha"],
    planB: "Crie o brief em papel ou slides e reutilize a grade da atividade anterior.",
  },
  {
    project: 2, title: "Vídeo curto: roteiro à primeira versão",
    challenge: "Transformar o brief em uma peça de 15 a 30 segundos com começo, meio e fim.",
    objective: "Produzir uma primeira versão assistível ou um storyboard temporal completo da campanha.",
    steps: ["Escreva o roteiro.", "Divida em cenas e durações.", "Defina imagens.", "Defina áudio.", "Edite e confira a mensagem."],
    requirements: [{ kind: "text", label: "Roteiro temporal", required: true }, { kind: "external_link", label: "Primeira versão", required: true }, { kind: "text", label: "Copy da peça", required: true }, { kind: "file", label: "Backup", required: false }],
    criteria: ["O roteiro tem começo, meio e fim", "A duração está entre 15 e 30 segundos", "O link abre para o orientador", "Imagem e áudio sustentam a mensagem", "A peça é compreensível"],
    planB: "Crie um storyboard compartilhável ou use imagens estáticas com narração.",
  },
  {
    project: 2, title: "Project Day: Creative Studio",
    challenge: "Finalizar e apresentar uma campanha cuja imagem, peça, copy e processo comuniquem a mesma ideia.",
    objective: "Concluir, documentar e apresentar o Projeto 2.",
    steps: ["Revalide público e mensagem.", "Finalize a imagem.", "Finalize vídeo ou storyboard.", "Revise a copy.", "Documente o processo.", "Apresente em três minutos."],
    requirements: [{ kind: "text", label: "Resumo da campanha", required: true }, { kind: "file", label: "Imagem final", required: true }, { kind: "external_link", label: "Peça audiovisual", required: true }, { kind: "text", label: "Copy final", required: true }, { kind: "text", label: "Processo criativo", required: true }],
    criteria: ["O resumo identifica público e mensagem", "A imagem está legível", "A peça abre pelo link", "A copy segue o brief", "O processo registra uma decisão", "A apresentação dura até três minutos"],
    planB: "Entregue imagem, storyboard e roteiro ou demonstre a peça offline.",
  },
  {
    project: 3, title: "Raio-X de uma automação",
    challenge: "Representar uma tarefa repetitiva como entrada, processamento, decisão e saída.",
    objective: "Desenhar um fluxo simples e explicar para quem ele gera valor.",
    steps: ["Escolha uma tarefa repetitiva.", "Identifique a entrada.", "Descreva o processamento.", "Defina a saída.", "Nomeie o usuário beneficiado.", "Resuma o valor."],
    requirements: [{ kind: "file", label: "Diagrama do fluxo", required: true }, { kind: "text", label: "Ficha do processo", required: true }, { kind: "text", label: "Frase de valor", required: true }],
    criteria: ["Possui uma entrada", "Possui processamento", "Possui uma saída", "Nomeia o usuário", "A frase corresponde ao fluxo"],
    planB: "Desenhe com papel ou post-its e fotografe o resultado.",
  },
  {
    project: 3, title: "Primeiro workflow em execução",
    challenge: "Transformar o diagrama em um workflow mínimo realmente executado.",
    objective: "Construir e testar um workflow básico no n8n ou alternativa disponível.",
    steps: ["Crie o gatilho.", "Adicione um processamento.", "Configure uma saída.", "Execute um teste.", "Registre fluxo e resultado."],
    requirements: [{ kind: "external_link", label: "Workflow compartilhado", required: false }, { kind: "file", label: "Print da execução", required: true }, { kind: "text", label: "Explicação dos nós", required: true }, { kind: "text", label: "Caso de teste", required: true }],
    criteria: ["Existe um gatilho", "Existe processamento", "Existe uma saída", "O teste chegou à saída", "A explicação não expõe segredo"],
    planB: "Use o ambiente do orientador, um template ou simule com formulário e planilha.",
  },
  {
    project: 3, title: "IA como etapa do fluxo",
    challenge: "Inserir uma etapa de IA com entrada definida, resposta previsível e ação seguinte.",
    objective: "Construir ou simular um workflow em que a IA produz uma saída usada pela automação.",
    steps: ["Defina a entrada.", "Escreva um prompt com formato.", "Ligue a resposta à próxima ação.", "Execute um teste.", "Registre o percurso completo."],
    requirements: [{ kind: "file", label: "Fluxo com IA", required: true }, { kind: "text", label: "Prompt da automação", required: true }, { kind: "text", label: "Registro do teste", required: true }, { kind: "external_link", label: "Workflow compartilhado", required: false }],
    criteria: ["A entrada está definida", "O prompt define o formato", "A resposta está registrada", "Existe uma ação posterior", "O teste chega à saída final"],
    planB: "Use uma resposta mockada e execute manualmente somente a etapa de IA.",
  },
  {
    project: 3, title: "Project Day: Automation Lab",
    challenge: "Entregar uma automação real ou simulada que resolva um problema pequeno de ponta a ponta.",
    objective: "Concluir, testar, documentar e apresentar o Projeto 3.",
    steps: ["Declare problema e resultado.", "Revise o diagrama.", "Execute um caso de sucesso.", "Descreva uma falha segura.", "Registre limitações.", "Prepare a demonstração."],
    requirements: [{ kind: "text", label: "Ficha da automação", required: true }, { kind: "file", label: "Diagrama final", required: true }, { kind: "file", label: "Evidência de execução", required: true }, { kind: "text", label: "Teste e resultado", required: true }, { kind: "external_link", label: "Demonstração", required: false }],
    criteria: ["O problema cabe em uma frase", "O diagrama mostra o fluxo", "A evidência mostra execução", "O teste corresponde ao objetivo", "Registra uma limitação", "Explica o fluxo completo"],
    planB: "Entregue diagrama, prompt, resposta mockada e roteiro da simulação.",
  },
  {
    project: 4, title: "Product Brief: problema antes da solução",
    challenge: "Investigar uma necessidade real e reduzir a ideia a um produto demonstrável em uma semana.",
    objective: "Definir problema, usuário, solução, papel da IA e limites do MVP do Projeto 4.",
    steps: ["Descreva problema e usuário.", "Registre a solução atual.", "Converse com uma pessoa.", "Proponha a solução.", "Defina entrada e saída.", "Fixe o escopo."],
    requirements: [{ kind: "text", label: "Product Brief", required: true }, { kind: "text", label: "Registro de descoberta", required: true }, { kind: "text", label: "Escopo do MVP", required: true }],
    criteria: ["O problema não começa pela ferramenta", "O usuário está identificado", "Há descoberta real", "O papel da IA está explícito", "A demo está definida", "O escopo separa entra e fica fora"],
    planB: "Use entrevista em dupla, relato fornecido e template impresso.",
  },
  {
    project: 4, title: "Blueprint da solução",
    challenge: "Desenhar o caminho completo do usuário e localizar onde IA ou automação participa.",
    objective: "Produzir o blueprint do MVP com entrada, processamento, resultado e demonstração.",
    steps: ["Desenhe o ponto inicial.", "Mostre a entrada.", "Represente processamento e IA.", "Desenhe o resultado.", "Marque a demo.", "Liste materiais e backups."],
    requirements: [{ kind: "file", label: "Wireframe", required: true }, { kind: "file", label: "Fluxo do produto", required: true }, { kind: "text", label: "Plano de build", required: true }, { kind: "text", label: "Roteiro da demo", required: true }],
    criteria: ["O wireframe mostra a entrada", "O fluxo mostra o dado", "A etapa de IA está identificada", "O resultado está representado", "O roteiro demonstra a promessa", "Existe um backup executável"],
    planB: "Desenhe em papel, fotografe e escreva o roteiro.",
  },
  {
    project: 4, title: "Build Day: AI Product",
    challenge: "Construir primeiro o núcleo demonstrável e cortar qualquer extra que ameace a entrega.",
    objective: "Produzir, testar e documentar uma versão demonstrável do Projeto 4.",
    steps: ["Construa o caminho mínimo.", "Teste uma entrada.", "Confira o resultado.", "Reduza o escopo.", "Capture evidências.", "Ensaie a apresentação."],
    requirements: [{ kind: "external_link", label: "Demo do MVP", required: true }, { kind: "text", label: "Documentação do produto", required: true }, { kind: "file", label: "Evidência de teste", required: true }, { kind: "text", label: "Registro de escopo", required: true }, { kind: "github_repository", label: "Repositório do produto", required: false }],
    criteria: ["A demo abre para o orientador", "A demo apresenta uma entrada", "A demo apresenta um resultado", "Existe um teste concluído", "Declara uma limitação", "Registra um corte de escopo", "O repositório corresponde ao produto"],
    planB: "Demonstre com formulário, slides, protótipo, vídeo ou automação parcial.",
  },
  {
    project: 4, title: "Demo Day: eu construí isto",
    challenge: "Apresentar o AI Product e provar a evolução dos quatro projetos com backup pronto.",
    objective: "Apresentar o Projeto 4, consolidar o portfólio Explorer e registrar a reflexão final.",
    steps: ["Apresente o problema.", "Explique a solução.", "Demonstre o produto.", "Conte o principal aprendizado.", "Use o backup se necessário.", "Publique o portfólio."],
    requirements: [{ kind: "external_link", label: "Portfólio Explorer", required: true }, { kind: "file", label: "Backup da apresentação", required: true }, { kind: "external_link", label: "Registro do Demo Day", required: false }, { kind: "text", label: "Reflexão final", required: true }, { kind: "github_repository", label: "Repositório final", required: false }],
    criteria: ["Apresenta o problema", "Explica a solução", "Mostra o resultado", "Respeita cinco minutos", "Mostra o Projeto 1", "Mostra o Projeto 2", "Mostra o Projeto 3", "Mostra o Projeto 4", "Possui backup", "Responde à reflexão"],
    planB: "Apresente vídeo, prints, PDF ou demonstração simulada com roteiro.",
  },
];

/** Orientações que tornam a missão visível na Mesa de Atividade em modo demo. */
export const explorerActivityGuidance: readonly ExplorerActivityGuidance[] = [
  { context: "IA generativa produz respostas prováveis, não garantias. O primeiro hábito do Explorer é observar e conferir antes de confiar.", continuity: "Escolha um tema e um problema específico para usar na comparação de ferramentas da Atividade 2.", evidence: "Card com os quatro testes e, quando houver, um print anonimizado.", reflection: "Qual resposta você não aceitaria sem conferir e por quê?", tools: "ChatGPT, Gemini, respostas salvas ou quadro." },
  { context: "Ferramentas diferentes servem a tarefas diferentes. A escolha precisa se apoiar em evidências, não em aparência ou preferência.", continuity: "Leve a ferramenta escolhida e a mesma tarefa para refinar o prompt na Atividade 3.", evidence: "Tabela de comparação e decisão sobre a ferramenta do assistente.", reflection: "Qual critério fez você mudar ou confirmar sua escolha?", tools: "Duas ferramentas de IA, respostas salvas ou exemplos impressos." },
  { context: "Iterar o mesmo prompt torna visível como contexto, objetivo, limites e formato alteram a resposta.", continuity: "Adapte a v3 para o prompt principal do assistente antes do Project Day.", evidence: "Peça antes e depois do prompt, com o principal aprendizado.", reflection: "Qual alteração teve o maior efeito na qualidade da resposta?", tools: "Ferramenta de IA, prompts impressos ou colegas para simulação." },
  { context: "O valor do assistente está em propósito, instrução, teste e melhoria demonstráveis — não em tentar fazer tudo.", continuity: "Registre uma limitação e uma melhoria futura no dossiê do Projeto 1.", evidence: "Página do assistente com ficha, prompt, exemplos, testes e melhoria.", reflection: "Qual teste mudou uma decisão do seu assistente?", tools: "Ferramenta de IA, documento e demonstração opcional." },
  { context: "Criação visual com IA exige direção e curadoria. Variar uma decisão por vez diferencia escolha intencional de aleatoriedade.", continuity: "Leve imagem escolhida, público e mensagem para construir o brief da Atividade 6.", evidence: "Estudo de exploração visual, mostrando processo e não apenas resultado.", reflection: "Que elemento visual fez a versão escolhida comunicar melhor?", tools: "Gerador de imagem, editor visual, moodboard ou papel." },
  { context: "Estética sem público e mensagem não é comunicação. O brief conecta intenção, linguagem e peça antes do vídeo.", continuity: "Prepare referência de vídeo, clima de áudio e a frase que precisa permanecer clara na Atividade 7.", evidence: "Brief de campanha acompanhado da imagem principal.", reflection: "Como o público mudou a sua escolha de slogan ou imagem?", tools: "Documento, slides, editor visual ou imagens previamente baixadas." },
  { context: "Uma peça simples e compreensível é melhor evidência que uma produção sofisticada e inacabada.", continuity: "Liste os ajustes de imagem, áudio, ritmo e copy para concluir no Project Day.", evidence: "Primeira versão do vídeo e roteiro, preservando a evolução até a peça final.", reflection: "O que ainda precisa mudar para a mensagem ser entendida sem explicação longa?", tools: "Editor de vídeo, slides ou storyboard." },
  { context: "Este Project Day consolida direção visual, brief e vídeo. Clareza e coerência importam mais que perfeccionismo estético.", continuity: "Publique o Projeto 2 e observe uma tarefa repetitiva real para o ciclo de automação.", evidence: "Página Creative Studio com imagem, peça, copy e bastidores.", reflection: "Qual decisão de curadoria mais fortaleceu a campanha?", tools: "Editor visual, vídeo, slides e documento." },
  { context: "Automação começa entendendo o processo. Um fluxo que não se explica no papel será difícil de construir e testar.", continuity: "Escolha a versão mínima do fluxo para implementar na Atividade 10.", evidence: "Diagrama de automação acompanhado da explicação de valor.", reflection: "Qual etapa é indispensável para esse fluxo gerar valor?", tools: "Papel, post-its, quadro ou ferramenta de diagrama." },
  { context: "O objetivo não é dominar uma ferramenta: é observar uma ação acontecendo de ponta a ponta e explicar seus dados.", continuity: "Identifique uma etapa em que classificação, resumo ou geração por IA agrega valor na Atividade 11.", evidence: "Print do workflow executado com legenda de entrada, processamento e saída.", reflection: "Que dado entrou, como foi processado e qual saída provou a execução?", tools: "n8n, formulário, planilha ou simulação." },
  { context: "IA no processo exige controlar entrada, prompt, formato da resposta e destino do resultado; não é apenas conversar com um chatbot.", continuity: "Escolha o problema do Project Day e prepare um teste de sucesso e um de falha.", evidence: "Comparação entre chat isolado e IA no processo, com caso de teste.", reflection: "Como o formato da resposta da IA controla a próxima ação?", tools: "n8n, IA ou resposta mockada." },
  { context: "Problema pequeno resolvido vale mais pedagogicamente que fluxo grande e inacabado.", continuity: "Publique o Projeto 3 e observe um problema real que possa originar seu AI Product.", evidence: "Página Automation Lab com problema, diagrama, execução e resultado.", reflection: "Que limitação apareceu no teste e como ela restringe o uso da automação?", tools: "n8n, diagrama, documento e demonstração opcional." },
  { context: "Produto começa pelo problema e pelo usuário, não pela ferramenta. Uma conversa curta evita construir a partir de suposições.", continuity: "Leve somente o fluxo mínimo necessário para demonstrar a promessa central no blueprint.", evidence: "Definição do problema do AI Product, incluindo a descoberta que mudou a ideia.", reflection: "Qual descoberta sobre o usuário mudou sua ideia inicial?", tools: "Entrevista, relato, post-its ou documento." },
  { context: "Wireframe e fluxo reduzem retrabalho. Um desenho feio e claro vence um bonito e confuso.", continuity: "Comece o Build Day pelo caminho mínimo da demo e deixe extras para depois.", evidence: "Wireframe e diagrama de como o AI Product funciona.", reflection: "Que parte do fluxo precisa funcionar para a promessa ser demonstrada?", tools: "Papel, câmera, ferramenta de prototipação ou diagrama." },
  { context: "O AI Product pode usar código, formulário, mídia ou automação; o critério comum é demonstrar uma solução real para o problema.", continuity: "Congele o núcleo, corrija apenas bloqueadores e prepare problema → solução → demo → aprendizado para o Demo Day.", evidence: "Versão do MVP, teste, documentação, link e repositório opcional.", reflection: "Qual corte de escopo tornou sua demonstração mais viável?", tools: "Ferramentas escolhidas para o MVP, backup offline e documento." },
  { context: "Demo Day é ritual de evidência, não uma prova de perfeição. Problema, solução, funcionamento e aprendizado precisam ficar visíveis com backup pronto.", continuity: "Preserve links e backups e transforme o feedback em uma melhoria opcional para o próximo nível.", evidence: "Portfólio final, slides, registro da apresentação e reflexão de evolução.", reflection: "Qual foi sua maior evolução, dificuldade e próximo interesse?", tools: "Portfólio, slides, backup offline e gravação opcional." },
];
