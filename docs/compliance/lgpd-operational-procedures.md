# Procedimentos operacionais de proteção de dados — minuta técnica

Data: 15/10/2026. Status: **não aprovado juridicamente nem operacionalmente**. Este documento descreve controles e decisões pendentes; não é parecer jurídico nem comprovação de conformidade.

## Responsabilidade e aprovação

Vinicius é o responsável operacional proposto. Deve confirmar quem representa o controlador, o contato de privacidade e o responsável substituto. A assessoria jurídica deve revisar finalidade, base de tratamento, documentos para responsáveis e regras de retenção antes da liberação para alunos reais.

| Gate | Evidência necessária | Estado |
|---|---|---|
| Revisão jurídica | Documento revisado, identidade do revisor, data e versão | Pendente |
| Aprovação operacional | Aceite explícito de Vinicius registrado na conversa em 16/10/2026, condicionado às pendências jurídica e técnica abaixo | Aprovado pelo responsável do produto |
| Ensaio técnico | Exportação, revogação e descarte verificados em ambiente isolado | Pendente |

## Dados e finalidade operacional

O sistema organiza matrícula, encontros, atividades, evidências e feedback. Nome, e-mail, nascimento e contato do responsável não devem ser utilizados para publicidade ou repassados a terceiros sem avaliação separada. Evidências pedagógicas podem conter informações pessoais: orientar alunos a não enviar chaves, documentos de identidade ou dados de outras pessoas.

E-mail e nascimento e os campos pessoais previstos no banco usam criptografia. Nem todo texto pedagógico é criptografado: entregas, títulos e feedback continuam sujeitos a controle de acesso e minimização. Administradores não devem incluir dados sensíveis desnecessários em observações.

## Admissão e consentimento

Conferir responsável e documentação fora da plataforma. A confirmação do arquivo físico só pode ser marcada após conferência; registrar versão e data do termo. Guardar o documento físico em local restrito e definir seu responsável de custódia. O convite enviado manualmente por WhatsApp é individual; conferir destinatário e não postar links em grupos. Não pedir senha nem compartilhar acesso administrativo.

## Acesso, revogação e anexos

Usar contas individuais e menor privilégio; revisar acessos administrativos periodicamente. A revogação de consentimento deve interromper o acesso conforme o fluxo implementado, sem apagar automaticamente evidências que precisam de decisão de retenção. Tenant excluído deve deixar de autenticar e autorizar operações.

URLs de leitura já emitidas podem permanecer válidas por até cinco minutos. Não prometê-las revogadas instantaneamente. Uploads novos são inspecionados por formato/tamanho e preservados em cópia verificada não gravável pelo aluno; isso não é proteção antivírus completa. Nunca emitir URLs de escrita para o caminho verificado.

Erros não devem registrar conteúdo de entregas, e-mails, tokens, senhas ou mensagens brutas do provedor. Relatórios de suporte devem usar identificadores técnicos, operação e código permitido. Não anexar capturas com dados de menores a issues públicas.

## Atendimento e exportação

Receber solicitação por canal restrito, verificar a identidade e a representação do solicitante, registrar protocolo, responsável e decisão. O prazo e o procedimento jurídico de atendimento dependem da revisão humana. Nunca entregar um dump de banco ou dados de outro aluno/tenant.

A exportação deve reunir somente os registros autorizados e seus anexos, ser conferida por segunda pessoa quando possível e usar entrega protegida com expiração. Não existe comprovação de um fluxo automático de exportação nesta versão; até sua validação, qualquer atendimento exige operação administrativa controlada e conferência antes do envio.

## Retenção, exclusão e backups

Não estabelecer prazos arbitrários como se fossem exigência legal. Aprovar uma tabela de retenção para matrícula, termos, evidências, logs e backups, com finalidade, evento inicial, duração, exceções e responsável. Esses prazos ainda não foram decididos nem automatizados.

Soft delete não equivale a eliminação definitiva. Antes de descarte, verificar vínculos, solicitações em andamento e outras finalidades aprovadas; preservar a conta administrativa e outros produtos do banco compartilhado. Exclusões materiais exigem alvos exatos, revisão e evidência de execução, sem publicar dados removidos em logs.

Falhas de rede podem deixar cópia de upload sem confirmação de publicação. Não apagá-la apenas por idade ou por erro no cliente: conferir referências e operações pendentes antes de reconciliar objetos órfãos. Rejeições SQL definitivas removem somente a cópia recém-criada, não a evidência publicada.

Documentar a janela real de retenção de backups contratada e a política de restauração. Uma restauração precisa reaplicar restrições e decisões de eliminação anteriores. Não há prova de expurgo de backups neste documento.

## Incidente e recuperação

Restringir acesso afetado, preservar evidências técnicas mínimas e registrar início, escopo e medidas. Acionar o responsável operacional e a assessoria jurídica para avaliar comunicação e atendimento; não inventar conclusão ou prazo legal. Testar recuperação em ambiente isolado e confirmar que isolamento, consentimento e revogações continuam válidos.

## Condição de fechamento

Só alterar o status desta minuta com evidência identificável da revisão e aprovação humanas. A autorização genérica para construir o MVP não supre essas aprovações. Pendências de exportação, retenção e recuperação devem ser classificadas pelo responsável e comprovadas tecnicamente antes de afirmar conclusão integral.
