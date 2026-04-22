export const METAS = ['Requisitos', 'Testes', 'Implementação'] as const;
export type Meta = (typeof METAS)[number];

export type GradeConcept = 'MANA' | 'MPA' | 'MA';
export const GRADE_CONCEPTS: GradeConcept[] = ['MANA', 'MPA', 'MA'];
