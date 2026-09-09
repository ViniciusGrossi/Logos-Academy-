# Ideia — Logos Academy Platform

**Data:** 2026-08-31  
**Estado:** aguardando `IDEA LOCK`  
**Produto tipo recomendado:** `saas-premium`

## Tese em uma frase

Uma plataforma de apoio à formação presencial em que o aluno encontra o próximo passo, envia evidências e vê seu projeto evoluir, enquanto o admin organiza currículo, frequência, entregas e feedbacks em um único lugar.

## Problema

Depois das aulas presenciais, conceitos, atividades, entregas e feedbacks ficam fragmentados no WhatsApp. O aluno perde continuidade e não enxerga sua evolução com clareza; o admin perde uma visão confiável do acompanhamento de cada pessoa.

O problema não é a ausência de videoaulas. A aula principal já acontece presencialmente. O problema é a ausência de continuidade estruturada entre os encontros.

## Público-alvo específico

### Usuário principal

Jovens de 12 a 17 anos, iniciantes em tecnologia, capazes de operar um computador e com computador e internet disponíveis fora da Academy. Contato prévio com IA é desejável, mas não obrigatório. As turmas presenciais têm até seis alunos.

### Cliente econômico

Responsável pelo jovem, que decide e paga pela formação presencial. O principal sinal de valor para ele são projetos concluídos, apoiados por evidências de frequência, regularidade e evolução.

### Quem não é o público inicial

- adultos;
- alunos avançados;
- estudantes sem computador ou internet fora da Academy;
- ensino totalmente assíncrono ou autônomo;
- turmas com mais de seis alunos;
- outras escolas usando a plataforma como SaaS.

## Jobs-to-be-done

### Aluno

Depois de cada encontro presencial, saber o que precisa fazer, consultar conceitos quando necessário, enviar a atividade e perceber o projeto tomando forma gradualmente.

### Admin

Conduzir turmas e atendimentos individuais, controlar presença e progressão, revisar entregas e manter todo o histórico pedagógico organizado sem depender do histórico de conversas do WhatsApp.

### Professor — futuro

Conduzir apenas as turmas atribuídas, registrar presença, liberar atividades e avaliar entregas sem alterar o currículo canônico.

### Responsável — futuro

Acompanhar frequência, pendências, projetos, progresso e todo feedback pedagógico compartilhado com o aluno, sem poder editar ou entregar atividades.

## Alternativa atual e concorrência

A alternativa real é o WhatsApp. Ele é familiar e rápido, mas atividades se perdem na conversa, feedback não tem estado, materiais são difíceis de reencontrar e não existe trajetória acumulada.

LMSs tradicionais são concorrentes indiretos, mas partem do consumo de conteúdo gravado. A cunha da Logos Academy é outra: continuidade da aula presencial, progressão controlada por projetos e evidência acumulada.

## Conceito do produto

O produto é um **Estúdio de Aprendizagem Guiada**, não um LMS de videoaulas.

```text
Aula presencial
→ conceito de referência
→ atividade curta
→ entrega
→ feedback
→ aprovação
→ próxima etapa
→ projeto concluído
→ portfólio interno
```

Os conceitos funcionam como glossário consultável. As atividades constroem um projeto de modo gradual. O admin controla a liberação para impedir que o aluno pule fundamentos ou tente concluir tudo de uma vez.

## Modelo operacional inicial

- Um único tenant: Logos Academy.
- Até três turmas simultâneas, com no máximo seis alunos cada.
- Até cinco alunos em atendimento individual.
- Duas aulas presenciais por semana.
- Conclusão exige 100% de frequência; toda ausência precisa ser reposta, mesmo que em outra data.
- Primeira formação validada: Explorer.
- Turma e atendimento individual usam o mesmo currículo; muda o calendário e a liberação.
- Atividade regular: 15–30 minutos.
- Marco de projeto: até 45 minutos.
- Meta de feedback: até 48 horas.
- Carga estimada de revisão do admin: quatro a seis horas por semana.

## Identidade e propriedade

O tenant representa a organização Logos Academy. Cada pessoa possui uma conta; cada aluno possui uma identidade acadêmica permanente; cada participação em uma formação gera uma matrícula; a turma é opcional.

```text
Logos Academy
└── Aluno
    ├── matrícula em turma → calendário coletivo
    ├── matrícula individual → calendário próprio
    └── histórico, projetos e portfólio permanentes
```

Entregas, feedbacks e progresso pertencem ao aluno e à matrícula. Informações coletivas pertencem à turma. Um aluno pode ter várias matrículas ao longo do tempo sem perder sua trajetória.

## Núcleo irredutível do MVP

### Aluno

- ativação de conta por convite;
- início orientado à próxima ação, com próxima aula, atividade pendente e feedback recente;
- glossário conceitual do Explorer;
- acesso apenas ao conteúdo liberado;
- entrega por texto, arquivo ou URL de repositório GitHub;
- correção e reenvio;
- acompanhamento de etapas concluídas;
- portfólio interno de projetos aprovados.

O perfil GitHub é apenas vinculado por nome de usuário. Não haverá OAuth, token ou leitura automática de repositórios.

### Admin

- convite de alunos e registro manual de consentimento do responsável;
- turmas e matrículas individuais;
- currículo Explorer pré-cadastrado;
- calendário de encontros;
- registro de presença;
- liberação coletiva ou individual de atividades;
- revisão com aprovação, correção ou liberação excepcional;
- painel de pendências e taxa de entrega.

### Estados essenciais

```text
Atividade: Bloqueada → Disponível → Enviada → Em revisão
                                      ├→ Correção solicitada → Reenviada
                                      └→ Aprovada

Frequência: Presente | Ausente | Falta justificada
Matrícula: Convidada → Ativa → Concluída | Pausada | Cancelada
```

