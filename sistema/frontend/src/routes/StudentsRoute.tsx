import type { FormEvent } from "react";
import type { Student, StudentFormValues } from "./types";

type Props = {
  panelClass: string;
  tableHeaderClass: string;
  tableCellClass: string;
  students: Student[];
  studentForm: StudentFormValues;
  loading: boolean;
  editingStudentId: string | null;
  pendingDeleteStudentId: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStudentFormChange: (field: keyof StudentFormValues, value: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (student: Student) => void;
  onRequestDelete: (student: Student) => void;
  onConfirmDelete: (student: Student) => void;
  onCancelDelete: () => void;
};

export function StudentsRoute({
  panelClass,
  tableHeaderClass,
  tableCellClass,
  students,
  studentForm,
  loading,
  editingStudentId,
  pendingDeleteStudentId,
  onSubmit,
  onStudentFormChange,
  onCancelEdit,
  onStartEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete
}: Props) {
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">Gerenciamento de alunos</h1>
          <p className="text-body-md text-secondary">Student Directory</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filter
          </button>
          <button type="button" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-sm text-on-primary">
            <span className="material-symbols-outlined text-sm">file_download</span>
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className={`${panelClass} p-6`}>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={onSubmit}>
              <div className="md:col-span-2">
                <label htmlFor="name" className="mb-1 block text-sm font-medium">Nome</label>
                <input
                  id="name"
                  name="name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  value={studentForm.name}
                  onChange={(e) => onStudentFormChange("name", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cpf" className="mb-1 block text-sm font-medium">CPF</label>
                <input
                  id="cpf"
                  name="cpf"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  value={studentForm.cpf}
                  onChange={(e) => onStudentFormChange("cpf", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
                <input
                  id="email"
                  name="email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  value={studentForm.email}
                  onChange={(e) => onStudentFormChange("email", e.target.value)}
                />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-container">
                  {loading ? "Salvando..." : editingStudentId ? "Salvar edição" : "Cadastrar aluno"}
                </button>
                {editingStudentId && (
                  <button type="button" onClick={onCancelEdit} className="rounded-lg border border-slate-200 px-4 py-2">
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className={`${panelClass} overflow-hidden`}>
            <h2 className="border-b border-slate-200 px-6 py-4 text-h3 text-primary">Alunos cadastrados</h2>
            {students.length === 0 ? (
              <p className="px-6 py-6 text-secondary">Nenhum aluno cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-data-table">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className={tableHeaderClass}>Nome</th>
                      <th className={tableHeaderClass}>CPF</th>
                      <th className={tableHeaderClass}>Email</th>
                      <th className={tableHeaderClass}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr key={student.id} className={`border-t border-slate-100 hover:bg-slate-50 ${idx % 2 ? "bg-slate-50/50" : ""}`}>
                        <td className={tableCellClass}>{student.name}</td>
                        <td className={tableCellClass}>{student.cpf}</td>
                        <td className={tableCellClass}>{student.email}</td>
                        <td className={tableCellClass}>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => onStartEdit(student)} className="rounded border border-slate-200 px-3 py-1 hover:border-primary">
                              Editar
                            </button>
                            <button type="button" onClick={() => onRequestDelete(student)} className="rounded border border-slate-200 px-3 py-1 hover:border-primary">
                              Remover
                            </button>
                            {pendingDeleteStudentId === student.id && (
                              <>
                                <button type="button" onClick={() => onConfirmDelete(student)} className="rounded border border-slate-200 px-3 py-1">
                                  Confirmar remoção
                                </button>
                                <button type="button" onClick={onCancelDelete} className="rounded border border-slate-200 px-3 py-1">
                                  Cancelar remoção
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <aside className="space-y-6 lg:col-span-4">
          <div className={`${panelClass} p-6`}>
            <h3 className="mb-4 text-h3 text-primary">Enrollment Distribution</h3>
            <div className="space-y-3 text-body-sm">
              <div><p className="mb-1 flex justify-between"><span>Grade 10</span><span className="font-bold text-primary">42%</span></p><div className="h-2 rounded-full bg-surface-container"><div className="h-full w-[42%] rounded-full bg-primary" /></div></div>
              <div><p className="mb-1 flex justify-between"><span>Grade 11</span><span className="font-bold text-primary">35%</span></p><div className="h-2 rounded-full bg-surface-container"><div className="h-full w-[35%] rounded-full bg-primary-container" /></div></div>
              <div><p className="mb-1 flex justify-between"><span>Grade 12</span><span className="font-bold text-primary">23%</span></p><div className="h-2 rounded-full bg-surface-container"><div className="h-full w-[23%] rounded-full bg-secondary" /></div></div>
            </div>
          </div>
          <div className="rounded-xl bg-primary p-6 text-on-primary shadow-lg">
            <h3 className="mb-2 text-h3">Academic Insights</h3>
            <p className="mb-5 text-body-sm text-on-primary-container">12 estudantes precisam de reforço em matemática.</p>
            <button type="button" className="w-full rounded-lg bg-surface-container-lowest py-3 font-bold text-primary">View Intervention Report</button>
          </div>
        </aside>
      </div>
    </section>
  );
}
