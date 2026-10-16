# Reconciliação conservadora de anexos verificados

Escopo: bucket privado `submissions`, caminhos `tenant/aluno/atividade/arquivo/verified/uuid`. Não se aplica a outros buckets, produtos ou arquivos legados. Este procedimento não autoriza uma limpeza global nem define prazo LGPD de retenção.

## Quando o resultado de finalize é incerto

1. Repetir a operação de finalize pela aplicação autenticada. Se a RPC anterior publicou o snapshot, o retry retorna o arquivo `ready`, sem criar outra cópia. Não reenviar o arquivo só porque houve timeout.
2. Se continuar falhando, preservar o objeto e abrir incidente técnico com request ID, horário e identificador do arquivo. Não registrar senha, link assinado, nome do aluno ou conteúdo do anexo no ticket.
3. Operador autorizado verifica, em sessão privada e no tenant correto, o registro `logos_academy.uploaded_files`. Um caminho referenciado é protegido **mesmo quando o registro está soft-deleted**: exclusão lógica não é autorização de descarte físico.
4. Para um arquivo `pending`, qualquer candidato não referenciado permanece em quarentena. Outra chamada finalize ainda pode publicá-lo. Idade do objeto e ausência momentânea de referência não provam abandono.
5. Se o arquivo já estiver `ready` em outro caminho, a imutabilidade impede publicar um segundo snapshot. Uma cópia excedente só pode ser descartada após confirmar término de chamadas em voo, ausência de referência em todos os registros do bucket e aprovação do responsável pela operação. Fazer nova conferência imediatamente antes de qualquer remoção pela API Storage; nunca apagar diretamente de `storage.objects`.
6. Se houver divergência, estado desconhecido, falha de consulta, restauração de backup ou autorização insuficiente, **não apagar**. Escalar e manter os bytes preservados. A reconciliação automática destrutiva não está habilitada.

## Evidências existentes e limites

`src/tests/mvp-upload-snapshot-repository.test.ts` verifica: bytes idênticos em caminho exclusivo, retry de `ready` sem upload, remoção apenas da cópia nova em rejeição SQL definitiva, preservação em transporte incerto e recuperação de finalização concorrente. O pgTAP `068_mvp_verified_upload_snapshot.test.sql` verifica a transição e o contrato de publicação no banco; conferir o nome atual do arquivo no repositório antes de executar.

Essas provas não simulam uma queda real da conexão durante commit no provedor. O ensaio Auth/Storage deve passar e um teste de falha controlada continua necessário para declarar recuperação operacional integral. Não usar alunos reais para esse teste.

O fechamento do incidente deve registrar somente quantidade de objetos preservados/removidos, request IDs técnicos, responsável e evidência de conferência. Qualquer lista privada de caminhos deve ter acesso restrito e não entrar em artifacts públicos do GitHub.
