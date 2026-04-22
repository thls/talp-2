import type { Class, Stats, Student } from "./types";

type Props = {
  stats: Stats | null;
  students: Student[];
  classes: Class[];
  panelClass: string;
  tableHeaderClass: string;
  tableCellClass: string;
};

export function DashboardRoute({
  stats,
  students,
  classes,
  panelClass,
  tableHeaderClass,
  tableCellClass
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
          <h1 className="text-h1 text-primary">Welcome back, Sarah</h1>
          <p className="text-body-lg text-secondary">Here's a summary of the academic performance for the current semester.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-on-primary shadow-sm hover:bg-primary-container">
          <span className="material-symbols-outlined text-lg">add</span>
          New Enrollment
        </button>
      </div>
      <div className="mb-2 grid gap-6 md:grid-cols-4">
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">groups</span>
            <span className="text-[12px] font-bold text-tertiary-fixed-dim">+4.2%</span>
          </div>
          <p className="text-label-caps text-secondary">Total Students</p>
          <p className="text-h2 font-black text-on-surface">{stats?.studentCount ?? students.length}</p>
        </article>
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">school</span>
            <span className="text-[12px] font-bold text-secondary">Stable</span>
          </div>
          <p className="text-label-caps text-secondary">Active Classes</p>
          <p className="text-h2 font-black text-on-surface">{stats?.classCount ?? classes.length}</p>
        </article>
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">assessment</span>
            <span className="text-[12px] font-bold text-tertiary-fixed-dim">+1.8%</span>
          </div>
          <p className="text-label-caps text-secondary">Saved Grades</p>
          <p className="text-h2 font-black text-on-surface">{stats?.gradeCount ?? 0}</p>
        </article>
        <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">pending_actions</span>
            <span className="text-[12px] font-bold text-error">-2.1%</span>
          </div>
          <p className="text-label-caps text-secondary">Attendance Rate</p>
          <p className="text-h2 font-black text-on-surface">92.4%</p>
        </article>
      </div>
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className={panelClass}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="flex items-center gap-2 text-h3 text-primary"><span className="material-symbols-outlined">event</span>Today's Schedule</h3>
              <span className="text-body-sm text-secondary">Wednesday</span>
            </div>
            <div className="divide-y divide-slate-100">
              {["09:00 • Advanced Macroeconomics", "11:30 • Digital Ethics & Society", "14:00 • Board Meeting"].map((item) => (
                <div key={item} className="px-6 py-4 text-body-md text-on-surface hover:bg-slate-50">{item}</div>
              ))}
            </div>
          </div>
          <div className={panelClass}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-h3 text-primary">Recent Registrations</h3>
              <button className="text-body-sm font-bold text-primary">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className={tableHeaderClass}>Student Name</th>
                    <th className={tableHeaderClass}>Course ID</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className={tableCellClass}>Marcus Aurelius</td>
                    <td className={tableCellClass}>PHL-101</td>
                    <td className={tableCellClass}><span className="rounded-full bg-tertiary-fixed/40 px-2 py-1 text-[11px] font-bold text-on-tertiary-fixed-variant">Confirmed</span></td>
                    <td className={tableCellClass}>2 mins ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className={panelClass}>
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-h3 text-primary">Recent Activity</h3>
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
            <h3 className="mb-3 text-h3">Department Load</h3>
            <p className="text-body-sm text-on-primary-container">Humanities 85%, STEM 94%, Business 72%</p>
          </div>
        </div>
      </div>
    </section>
  );
}
