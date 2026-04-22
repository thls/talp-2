# Histórias de Usuário — Sistema Acadêmico de Avaliações

## História 1 — Cadastrar aluno
**Como** professor responsável por uma turma  
**Quero** cadastrar um aluno com nome, CPF e e-mail  
**Para que** eu possa acompanhar avaliações e comunicação acadêmica de forma individual

## Validação INVEST
- I: ok - entrega valor sem depender das demais operações de aluno.
- N: ok - não impõe tecnologia ou arquitetura específica.
- V: ok - habilita rastreio e avaliação por aluno.
- E: ok - campos e regras são objetivos.
- S: ok - fluxo único de criação com validações básicas.
- T: ok - critérios de aceite mensuráveis definidos.

## Critérios de aceite
1. Dado que estou na página de alunos, quando informo `nome`, `CPF` válido e `email` válido e confirmo o cadastro, então o sistema deve persistir o aluno e exibí-lo na lista imediatamente.
2. Dado que o CPF informado já existe no cadastro, quando tento salvar um novo aluno, então o sistema deve bloquear o cadastro e exibir mensagem de duplicidade de CPF.
3. Dado que qualquer campo obrigatório (`nome`, `CPF`, `email`) está ausente, quando tento salvar, então o sistema deve impedir a gravação e destacar os campos inválidos.
4. Dado que o e-mail está em formato inválido, quando tento salvar o cadastro, então o sistema deve rejeitar a operação e informar formato de e-mail inválido.
5. Dado que o cadastro foi concluído com sucesso, quando eu recarrego a aplicação, então o aluno deve continuar visível na lista por ter sido persistido em JSON.

---

## História 2 — Editar dados de aluno
**Como** professor responsável por uma turma  
**Quero** alterar os dados cadastrais de um aluno  
**Para que** as informações de identificação e contato permaneçam corretas

## Validação INVEST
- I: ok - pode ser entregue independentemente da remoção de alunos.
- N: ok - não define detalhes técnicos de interface.
- V: ok - reduz erro operacional em comunicações e registros.
- E: ok - atualização de campos bem delimitados.
- S: ok - edição pontual em registro existente.
- T: ok - resultados observáveis e auditáveis na listagem.

## Critérios de aceite
1. Dado que existe um aluno cadastrado, quando altero `nome` e/ou `email` para valores válidos e salvo, então os novos dados devem aparecer na listagem sem duplicar registro.
2. Dado que tento alterar o CPF de um aluno para um CPF já existente em outro registro, quando salvo a edição, então o sistema deve impedir a alteração e informar duplicidade.
3. Dado que envio um dado inválido (ex.: e-mail sem `@`), quando confirmo a edição, então o sistema deve rejeitar a atualização e manter os dados anteriores.
4. Dado que a alteração foi salva com sucesso, quando recarrego a aplicação, então os dados atualizados devem permanecer no JSON.

---

## História 3 — Remover aluno
**Como** professor responsável por uma turma  
**Quero** remover um aluno cadastrado  
**Para que** a base permaneça alinhada com a situação real da turma

## Validação INVEST
- I: ok - entrega independente das demais histórias.
- N: ok - não exige mecanismo específico de confirmação.
- V: ok - mantém base consistente e sem registros obsoletos.
- E: ok - regra de remoção é clara.
- S: ok - ação única de exclusão.
- T: ok - efeitos visíveis em listagem e persistência.

## Critérios de aceite
1. Dado que o aluno existe e não possui vínculo impeditivo definido pelas regras de negócio, quando confirmo a remoção, então o aluno deve ser excluído da lista e do JSON.
2. Dado que o usuário aciona remover e cancela na confirmação, quando fecha o diálogo, então nenhuma alteração deve ocorrer no cadastro.
3. Dado que o aluno removido possuía avaliações registradas em turmas, quando a remoção é concluída, então o sistema deve remover também os vínculos e avaliações desse aluno nessas turmas.
4. Dado que a remoção foi concluída, quando recarrego a aplicação, então o aluno não deve reaparecer na listagem.

