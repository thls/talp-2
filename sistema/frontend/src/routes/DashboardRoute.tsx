import type { Class, Stats, Student } from "./types";

type Props = {
  stats: Stats | null;
  students: Student[];
  classes: Class[];
  panelClass: string;
  tableHeaderClass: string;
  tableCellClass: string;
  calendarItems: string[];
  onNewEnrollment: () => void;
};

export function DashboardRoute({
  stats,
  students,
  classes,
  panelClass,
  tableHeaderClass,
  tableCellClass,
  calendarItems,
  onNewEnrollment
}: Props) {
  const dashboardActivities = [
    { title: "Notas publicadas", desc: "Resultados de Cálculo do semestre foram liberados.", time: "12:45" },
    { title: "Novas matrículas", desc: "12 novos alunos ingressaram no período atual.", time: "10:30" },
    { title: "Manutenção", desc: "Portal de alunos ficará indisponível por 15 minutos.", time: "09:15" }
  ];

  return (
    <section className="space-y-8">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">Bem-vindo de volta, Professor</h1>
          <p className="text-body-lg text-secondary">Resumo de desempenho acadêmico do semestre atual.</p>
        </div>
        <button
          type="button"
          onClick={onNewEnrollment}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-on-primary shadow-sm hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Ir para turmas
        </button>
      </div>
      <div className="mb-2 grid gap-6 md:grid-cols-4">
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">groups</span>
            <span className="text-[12px] font-bold text-tertiary-fixed-dim">+4.2%</span>
          </div>
          <p className="text-label-caps text-secondary">Total de alunos</p>
          <p className="text-h2 font-black text-on-surface">{stats?.studentCount ?? students.length}</p>
        </article>
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">school</span>
            <span className="text-[12px] font-bold text-secondary">Estável</span>
          </div>
          <p className="text-label-caps text-secondary">Turmas ativas</p>
          <p className="text-h2 font-black text-on-surface">{stats?.classCount ?? classes.length}</p>
        </article>
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">assessment</span>
            <span className="text-[12px] font-bold text-tertiary-fixed-dim">+1.8%</span>
          </div>
          <p className="text-label-caps text-secondary">Notas salvas</p>
          <p className="text-h2 font-black text-on-surface">{stats?.gradeCount ?? 0}</p>
        </article>
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">pending_actions</span>
            <span className="text-[12px] font-bold text-error">-2.1%</span>
          </div>
          <p className="text-label-caps text-secondary">Média de notas</p>
          <p className="text-h2 font-black text-on-surface">{stats?.averageGrade?.toFixed(2) ?? "0.00"}</p>
        </article>
      </div>
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className={panelClass}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="flex items-center gap-2 text-h3 text-primary"><span className="material-symbols-outlined">event</span>Calendário acadêmico</h3>
              <span className="text-body-sm text-secondary">Agenda real das turmas</span>
            </div>
            <div className="divide-y divide-slate-100">
              {calendarItems.map((item) => (
                <div key={item} className="px-6 py-4 text-body-md text-on-surface hover:bg-slate-50">{item}</div>
              ))}
            </div>
          </div>
          <div className={panelClass}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-h3 text-primary">Matrículas recentes</h3>
              <button type="button" className="text-body-sm font-bold text-primary">Ver todas</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className={tableHeaderClass}>Aluno</th>
                    <th className={tableHeaderClass}>Turma</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className={tableCellClass}>{students[0]?.name ?? "Sem registros"}</td>
                    <td className={tableCellClass}>{classes[0]?.topic ?? "-"}</td>
                    <td className={tableCellClass}><span className="rounded-full bg-tertiary-fixed/40 px-2 py-1 text-[11px] font-bold text-on-tertiary-fixed-variant">Confirmada</span></td>
                    <td className={tableCellClass}>Agora</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className={panelClass}>
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-h3 text-primary">Atividades recentes</h3>
            </div>
            <div className="space-y-4 p-6">
              {dashboardActivities.map((item) => (
                <div key={item.title}>
                  <p className="text-body-sm font-bold text-on-surface">{item.title}</p>
                  <p className="text-body-sm text-secondary">{item.desc}</p>
                  <p className="text-[10px] font-label-caps text-secondary">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-primary-container p-6 text-on-primary shadow-sm">
            <h3 className="mb-3 text-h3">Panorama de carga</h3>
            <p className="text-body-sm text-on-primary-container">Acompanhe turmas e matrículas em tempo real pelas telas de Turmas e Avaliações.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
