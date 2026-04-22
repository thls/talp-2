---
name: registrar-template-respostas
description: Registra resultados de chats com agente em planilha CSV no template definido, preenchendo Prompt, Issues, Overall result, Overall sentiment e Observations. Use quando o usuario pedir para adicionar ou registrar uma nova linha na planilha TemplateDeRespostas.csv.
---

# Registrar Template de Respostas

## Objetivo

Adicionar uma nova linha em `TemplateDeRespostas.csv` (na raiz do projeto) somente quando o usuario pedir explicitamente.

## Regras fixas

- Arquivo-alvo: `TemplateDeRespostas.csv`
- Separador: `;`
- Colunas (ordem obrigatoria):
  - `Prompt`
  - `Issues`
  - `Overall result`
  - `Overall sentiment`
  - `Observations`
- Se o arquivo nao existir, criar automaticamente com cabecalho.
- Nao adicionar linha sem comando explicito do usuario.

## Fluxo de execucao

1. Confirmar que o usuario pediu explicitamente para registrar.
2. Coletar os 5 campos:
   - `Prompt`: prompt usado no chat.
   - `Issues`: problemas encontrados.
   - `Overall result`: resultado geral (ex.: `OK`, `NOK`).
   - `Overall sentiment`: percepcao geral.
   - `Observations`: observacoes complementares.
3. Se algum campo estiver ausente, pedir somente o que faltar.
4. Executar o script utilitario:

```bash
python3 ".cursor/skills/registrar-template-respostas/scripts/add_row.py" \
  --csv "TemplateDeRespostas.csv" \
  --prompt "<PROMPT>" \
  --issues "<ISSUES>" \
  --overall-result "<OVERALL_RESULT>" \
  --overall-sentiment "<OVERALL_SENTIMENT>" \
  --observations "<OBSERVATIONS>"
```

5. Confirmar no retorno:
   - caminho do arquivo atualizado;
   - total de linhas de dados (sem contar cabecalho);
   - resumo curto do que foi registrado.

## Validacao

- Garantir que a ordem das colunas esteja correta.
- Escapar texto automaticamente via `csv` do Python.
- Preservar conteudo multilinha em celulas quando houver.

## Exemplo de acionamento

- "Adiciona esse resultado na planilha."
- "Registra esse prompt no template."
- "Pode salvar essa avaliacao no CSV."