---

## História 4 — Visualizar listagem de alunos
**Como** professor  
**Quero** visualizar uma página com os alunos cadastrados  
**Para que** eu tenha visão rápida da base e possa iniciar ações de manutenção

## Validação INVEST
- I: ok - pode ser entregue sem edição ou remoção.
- N: ok - não prende implementação de paginação/filtro.
- V: ok - melhora operação e conferência dos dados.
- E: ok - saída esperada é objetiva.
- S: ok - foco em consulta.
- T: ok - critérios verificáveis na interface.

## Critérios de aceite
1. Dado que existem alunos persistidos, quando acesso a página de alunos, então devo visualizar uma lista contendo `nome`, `CPF` e `email` de cada aluno.
2. Dado que não existem alunos cadastrados, quando acesso a página de alunos, então devo visualizar estado vazio com mensagem informativa.
3. Dado que há dados persistidos em JSON, quando a página é carregada, então a listagem deve refletir exatamente o conteúdo persistido.

---

## História 5 — Gerenciar turmas (incluir, alterar e remover)
**Como** professor  
**Quero** cadastrar e manter turmas com tópico, ano, semestre e alunos matriculados  
**Para que** eu organize avaliações por contexto acadêmico correto

## Validação INVEST
- I: ok - valor direto mesmo sem edição de avaliações.
- N: ok - sem impor desenho técnico interno.
- V: ok - estrutura o domínio por turma e período.
- E: ok - atributos e operações delimitados.
- S: ajustar - para manter pequena, tratada por operação com critérios independentes no mesmo épico.
- T: ok - resultados observáveis na interface e persistência.

## Critérios de aceite
1. Dado que estou na gestão de turmas, quando informo `tópico`, `ano` e `semestre` válidos e salvo, então uma nova turma deve ser criada e exibida na lista de turmas.
2. Dado que uma turma existe, quando altero seu `tópico`, `ano` ou `semestre` com valores válidos, então a turma deve refletir os novos dados sem perder os alunos e avaliações já associados.
3. Dado que uma turma existe, quando confirmo sua remoção, então a turma deve ser excluída da visualização e da persistência JSON.
4. Dado que uma turma já existe com a mesma combinação `tópico + ano + semestre`, quando tento cadastrar outra igual, então o sistema deve bloquear duplicidade de identificação de turma.
5. Dado que uma turma foi incluída ou alterada, quando recarrego a aplicação, então os dados da turma devem permanecer conforme persistido.

---

## História 6 — Visualizar turma com alunos e avaliações separadamente
**Como** professor  
**Quero** abrir cada turma e ver apenas seus alunos e suas avaliações  
**Para que** eu não misture resultados de contextos diferentes

## Validação INVEST
- I: ok - consulta separada de edição de avaliações.
- N: ok - sem prescrever layout específico além da separação.
- V: ok - evita leitura incorreta de desempenho.
- E: ok - regra de escopo por turma é clara.
- S: ok - história de visualização focada.
- T: ok - escopo verificável por dados exibidos.

## Critérios de aceite
1. Dado que existem duas ou mais turmas com alunos distintos, quando acesso os detalhes de uma turma específica, então devo ver apenas os alunos matriculados nela.
2. Dado que um aluno está em múltiplas turmas, quando visualizo cada turma individualmente, então as avaliações mostradas devem corresponder somente ao contexto da turma aberta.
3. Dado que uma turma não possui alunos matriculados, quando acesso seus detalhes, então a tela deve exibir estado vazio de alunos sem erro de carregamento.

---

## História 7 — Preencher e alterar avaliações por metas (MANA, MPA, MA)
**Como** professor  
**Quero** registrar e atualizar avaliações de metas por aluno em formato tabular  
**Para que** eu acompanhe evolução de requisitos como Requisitos, Testes e outras metas

