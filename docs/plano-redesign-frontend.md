# Plano: Redesign Visual do Frontend — Academic Precision

## Context

O frontend atual não tem nenhum CSS (apenas estilos padrão do navegador). O projeto possui arquivos de design prontos em `design/` com HTML prototipado usando Tailwind CDN. A tarefa é instalar o Tailwind como pacote npm, configurar os tokens do design system "Academic Precision", e reescrever o `App.tsx` para refletir fielmente as quatro telas prototipaadas.

---

## Arquivos Críticos

| Arquivo | Ação |
|---|---|
| `sistema/frontend/index.html` | Adicionar fontes + Material Symbols |
| `sistema/frontend/tailwind.config.js` | Criar com tokens do design system |
| `sistema/frontend/postcss.config.js` | Criar via `tailwindcss init -p` |
| `sistema/frontend/src/index.css` | Criar com diretivas Tailwind + base styles |
| `sistema/frontend/src/main.tsx` | Importar `./index.css` |
| `sistema/frontend/src/App.tsx` | Reescrever JSX com Tailwind + nova view Dashboard |
| `sistema/backend/src/app.ts` | Adicionar `GET /stats` |

---

## Passo 1 — Instalar Tailwind CSS (via Docker)

```bash
docker exec sistema-frontend npm install tailwindcss@3 postcss autoprefixer
docker exec sistema-frontend npx tailwindcss init -p
```

---

## Passo 2 — `tailwind.config.js`

