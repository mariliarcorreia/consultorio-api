export type DiaSemana = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type ConfigDia = {
  open: boolean;
  start?: string; // "HH:mm"
  end?: string; // "HH:mm"
};

export type WorkingHours = Record<DiaSemana, ConfigDia>;

export const DIAS_SEMANA: DiaSemana[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const NOMES_DIA: Record<DiaSemana, string> = {
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const HORARIO_PADRAO: WorkingHours = {
  mon: { open: true, start: '08:00', end: '18:00' },
  tue: { open: true, start: '08:00', end: '18:00' },
  wed: { open: true, start: '08:00', end: '18:00' },
  thu: { open: true, start: '08:00', end: '18:00' },
  fri: { open: true, start: '08:00', end: '18:00' },
  sat: { open: false },
  sun: { open: false },
};

const MAPA_DIA_JS: DiaSemana[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function diaSemanaDe(data: Date): DiaSemana {
  return MAPA_DIA_JS[data.getDay()];
}

function minutosNoDia(data: Date): number {
  return data.getHours() * 60 + data.getMinutes();
}

function paraMinutos(horaTexto: string): number {
  const [h, m] = horaTexto.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function normalizarHorarios(valor: unknown): WorkingHours {
  if (!valor || typeof valor !== 'object') return HORARIO_PADRAO;
  const config = valor as Partial<WorkingHours>;
  const resultado = {} as WorkingHours;
  for (const dia of DIAS_SEMANA) {
    resultado[dia] = config[dia] ?? HORARIO_PADRAO[dia];
  }
  return resultado;
}

/** Verifica se o intervalo [inicio, fim) cabe dentro do horário de funcionamento configurado. */
export function dentroDoHorarioFuncionamento(
  horarios: WorkingHours,
  inicio: Date,
  fim: Date,
): { ok: true } | { ok: false; motivo: string } {
  const dia = diaSemanaDe(inicio);
  const config = horarios[dia];

  if (!config || !config.open) {
    return { ok: false, motivo: `A clínica não atende às ${NOMES_DIA[dia].toLowerCase()}s.` };
  }
  if (!config.start || !config.end) {
    return { ok: false, motivo: `Horário de atendimento não configurado para ${NOMES_DIA[dia].toLowerCase()}.` };
  }

  const inicioMin = minutosNoDia(inicio);
  const fimMin = minutosNoDia(fim);
  const aberturaMin = paraMinutos(config.start);
  const fechamentoMin = paraMinutos(config.end);

  if (inicioMin < aberturaMin || fimMin > fechamentoMin) {
    return {
      ok: false,
      motivo: `Fora do horário de atendimento (${config.start} às ${config.end}).`,
    };
  }
  return { ok: true };
}