## Validação INVEST
- I: ok - depende apenas da existência de turma/aluno no domínio.
- N: ok - não define detalhes de componente de tabela.
- V: ok - materializa acompanhamento pedagógico.
- E: ok - domínio de valores é fechado e mensurável.
- S: ok - operação focada em manter conceitos por meta.
- T: ok - validações e persistência testáveis.

## Critérios de aceite
1. Dado que estou na página de avaliações de uma turma, quando visualizo a tabela, então a primeira coluna deve conter nomes dos alunos e cada meta deve aparecer em coluna própria.
2. Dado que seleciono um conceito para uma meta de um aluno, quando salvo a alteração, então o valor deve aceitar somente `MANA`, `MPA` ou `MA`.
3. Dado que tento persistir um conceito fora do conjunto permitido, quando confirmo a edição, então o sistema deve rejeitar o valor e manter o conceito anterior válido.
4. Dado que altero uma ou mais metas de um aluno, quando salvo, então as avaliações devem ser persistidas em JSON no escopo da turma correta.
5. Dado que recarrego a aplicação após salvar, quando retorno à turma, então os conceitos registrados devem permanecer consistentes com a última gravação.

---

## História 8 — Persistir dados em JSON
**Como** administrador da aplicação  
**Quero** que alunos, turmas e avaliações sejam persistidos em JSON  
**Para que** os dados não sejam perdidos entre reinicializações

## Validação INVEST
- I: ok - transversal, porém com objetivo isolado de persistência.
- N: ok - não exige banco específico além de JSON.
- V: ok - garante continuidade operacional.
- E: ok - entidades a persistir estão claramente listadas.
- S: ok - escopo definido de leitura/escrita.
- T: ok - verificável por reinício e comparação de dados.

## Critérios de aceite
1. Dado que realizei operações de inclusão/edição/remoção em alunos, turmas e avaliações, quando a aplicação encerra, então os dados devem ser gravados em arquivo JSON válido.
2. Dado que a aplicação inicia com JSON existente, quando o sistema carrega, então deve reconstruir o estado completo (alunos, turmas, matrículas e avaliações) sem perdas.
3. Dado que ocorre erro de leitura ou escrita do JSON, quando uma operação depende de persistência, então o sistema deve informar falha de forma explícita e não apresentar sucesso falso ao usuário.
4. Dado que o JSON está íntegro, quando executo operações consecutivas, então a estrutura do arquivo deve permanecer consistente e parseável.

---

## História 9 — Consolidar notificações por e-mail diário ao aluno
**Como** aluno avaliado  
**Quero** receber no máximo um e-mail diário consolidando todas as avaliações alteradas  
**Para que** eu seja informado sem excesso de mensagens

## Validação INVEST
- I: ok - funcionalidade autônoma de notificação.
- N: ok - sem detalhar provedor de e-mail.
- V: ok - aumenta clareza e reduz ruído de comunicação.
- E: ok - regra de agregação diária é objetiva.
- S: ajustar - pode ser dividida em captura de mudanças + envio consolidado, mas ainda implementável em iteração curta.
- T: ok - comportamento temporal e conteúdo são testáveis.

## Critérios de aceite
1. Dado que o professor altera uma ou mais avaliações de um aluno no mesmo dia (inclusive em turmas diferentes), quando o processo diário de notificação é executado, então deve ser enviado exatamente um e-mail para esse aluno contendo todas as mudanças do dia.
2. Dado que o professor altera avaliações de um aluno em dias diferentes, quando cada dia é processado, então deve haver no máximo um e-mail por dia com as alterações daquele dia.
3. Dado que nenhuma avaliação de um aluno foi alterada no dia, quando o processo diário é executado, então nenhum e-mail deve ser enviado para esse aluno.
4. Dado que há alterações em múltiplas metas e turmas no mesmo dia, quando o e-mail consolidado é gerado, então o conteúdo deve discriminar turma, meta, conceito anterior (quando existir) e conceito novo para cada item alterado.
5. Dado que ocorre falha no envio do e-mail diário, quando o sistema registra a tentativa, então a falha deve ser marcada para reprocessamento sem gerar múltiplos envios duplicados no mesmo dia.