Configurar exatamente com os tokens extraídos dos protótipos HTML:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#15196c",
        "on-primary": "#ffffff",
        "primary-container": "#2d3282",
        "on-primary-container": "#999ff5",
        "primary-fixed": "#e0e0ff",
        "primary-fixed-dim": "#bfc2ff",
        "on-primary-fixed": "#070963",
        "on-primary-fixed-variant": "#393e8e",
        "secondary": "#505f76",
        "on-secondary": "#ffffff",
        "secondary-container": "#d0e1fb",
        "on-secondary-container": "#54647a",
        "secondary-fixed": "#d3e4fe",
        "secondary-fixed-dim": "#b7c8e1",
        "on-secondary-fixed": "#0b1c30",
        "on-secondary-fixed-variant": "#38485d",
        "tertiary": "#002d1c",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#00452e",
        "on-tertiary-container": "#43ba8a",
        "tertiary-fixed": "#85f8c4",
        "tertiary-fixed-dim": "#68dba9",
        "on-tertiary-fixed": "#002114",
        "on-tertiary-fixed-variant": "#005137",
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "background": "#f7f9fb",
        "on-background": "#191c1e",
        "surface": "#f7f9fb",
        "surface-dim": "#d8dadc",
        "surface-bright": "#f7f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "on-surface": "#191c1e",
        "on-surface-variant": "#464651",
        "surface-variant": "#e0e3e5",
        "outline": "#777682",
        "outline-variant": "#c7c5d3",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        "inverse-primary": "#bfc2ff",
        "surface-tint": "#5156a7",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
      spacing: {
        base: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "20px",
        margin: "24px",
      },
      fontFamily: {
        h1: ["Lexend", "sans-serif"],
        h2: ["Lexend", "sans-serif"],
        h3: ["Lexend", "sans-serif"],
        "body-lg": ["Public Sans", "sans-serif"],
        "body-md": ["Public Sans", "sans-serif"],
        "body-sm": ["Public Sans", "sans-serif"],
        "label-caps": ["Public Sans", "sans-serif"],
        "data-table": ["Public Sans", "sans-serif"],
      },
      fontSize: {
        h1: ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["20px", { lineHeight: "1.4", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1", fontWeight: "600", letterSpacing: "0.05em" }],
        "data-table": ["14px", { lineHeight: "1.4", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
};
```

---

## Passo 3 — `index.html`

Adicionar no `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&family=Public+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<title>EduCore Admin</title>
```

---

## Passo 4 — `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  display: inline-block;
  vertical-align: middle;
}

body {
  background-color: #f7f9fb;
  min-height: 100dvh;
}
```

---

## Passo 5 — `src/main.tsx`

Adicionar `import "./index.css";` antes das demais importações.

---

## Passo 6 — Backend: `GET /stats`

Adicionar em `sistema/backend/src/app.ts`:

```typescript
app.get("/stats", async () => {
  const students = await studentStore.list();
  const classes = await classStore.list();
  const grades = await gradeStore.getAll(); // ou contagem via getForClass acumulada
  return {
    studentCount: students.length,
    classCount: classes.length,
    gradeCount: grades.length,
  };
});
```

`gradeStore` precisará de um método `getAll()` ou o stats pode somar os arrays por turma. Solução mais simples: adicionar `getAll()` em `GradeStore` que retorna `this.data.grades`.

---

## Passo 7 — `App.tsx` — Reescrita do JSX

### Novos tipos/estado

```typescript
type View = { type: "dashboard" } | { type: "students" } | { type: "classes" } | { type: "classDetail"; classId: string };
type Stats = { studentCount: number; classCount: number; gradeCount: number };
```

Adicionar `const [stats, setStats] = useState<Stats | null>(null)` e fetch no mount + ao navegar para dashboard.

### Layout Shell

```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │  TopBar (sticky, h-16)             │
│ (w-64,   ├────────────────────────────────────┤
│  fixed)  │  <main class="ml-64 p-8">          │
│          │    <DashboardView />                │
│          │    <StudentsView />                 │
│          │    <ClassesView />                  │
│          │    <ClassDetailView />              │
└──────────┴────────────────────────────────────┘
```

### Sidebar (componente inline)

- `fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col py-6 z-50`
- Logo: `text-xl font-black text-[#2D3282] tracking-tight font-h1`
- Nav items (em português): Dashboard, Alunos, Turmas, Avaliações
- Icons: `dashboard`, `group`, `calendar_today`, `grade`
- Active state: `bg-slate-50 border-r-4 border-[#2D3282] text-[#2D3282] font-bold`
- Inactive state: `text-slate-500 hover:bg-slate-50 hover:text-[#2D3282] transition-all`

### TopBar

- `ml-64 sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8`
- Esquerda: ícone menu + título da view atual em Lexend
- Direita: search input (arredondado, `bg-slate-100`) + ícone notificações

### Dashboard View

Fetch `GET /stats` on mount. Exibir 3 cards de métricas:

```
┌─────────────────┬─────────────────┬─────────────────┐
│ 👥 Alunos       │ 📅 Turmas       │ ⭐ Avaliações    │
│   {count}       │   {count}       │   {count}        │
└─────────────────┴─────────────────┴─────────────────┘
```

Cards: `bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-primary/30`

### Students View

- Header: `<h1 class="font-h1 text-primary">Alunos</h1>` + botão "Novo Aluno" (primary)
- Form: `bg-white rounded-xl border border-slate-200 p-6 mb-6` com inputs estilizados
- Tabela: `bg-white rounded-xl border border-slate-200 overflow-hidden`
  - Header sticky com `bg-surface-container-low`
  - Zebra-striping: filas pares com `bg-surface-container-lowest`, ímpares com `bg-white`
  - Botões de ação: ghost com ícone `edit` / `delete`

Manter labels em português: "Nome", "CPF", "Email", botões "Salvar"/"Cancelar"/"Remover" — **crítico para os testes passarem**.

### Classes View

- Header + botão "Nova Turma"
- Form inline com inputs topic/year/semester
- Tabela com colunas: Disciplina, Ano, Semestre, Alunos matriculados, Ações
- Botão "Ver turma" mantido (usado nos testes)

### Class Detail View

- Breadcrumb: `Turmas > {topic} — {year}/{semester}`
- Seção "Alunos matriculados": lista + dropdown Matricular
- Seção "Avaliações": tabela grade (alunos × metas) com select por célula + botão Salvar por linha
- Preservar `aria-label` em português nos selects (ex: `Requisitos de Ana`) — **crítico para os testes**

---

## Passo 8 — Compatibilidade dos Testes

Os testes existentes em `App.test.tsx` dependem de:
- Botões com texto: "Alunos", "Turmas" (navegação) → substituídos por itens de sidebar mas mantendo o mesmo texto
- Heading `Alunos` / `Turmas` / `Detalhe da turma`
- `aria-label` dos selects de conceito (ex: `/requisitos de ana/i`)
- Botões "Salvar", "Cancelar", "Remover", "Desmatricular"
- `role="combobox"` ou `role="option"` nos selects

A navegação passará a ser clicando em itens de sidebar com os mesmos rótulos. Os testes usam `getByRole("button", { name: /alunos/i })` — se os itens de nav forem `<button>` ou `<a>`, precisamos manter o mesmo role/text.

**Solução**: Manter itens de nav como `<button>` com os labels em português: "Dashboard", "Alunos", "Turmas". O item "Avaliações" aponta para a última class detail visitada (ou fica desabilitado sem contexto).

---

## Passo 9 — Verificação

```bash
# Instalar dependências
docker exec sistema-frontend npm install tailwindcss@3 postcss autoprefixer

# Rodar testes frontend
docker exec sistema-frontend npm test

# Rodar testes backend (stats endpoint)
docker exec sistema-backend npm test

# Acessar no browser
# http://localhost:5173
```

Verificar visualmente:
1. Sidebar fixa com 4 itens de navegação
2. Dashboard com 3 cards de métricas
3. Students: tabela zebrada, form de cadastro
4. Classes: tabela, form inline
5. Class detail: tabela de notas editável
