// Locais de atendimento da clínica: usado tanto no cadastro do paciente quanto
// no agendamento, pra saber (e mostrar na agenda) onde cada atendimento acontece.

export type LocalAtendimento = 'consultorio_1' | 'consultorio_2' | 'parceria';

export const LOCAIS_ATENDIMENTO: { value: LocalAtendimento; label: string }[] = [
  { value: 'consultorio_1', label: 'Consultório 1' },
  { value: 'consultorio_2', label: 'Consultório 2' },
  { value: 'parceria', label: 'Parceria' },
];

export const CORES_LOCAL: Record<LocalAtendimento, { bg: string; text: string }> = {
  consultorio_1: { bg: '#E6F0E5', text: '#4C7A54' },
  consultorio_2: { bg: '#E3EAF3', text: '#3C5A8A' },
  parceria: { bg: '#F1E3C2', text: '#8A5A2A' },
};

export function rotuloLocal(valor?: string | null) {
  if (!valor) return null;
  return LOCAIS_ATENDIMENTO.find((l) => l.value === valor)?.label ?? valor;
}
