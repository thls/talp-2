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
  filterTerm: string;
  onFilterTermChange: (value: string) => void;
  onExportCsv: () => void;
  onClearFilter: () => void;
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
  filterTerm,
  onFilterTermChange,
  onExportCsv,
  onClearFilter
}: Props) {
  const normalizedTerm = filterTerm.trim().toLowerCase();
  const displayedStudents = !normalizedTerm
    ? students
    : students.filter((student) => {
        const numericTerm = normalizedTerm.replace(/\D/g, "");
        return (
          student.name.toLowerCase().includes(normalizedTerm) ||
          student.email.toLowerCase().includes(normalizedTerm) ||
          (numericTerm.length > 0 && student.cpf.includes(numericTerm))
        );
      });

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">Gerenciamento de alunos</h1>
          <p className="text-body-md text-secondary">Diretório de alunos</p>
        </div>
        <div className="flex gap-2">
          <input
            value={filterTerm}
            onChange={(event) => onFilterTermChange(event.target.value)}
            placeholder="Filtrar por nome, CPF ou email"
            className="w-64 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm"
          />
          <button type="button" onClick={onClearFilter} className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm">
            <span className="material-symbols-outlined text-sm">close</span>
            Limpar filtro
          </button>
          <button type="button" onClick={onExportCsv} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-sm text-on-primary">
            <span className="material-symbols-outlined text-sm">file_download</span>
            Exportar CSV
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
            {displayedStudents.length === 0 ? (
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
                    {displayedStudents.map((student, idx) => (
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
                            {pendingDeleteStudentId === student.id && <span className="text-xs text-secondary">Aguardando confirmação...</span>}
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
        <aside className="space-y-6 lg:col-span-4" />
      </div>
    </section>
  );
}
