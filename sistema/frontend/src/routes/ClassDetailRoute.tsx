import type { ClassDetail, Student } from "./types";

type Props = {
  panelClass: string;
  tableHeaderClass: string;
  tableCellClass: string;
  classDetail: ClassDetail;
  students: Student[];
  loading: boolean;
  metas: readonly string[];
  gradeConcepts: readonly string[];
  getGradeValue: (studentId: string, meta: string) => string;
  onBackToClasses: () => void;
  onEnroll: (studentId: string) => void;
  onUnenroll: (studentId: string) => void;
  onGradeEdit: (studentId: string, meta: string, concept: string) => void;
  onSaveStudentGrades: (studentId: string) => void;
};

export function ClassDetailRoute({
  panelClass,
  tableHeaderClass,
  tableCellClass,
  classDetail,
  students,
  loading,
  metas,
  gradeConcepts,
  getGradeValue,
  onBackToClasses,
  onEnroll,
  onUnenroll,
  onGradeEdit,
  onSaveStudentGrades
}: Props) {
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">Detalhe da turma</h1>
          <p className="text-body-md text-secondary">Grading & Evaluations</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-body-md">
            <option>Final Examination</option>
            <option>Mid-term Project</option>
          </select>
          <button type="button" className="rounded-lg bg-primary px-6 py-2.5 text-on-primary">Aplicar alterações</button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBackToClasses} className="rounded-lg border border-slate-200 px-4 py-2 hover:border-primary">
          Voltar para turmas
        </button>
      </div>
      <h1 className="text-h2 text-primary">
        {classDetail.topic} — {classDetail.year}/{classDetail.semester}
      </h1>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className={`${panelClass} p-6`}>
            <h3 className="mb-4 text-h3 text-primary">Grade Distribution</h3>
            <div className="flex h-40 items-end justify-between gap-3">
              {[15, 25, 65, 85, 45].map((value, idx) => (
                <div key={`${value}-${idx}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-slate-200" style={{ height: `${value}%` }} />
                  <span className="text-label-caps text-secondary">{["F", "D", "C", "B", "A"][idx]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-xl bg-primary-container p-6 text-on-primary">
            <p className="text-label-caps text-on-primary-container">Class Average</p>
            <p className="text-4xl font-bold">84.2%</p>
          </div>
          <div className={`${panelClass} p-6`}>
            <p className="text-label-caps text-secondary">Pending Entry</p>
            <p className="text-4xl font-bold text-primary">06</p>
          </div>
        </div>
      </div>

      <div className={`${panelClass} p-6`}>
        <h2 className="mb-4 text-h3 text-primary">Alunos matriculados</h2>
        {classDetail.students.length === 0 ? (
          <p>Nenhum aluno matriculado.</p>
        ) : (
          <ul className="space-y-2">
            {classDetail.students.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                <span>{s.name}</span>
                <button type="button" onClick={() => onUnenroll(s.id)} className="rounded border border-slate-200 px-3 py-1">
                  Desmatricular
                </button>
              </li>
            ))}
          </ul>
        )}

        {students.filter((s) => !classDetail.studentIds.includes(s.id)).length > 0 && (
          <div className="mt-4">
            <label htmlFor="enroll-select" className="mb-1 block text-sm font-medium">Matricular aluno</label>
            <select
              id="enroll-select"
              defaultValue=""
              className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
              onChange={(e) => {
                if (e.target.value) onEnroll(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Selecione um aluno</option>
              {students
                .filter((s) => !classDetail.studentIds.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className={`${panelClass} overflow-hidden`}>
        <h2 className="border-b border-slate-200 px-6 py-4 text-h3 text-primary">Avaliações</h2>
        {classDetail.students.length === 0 ? (
          <p className="px-6 py-6">Matricule alunos para registrar avaliações.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-data-table">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className={tableHeaderClass}>Aluno</th>
                  {metas.map((meta) => (
                    <th key={meta} className={tableHeaderClass}>{meta}</th>
                  ))}
                  <th className={tableHeaderClass}>Ações</th>
                  <th className={tableHeaderClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {classDetail.students.map((student, idx) => (
                  <tr key={student.id} className={`border-t border-slate-100 hover:bg-slate-50 ${idx % 2 ? "bg-slate-50/50" : ""}`}>
                    <td className={tableCellClass}>{student.name}</td>
                    {metas.map((meta) => (
                      <td key={meta} className={tableCellClass}>
                        <select
                          aria-label={`${meta} de ${student.name}`}
                          value={getGradeValue(student.id, meta)}
                          className="w-full min-w-28 rounded-lg border border-slate-200 bg-white px-2 py-1"
                          onChange={(e) => onGradeEdit(student.id, meta, e.target.value)}
                        >
                          <option value="">—</option>
                          {gradeConcepts.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td className={tableCellClass}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onSaveStudentGrades(student.id)}
                        className="rounded border border-slate-200 px-3 py-1 hover:border-primary"
                      >
                        Salvar
                      </button>
                    </td>
                    <td className={tableCellClass}>
                      <span className="rounded-full bg-tertiary-fixed/40 px-2 py-1 text-[11px] font-bold uppercase text-on-tertiary-fixed-variant">
                        Saved
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