Enviar uma atividade não desbloqueia automaticamente a etapa seguinte. Atraso não impede presença nas aulas, mas mantém bloqueada a progressão dependente. O admin pode criar recuperação ou liberar excepcionalmente.

## Fora do MVP

- interfaces de professor e responsável;
- pagamentos, cobrança e checkout;
- videoaulas e player;
- editor completo de currículo;
- cadastro público;
- portfólio público;
- OAuth ou análise automática do GitHub;
- notificações automáticas por WhatsApp;
- demonstração pública autônoma;
- badges, ranking, tutor de IA e gamificação;
- motor complexo de competências;
- Builder e Engineer como fluxos validados.

O hub permanece a superfície pública. Demonstrações da plataforma serão conduzidas pelo admin com dados fictícios.

## Monetização

A plataforma não é vendida separadamente e não processa pagamentos no MVP. A receita vem da formação presencial paga pelo responsável. A plataforma aumenta a qualidade percebida, organiza a entrega e produz evidências do resultado.

## Métricas de sucesso

### Principal

Pelo menos 80% das atividades liberadas são entregues e aprovadas antes da aula seguinte.

### Auxiliares

- feedback enviado em até 48 horas;
- todos os alunos ativos concluem ao menos um projeto aprovado no Explorer;
- frequência, atrasos e correções permanecem visíveis por aluno;
- nenhuma matrícula é concluída enquanto houver encontro sem presença ou reposição registrada;
- revisão administrativa permanece entre quatro e seis horas semanais.

## Hipóteses a validar

- atividades de até 30 minutos terão adesão suficiente entre dois encontros semanais;
- o bloqueio pedagógico aumentará qualidade sem gerar frustração excessiva;
- critérios pré-cadastrados permitirão revisão em aproximadamente cinco minutos para atividades regulares;
- projetos concluídos serão evidência de valor suficiente para os responsáveis;
- os alunos usarão a plataforma como fonte canônica, mantendo o WhatsApp apenas para urgências.

## Objeções

### “Os alunos continuarão ignorando as atividades.”

É o risco principal. A resposta não será gamificação: atividades curtas, prazo claro, conferência no encontro seguinte e progressão do projeto condicionada à entrega.

### “Um único admin não conseguirá revisar tudo.”

No volume inicial de até 23 alunos, critérios pré-cadastrados e feedback curto limitam a revisão a quatro–seis horas semanais. Marcos recebem análise detalhada; atividades regulares recebem retorno objetivo.

### “O bloqueio fará alunos atrasados desistirem.”

O aluno continua frequentando e consultando conceitos. Apenas a etapa dependente permanece bloqueada. Correção, recuperação e liberação excepcional evitam becos sem saída.

### “Isso é apenas um Google Classroom menor.”

Não. O núcleo não é distribuir conteúdo, mas conectar cada encontro a uma atividade, cada atividade a um marco de projeto e cada aprovação a uma trajetória permanente.

### “Dados de menores podem aparecer em demonstrações ou portfólios.”

O ambiente é fechado, o portfólio é privado e a ativação exige consentimento do responsável registrado pelo admin. Demonstrações usam exclusivamente dados fictícios.

### “O escopo pode voltar a crescer para um LMS completo.”

Videoaulas, catálogo, IA, ranking, pagamentos, CMS e automações estão explicitamente fora do MVP. Qualquer entrada exige Spec Sync Request depois do PRD Lock.

## Produto tipo

`saas-premium`. O sistema possui autenticação, dados de menores, arquivos, múltiplos papéis, RLS e evolução operacional. Também precisa de acabamento visual alto para funcionar como demonstração da capacidade da Logos Academy. O tipo `mvp` reduziria rigor visual, motion e validação incompatíveis com esse objetivo.

## Placar da Entrevista

| Dimensão | Clareza | Nota |
|---|---|---|
| D1 Problema | ✅ | Fragmentação pós-aula no WhatsApp quebra continuidade e acompanhamento. |
| D2 Público | ✅ | Jovens de 12–17 anos, iniciantes, com computador e internet; responsável é o comprador. |
| D3 Job | ✅ | Aluno continua a construção; admin controla e acompanha a progressão. |
| D4 Alternativa atual | ✅ | WhatsApp, simples mas sem estrutura, estado ou trajetória. |
| D5 Concorrência | ✅ | WhatsApp é o status quo; LMS tradicional é indireto; cunha é progressão presencial por projetos. |
| D6 Escopo/MVP | ✅ | Explorer, admin e aluno; fluxo completo de liberação, entrega, revisão e evidência. |
| D7 Viabilidade técnica | ✅ | Volume inicial baixo; riscos principais são dados de menores, arquivos, RLS e bloqueios. |
| D8 Monetização | ✅ | Formação presencial paga pelo responsável; cobrança permanece externa. |
| D9 Métrica | ✅ | 80% das atividades entregues e aprovadas antes do encontro seguinte. |
| D10 Riscos | ✅ | Adesão é o risco principal; mitigação operacional definida. |

**Dúvidas abertas remanescentes:** nenhuma impeditiva para a Fase 2. As hipóteses listadas precisam ser medidas na turma piloto.  
**Alternativas descartadas:** LMS de videoaulas, estúdio de projetos sem orientação, tenant por aluno, OAuth GitHub, CMS completo e demonstração pública no MVP.

## Fonte legada

O documento `../prd-plataforma-logos-academy.md` é referência histórica e não é fonte de verdade. O novo `docs/PRD.md` será escrito do zero na Fase 2 após aprovação explícita deste documento.
