import type { FormEvent } from "react";
import type { Class, ClassFormValues } from "./types";

type ClassWithMeta = Class & { room: string; occupancy: number };

type Props = {
  classesWithMeta: ClassWithMeta[];
  classes: Class[];
  classForm: ClassFormValues;
  editingClassId: string | null;
  pendingDeleteClassId: string | null;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClassFormChange: (field: keyof ClassFormValues, value: string) => void;
  onCancelEdit: () => void;
  onNavigateToDetail: (classId: string) => void;
  onStartEdit: (cls: Class) => void;
  onRequestDelete: (cls: Class) => void;
  onConfirmDelete: (cls: Class) => void;
  onCancelDelete: () => void;
};

export function ClassesRoute({
  classesWithMeta,
  classes,
  classForm,
  editingClassId,
  pendingDeleteClassId,
  loading,
  onSubmit,
  onClassFormChange,
  onCancelEdit,
  onNavigateToDetail,
  onStartEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete
}: Props) {
  return (
    <section className="space-y-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-h1 text-primary">Gerenciamento de turmas</h1>
          <p className="font-body-md text-secondary">Schedule and monitor institutional curriculum delivery.</p>
        </div>
        <div className="flex rounded-lg border border-outline-variant bg-surface-container p-1">
          <button type="button" className="flex items-center space-x-2 rounded-md bg-white px-4 py-2 font-bold text-primary shadow-sm">
            <span className="material-symbols-outlined text-[20px]">list</span>
            <span className="text-body-sm">List View</span>
          </button>
          <button type="button" className="flex items-center space-x-2 rounded-md px-4 py-2 font-medium text-secondary">
            <span className="material-symbols-outlined text-[20px]">calendar_view_day</span>
            <span className="text-body-sm">Calendar View</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-4">
        <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-primary">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div>
            <p className="text-label-caps uppercase text-secondary">Total Classes</p>
            <p className="text-h2 text-primary">{classes.length}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant">
            <span className="material-symbols-outlined">person_add</span>
          </div>
          <div>
            <p className="text-label-caps uppercase text-secondary">Enrollments</p>
            <p className="text-h2 text-primary">{classes.reduce((acc, cls) => acc + cls.studentIds.length, 0)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed/30 text-primary-container">
            <span className="material-symbols-outlined">meeting_room</span>
          </div>
          <div>
            <p className="text-label-caps uppercase text-secondary">Rooms Active</p>
            <p className="text-h2 text-primary">{Math.max(0, classes.length - 1)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container/20 text-error">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div>
            <p className="text-label-caps uppercase text-secondary">At Capacity</p>
            <p className="text-h2 text-primary">{classes.filter((c) => c.studentIds.length >= 40).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 space-y-md lg:col-span-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <h3 className="mb-md text-h3 text-primary">Cadastro de turma</h3>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="topic" className="mb-2 block text-label-caps text-secondary">TÓPICO</label>
                <input
                  id="topic"
                  name="topic"
                  className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-body-sm"
                  value={classForm.topic}
                  onChange={(e) => onClassFormChange("topic", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="year" className="mb-2 block text-label-caps text-secondary">ANO</label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-body-sm"
                  value={classForm.year}
                  onChange={(e) => onClassFormChange("year", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="semester" className="mb-2 block text-label-caps text-secondary">SEMESTRE</label>
                <select
                  id="semester"
                  name="semester"
                  className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-body-sm"
                  value={classForm.semester}
                  onChange={(e) => onClassFormChange("semester", e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-bold text-white">
                  {loading ? "Salvando..." : editingClassId ? "Salvar edição" : "Cadastrar turma"}
                </button>
                {editingClassId && (
                  <button type="button" onClick={onCancelEdit} className="rounded-lg border border-outline-variant px-4 py-2">
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-slate-50">
                  <th className="px-md py-4 text-left text-xs font-label-caps uppercase tracking-wider text-secondary">Class Name</th>
                  <th className="px-md py-4 text-left text-xs font-label-caps uppercase tracking-wider text-secondary">Room / Time</th>
                  <th className="px-md py-4 text-left text-xs font-label-caps uppercase tracking-wider text-secondary">Enrollment</th>
                  <th className="px-md py-4 text-right text-xs font-label-caps uppercase tracking-wider text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classesWithMeta.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-secondary" colSpan={4}>Nenhuma turma cadastrada.</td>
                  </tr>
                ) : (
                  classesWithMeta.map((cls) => (
                    <tr key={cls.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-md py-4">
                        <p className="text-body-md font-bold text-primary">{cls.topic}</p>
                        <p className="text-xs text-secondary">{cls.year} • Semestre {cls.semester}</p>
                      </td>
                      <td className="px-md py-4 text-body-sm text-secondary">
                        <p>{cls.room}</p>
                        <p>Seg, Qua 10:00 AM</p>
                      </td>
                      <td className="px-md py-4">
                        <div className="flex w-32 flex-col">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="font-medium">{cls.studentIds.length}/45</span>
                            <span className="text-secondary">{cls.occupancy}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-on-tertiary-container" style={{ width: `${cls.occupancy}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToDetail(cls.id)}
                            className="rounded border border-outline-variant px-3 py-1 text-body-sm hover:border-primary"
                          >
                            Ver turma
                          </button>
                          <button type="button" onClick={() => onStartEdit(cls)} className="rounded border border-outline-variant px-3 py-1 text-body-sm hover:border-primary">
                            Editar
                          </button>
                          <button type="button" onClick={() => onRequestDelete(cls)} className="rounded border border-outline-variant px-3 py-1 text-body-sm hover:border-primary">
                            Remover
                          </button>
                          {pendingDeleteClassId === cls.id && (
                            <>
                              <button type="button" onClick={() => onConfirmDelete(cls)} className="rounded border border-outline-variant px-3 py-1 text-body-sm">
                                Confirmar remoção
                              </button>
                              <button type="button" onClick={onCancelDelete} className="rounded border border-outline-variant px-3 py-1 text-body-sm">
                                Cancelar remoção
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
