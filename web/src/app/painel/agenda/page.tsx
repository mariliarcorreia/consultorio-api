'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LOCAIS_ATENDIMENTO, CORES_LOCAL, rotuloLocal, type LocalAtendimento } from '@/lib/atendimento';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const PASSO_MINUTOS = 30;

type DiaSemana = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type ConfigDia = { open: boolean; start?: string; end?: string };
type WorkingHours = Record<DiaSemana, ConfigDia>;

type Patient = { id: string; fullName: string; phone?: string | null };

type Status = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'faltou';

type Agendamento = {
  id: string;
  clinicId: string;
  patientId: string;
  type: string;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  status: Status;
  notes?: string | null;
  patient: { id: string; fullName: string; phone?: string | null };
};

type Bloqueio = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

const DIAS_SEMANA: DiaSemana[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const NOMES_DIA_CURTO: Record<DiaSemana, string> = {
  mon: 'Seg',
  tue: 'Ter',
  wed: 'Qua',
  thu: 'Qui',
  fri: 'Sex',
  sat: 'Sáb',
  sun: 'Dom',
};
const MAPA_DIA_JS: DiaSemana[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const HORARIO_PADRAO: WorkingHours = {
  mon: { open: true, start: '08:00', end: '18:00' },
  tue: { open: true, start: '08:00', end: '18:00' },
  wed: { open: true, start: '08:00', end: '18:00' },
  thu: { open: true, start: '08:00', end: '18:00' },
  fri: { open: true, start: '08:00', end: '18:00' },
  sat: { open: false },
  sun: { open: false },
};

const TIPOS_AGENDAMENTO = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'procedimento', label: 'Procedimento' },
  { value: 'limpeza', label: 'Limpeza' },
];

const STATUS_INFO: Record<Status, { label: string; bg: string; text: string }> = {
  agendado: { label: 'Agendado', bg: '#F1E3C2', text: '#8A5A2A' },
  confirmado: { label: 'Confirmado', bg: '#E6F0E5', text: '#4C7A54' },
  concluido: { label: 'Concluído', bg: '#E8E4DC', text: '#6B6459' },
  cancelado: { label: 'Cancelado', bg: '#F3E3E3', text: '#A64545' },
  faltou: { label: 'Faltou', bg: '#F6DCC8', text: '#B5602A' },
};

function diaSemanaDe(data: Date): DiaSemana {
  return MAPA_DIA_JS[data.getDay()];
}
function paraMinutos(horaTexto: string): number {
  const [h, m] = horaTexto.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function inicioDaSemana(data: Date): Date {
  const d = new Date(data);
  const dia = d.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}
function adicionarDias(data: Date, n: number): Date {
  const d = new Date(data);
  d.setDate(d.getDate() + n);
  return d;
}
function comHoraMinuto(dia: Date, minutos: number): Date {
  const d = new Date(dia);
  d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return d;
}
function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatarDiaLabel(data: Date) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function formatarDataCompleta(data: Date) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function paraInputDatetime(data: Date) {
  const y = data.getFullYear();
  const mo = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  const h = String(data.getHours()).padStart(2, '0');
  const mi = String(data.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function limitesDoHorario(horarios: WorkingHours) {
  let inicio = 24 * 60;
  let fim = 0;
  let algumAberto = false;
  for (const dia of DIAS_SEMANA) {
    const cfg = horarios[dia];
    if (cfg?.open && cfg.start && cfg.end) {
      algumAberto = true;
      inicio = Math.min(inicio, paraMinutos(cfg.start));
      fim = Math.max(fim, paraMinutos(cfg.end));
    }
  }
  if (!algumAberto) return { inicio: 8 * 60, fim: 18 * 60 };
  return { inicio, fim };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [modo, setModo] = useState<'semana' | 'dia'>('semana');
  const [referencia, setReferencia] = useState<Date | null>(null);
  const [horarios, setHorarios] = useState<WorkingHours>(HORARIO_PADRAO);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [novo, setNovo] = useState<{ dia: Date; minutos: number } | null>(null);
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);

  useEffect(() => {
    setReferencia(new Date());
  }, []);

  useEffect(() => {
    async function carregarBase() {
      if (!user?.clinicId) return;
      try {
        const token = localStorage.getItem('token');
        const [resHorarios, resPacientes] = await Promise.all([
          fetch(`${API_URL}/clinics/${user.clinicId}/working-hours`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/patients?clinicId=${user.clinicId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (resHorarios.ok) setHorarios(await resHorarios.json());
        if (resPacientes.ok) {
          const data = await resPacientes.json();
          setPacientes(Array.isArray(data) ? data : []);
        }
      } catch {
        // se não carregar, seguimos com o horário padrão
      }
    }
    carregarBase();
  }, [user?.clinicId]);

  const dias = useMemo(() => {
    if (!referencia) return [];
    if (modo === 'dia') return [inicioDoDia(referencia)];
    const inicio = inicioDaSemana(referencia);
    return Array.from({ length: 7 }, (_, i) => adicionarDias(inicio, i));
  }, [referencia, modo]);

  const periodo = useMemo(() => {
    if (dias.length === 0) return null;
    const inicio = dias[0];
    const fim = adicionarDias(dias[dias.length - 1], 1);
    return { inicio, fim };
  }, [dias]);

  async function carregarAgenda() {
    if (!user?.clinicId || !periodo) return;
    setCarregando(true);
    setErro('');
    try {
      const token = localStorage.getItem('token');
      const qs = `clinicId=${user.clinicId}&start=${periodo.inicio.toISOString()}&end=${periodo.fim.toISOString()}`;
      const [resAg, resBl] = await Promise.all([
        fetch(`${API_URL}/appointments?${qs}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/schedule-blocks?${qs}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resAg.ok) setAgendamentos(await resAg.json());
      if (resBl.ok) setBloqueios(await resBl.json());
    } catch {
      setErro('Não foi possível carregar a agenda.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.clinicId, periodo?.inicio?.getTime(), periodo?.fim?.getTime()]);

  const { inicio: gradeInicio, fim: gradeFim } = useMemo(() => limitesDoHorario(horarios), [horarios]);
  const slots = useMemo(() => {
    const lista: number[] = [];
    for (let m = gradeInicio; m < gradeFim; m += PASSO_MINUTOS) lista.push(m);
    return lista;
  }, [gradeInicio, gradeFim]);

  function agendamentoNoSlot(dia: Date, minutos: number) {
    const inicioSlot = comHoraMinuto(dia, minutos);
    return agendamentos.find((a) => new Date(a.startsAt).getTime() === inicioSlot.getTime());
  }

  function bloqueioNoSlot(dia: Date, minutos: number) {
    const inicioSlot = comHoraMinuto(dia, minutos);
    const fimSlot = comHoraMinuto(dia, minutos + PASSO_MINUTOS);
    return bloqueios.find((b) => new Date(b.startsAt) < fimSlot && new Date(b.endsAt) > inicioSlot);
  }

  function irParaHoje() {
    setReferencia(new Date());
  }
  function irParaAnterior() {
    if (!referencia) return;
    setReferencia(adicionarDias(referencia, modo === 'dia' ? -1 : -7));
  }
  function irParaProximo() {
    if (!referencia) return;
    setReferencia(adicionarDias(referencia, modo === 'dia' ? 1 : 7));
  }

  const hoje = new Date();

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1E1A16] mb-1">
            Agenda
          </h1>
          <p className="text-[#8A8177] text-sm">Organize os horários de atendimento da clínica.</p>
        </div>
        <button
          onClick={() => referencia && setNovo({ dia: inicioDoDia(referencia), minutos: gradeInicio })}
          className="bg-[#A9702F] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#8A5A2A] transition shadow-[0_2px_8px_rgba(169,112,47,0.28)] whitespace-nowrap"
        >
          + Novo agendamento
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 my-5">
        <div className="flex items-center gap-2">
          <button
            onClick={irParaAnterior}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-[#EFE6D3] bg-white text-[#3A332C] hover:bg-[#FBF8F0]"
          >
            ‹
          </button>
          <button
            onClick={irParaProximo}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-[#EFE6D3] bg-white text-[#3A332C] hover:bg-[#FBF8F0]"
          >
            ›
          </button>
          <button
            onClick={irParaHoje}
            className="px-3 py-1.5 rounded-md border border-[#EFE6D3] bg-white text-sm text-[#3A332C] hover:bg-[#FBF8F0]"
          >
            Hoje
          </button>
          <p className="text-sm text-[#3A332C] ml-2 capitalize">
            {referencia && dias.length > 0
              ? modo === 'dia'
                ? formatarDataCompleta(dias[0])
                : `${formatarDiaLabel(dias[0])} – ${formatarDiaLabel(dias[dias.length - 1])}`
              : ''}
          </p>
        </div>

        <div className="flex rounded-md border border-[#EFE6D3] overflow-hidden">
          <button
            onClick={() => setModo('semana')}
            className={`px-3 py-1.5 text-sm ${modo === 'semana' ? 'bg-[#A9702F] text-white' : 'bg-white text-[#3A332C] hover:bg-[#FBF8F0]'}`}
          >
            Semana
          </button>
          <button
            onClick={() => setModo('dia')}
            className={`px-3 py-1.5 text-sm ${modo === 'dia' ? 'bg-[#A9702F] text-white' : 'bg-white text-[#3A332C] hover:bg-[#FBF8F0]'}`}
          >
            Dia
          </button>
        </div>
      </div>

      {erro && <p className="text-red-600 text-sm mb-3">{erro}</p>}

      <div className="bg-white border border-[#EFE6D3] rounded-xl overflow-hidden">
        {carregando || dias.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-16 border-b border-[#F2EBDB]" />
                  {dias.map((dia) => (
                    <th
                      key={dia.toISOString()}
                      className={`text-center px-3 py-2.5 border-b border-l border-[#F2EBDB] text-xs font-semibold ${
                        mesmoDia(dia, hoje) ? 'text-[#A9702F]' : 'text-[#6E6459]'
                      }`}
                    >
                      {NOMES_DIA_CURTO[diaSemanaDe(dia)]} {formatarDiaLabel(dia)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((minutos, rowIndex) => (
                  <tr key={minutos}>
                    <td className="text-right pr-2 text-[11px] text-[#A79C89] align-top py-1 border-b border-[#F2EBDB] whitespace-nowrap">
                      {minutosParaHora(minutos)}
                    </td>
                    {dias.map((dia) => {
                      const cfgDia = horarios[diaSemanaDe(dia)];
                      const fechado = !cfgDia?.open;

                      if (fechado) {
                        if (rowIndex === 0) {
                          return (
                            <td
                              key={dia.toISOString()}
                              rowSpan={slots.length}
                              className="border-b border-l border-[#F2EBDB] bg-[#FBF8F0] text-center text-xs text-[#B5AB9B] align-middle"
                            >
                              Fechado
                            </td>
                          );
                        }
                        return null;
                      }

                      const dentroDoExpediente =
                        cfgDia.start &&
                        cfgDia.end &&
                        minutos >= paraMinutos(cfgDia.start) &&
                        minutos + PASSO_MINUTOS <= paraMinutos(cfgDia.end);

                      if (!dentroDoExpediente) {
                        return (
                          <td
                            key={dia.toISOString()}
                            className="border-b border-l border-[#F2EBDB] bg-[#FBF8F0]/60 h-9"
                          />
                        );
                      }

                      const bloqueio = bloqueioNoSlot(dia, minutos);
                      if (bloqueio) {
                        return (
                          <td
                            key={dia.toISOString()}
                            className="border-b border-l border-[#F2EBDB] bg-[repeating-linear-gradient(45deg,#F2EBDB,#F2EBDB_6px,#FBF8F0_6px,#FBF8F0_12px)] text-center text-[10px] text-[#A79C89] h-9 px-1"
                            title={bloqueio.reason || 'Bloqueado'}
                          >
                            {bloqueio.reason || 'Bloqueado'}
                          </td>
                        );
                      }

                      const agendamento = agendamentoNoSlot(dia, minutos);
                      if (agendamento) {
                        const info = STATUS_INFO[agendamento.status];
                        const corLocal = agendamento.location
                          ? CORES_LOCAL[agendamento.location as LocalAtendimento]
                          : null;
                        return (
                          <td key={dia.toISOString()} className="border-b border-l border-[#F2EBDB] p-1 align-top">
                            <button
                              onClick={() => setDetalhe(agendamento)}
                              className="w-full text-left rounded-md px-2 py-1.5 hover:opacity-80 transition relative"
                              style={{ background: info.bg, color: info.text }}
                            >
                              {corLocal && (
                                <span
                                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                  style={{ background: corLocal.text }}
                                  title={rotuloLocal(agendamento.location) ?? ''}
                                />
                              )}
                              <p className="text-[11.5px] font-medium truncate pr-3">{agendamento.patient.fullName}</p>
                              <p className="text-[10px] opacity-80">
                                {formatarHora(agendamento.startsAt)}–{formatarHora(agendamento.endsAt)}
                              </p>
                              {agendamento.location && (
                                <p className="text-[9.5px] opacity-80 truncate">{rotuloLocal(agendamento.location)}</p>
                              )}
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={dia.toISOString()} className="border-b border-l border-[#F2EBDB] h-9 p-0">
                          <button
                            onClick={() => setNovo({ dia, minutos })}
                            className="w-full h-full flex items-center justify-center text-[#D8CDB8] hover:bg-[#FBF8F0] hover:text-[#A9702F] transition text-sm"
                          >
                            +
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-[#8A8177]">
        Clique num horário livre pra marcar uma consulta, ou num agendamento já existente pra ver os detalhes,
        confirmar, cancelar ou remarcar.
      </p>

      {novo && (
        <ModalNovoAgendamento
          dia={novo.dia}
          minutosIniciais={novo.minutos}
          pacientes={pacientes}
          clinicId={user?.clinicId}
          userId={user?.id}
          onFechar={() => setNovo(null)}
          onCriado={() => {
            setNovo(null);
            carregarAgenda();
          }}
          onPacienteCriado={(p) =>
            setPacientes((prev) => [...prev, p].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR')))
          }
        />
      )}

      {detalhe && (
        <ModalDetalheAgendamento
          agendamento={detalhe}
          userId={user?.id}
          onFechar={() => setDetalhe(null)}
          onAtualizado={() => {
            setDetalhe(null);
            carregarAgenda();
          }}
        />
      )}
    </div>
  );
}

function ModalNovoAgendamento({
  dia,
  minutosIniciais,
  pacientes,
  clinicId,
  userId,
  onFechar,
  onCriado,
  onPacienteCriado,
}: {
  dia: Date;
  minutosIniciais: number;
  pacientes: Patient[];
  clinicId?: string;
  userId?: string;
  onFechar: () => void;
  onCriado: () => void;
  onPacienteCriado: (paciente: Patient) => void;
}) {
  const inicioPadrao = comHoraMinuto(dia, minutosIniciais);
  const fimPadrao = comHoraMinuto(dia, minutosIniciais + PASSO_MINUTOS);

  const [busca, setBusca] = useState('');
  const [patientId, setPatientId] = useState('');
  const [tipo, setTipo] = useState('consulta');
  const [local, setLocal] = useState('');
  const [inicio, setInicio] = useState(paraInputDatetime(inicioPadrao));
  const [fim, setFim] = useState(paraInputDatetime(fimPadrao));
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [pacienteRecemCriado, setPacienteRecemCriado] = useState<Patient | null>(null);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoNascimento, setNovoNascimento] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [criandoPaciente, setCriandoPaciente] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');

  const pacientesFiltrados = busca.trim()
    ? pacientes.filter((p) => p.fullName.toLowerCase().includes(busca.toLowerCase()))
    : pacientes;

  const pacienteSelecionado = pacientes.find((p) => p.id === patientId) || pacienteRecemCriado;

  async function cadastrarPaciente() {
    if (!clinicId) return;
    if (!novoNome.trim() || !novoNascimento) {
      setErroCadastro('Preencha ao menos o nome completo e a data de nascimento.');
      return;
    }
    setErroCadastro('');
    setCriandoPaciente(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          fullName: novoNome.trim(),
          birthDate: novoNascimento,
          phone: novoTelefone || undefined,
          actorUserId: userId,
        }),
      });
      if (!res.ok) throw new Error('Falha ao cadastrar paciente');
      const paciente = await res.json();
      onPacienteCriado(paciente);
      setPacienteRecemCriado(paciente);
      setPatientId(paciente.id);
      setMostrarCadastro(false);
      setNovoNome('');
      setNovoNascimento('');
      setNovoTelefone('');
    } catch {
      setErroCadastro('Não foi possível cadastrar esse paciente. Confira os dados e tente novamente.');
    } finally {
      setCriandoPaciente(false);
    }
  }

  async function salvar() {
    if (!clinicId || !userId) return;
    if (!patientId) {
      setErro('Escolha um paciente.');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          patientId,
          type: tipo,
          location: local || undefined,
          startsAt: new Date(inicio).toISOString(),
          endsAt: new Date(fim).toISOString(),
          notes: observacoes || undefined,
          createdBy: userId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Falha ao criar agendamento');
      }
      onCriado();
    } catch (e: any) {
      setErro(typeof e.message === 'string' ? e.message : 'Não foi possível criar esse agendamento.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-medium text-[#1E1A16]">Novo agendamento</h2>

        {!patientId ? (
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Paciente</label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente pelo nome..."
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C] mb-2"
            />
            <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-md divide-y divide-stone-100 mb-2">
              {pacientesFiltrados.length === 0 ? (
                <p className="p-3 text-xs text-stone-500">Nenhum paciente encontrado.</p>
              ) : (
                pacientesFiltrados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPatientId(p.id)}
                    className="w-full text-left px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
                  >
                    {p.fullName}
                  </button>
                ))
              )}
            </div>

            {!mostrarCadastro ? (
              <button
                onClick={() => {
                  setMostrarCadastro(true);
                  setNovoNome(busca);
                }}
                className="text-xs text-[#A9702F] font-medium hover:underline"
              >
                Não encontrou? + Cadastrar novo paciente
              </button>
            ) : (
              <div className="bg-[#FBF8F0] border border-[#EFE6D3] rounded-md p-3 space-y-2.5">
                <p className="text-xs font-medium text-stone-600">Cadastro rápido do paciente</p>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Nome completo *</label>
                  <input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Nascimento *</label>
                    <input
                      type="date"
                      value={novoNascimento}
                      onChange={(e) => setNovoNascimento(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Telefone</label>
                    <input
                      value={novoTelefone}
                      onChange={(e) => setNovoTelefone(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  Só o essencial pra marcar o horário. Depois dá pra completar o cadastro (CPF, endereço etc.) em
                  Pacientes.
                </p>
                {erroCadastro && <p className="text-red-600 text-xs">{erroCadastro}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={cadastrarPaciente}
                    disabled={criandoPaciente}
                    className="bg-[#A9702F] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#8A5A2A] transition disabled:opacity-50"
                  >
                    {criandoPaciente ? 'Cadastrando...' : 'Cadastrar e selecionar'}
                  </button>
                  <button
                    onClick={() => setMostrarCadastro(false)}
                    className="text-xs text-stone-500 hover:underline px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#FBF8F0] border border-[#EFE6D3] rounded-md px-3 py-2">
            <p className="text-sm text-[#1E1A16] font-medium">{pacienteSelecionado?.fullName}</p>
            <button onClick={() => setPatientId('')} className="text-xs text-[#A9702F]">
              Trocar
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          >
            {TIPOS_AGENDAMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Local de atendimento</label>
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          >
            <option value="">Selecione...</option>
            {LOCAIS_ATENDIMENTO.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Início</label>
            <input
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Fim</label>
            <input
              type="datetime-local"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 bg-[#A9702F] text-white py-2.5 rounded-md text-sm font-medium hover:bg-[#8A5A2A] transition disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Criar agendamento'}
          </button>
          <button onClick={onFechar} className="text-sm text-stone-500 hover:underline px-2">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalheAgendamento({
  agendamento,
  userId,
  onFechar,
  onAtualizado,
}: {
  agendamento: Agendamento;
  userId?: string;
  onFechar: () => void;
  onAtualizado: () => void;
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const info = STATUS_INFO[agendamento.status];

  async function mudarStatus(status: Status) {
    setErro('');
    setProcessando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/appointments/${agendamento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, actorUserId: userId }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      onAtualizado();
    } catch {
      setErro('Não foi possível atualizar esse agendamento.');
    } finally {
      setProcessando(false);
    }
  }

  async function mudarLocal(location: string) {
    setErro('');
    setProcessando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/appointments/${agendamento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location, actorUserId: userId }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      onAtualizado();
    } catch {
      setErro('Não foi possível atualizar o local desse agendamento.');
    } finally {
      setProcessando(false);
    }
  }

  async function excluir() {
    const confirmar = window.confirm('Tem certeza que deseja excluir esse agendamento? Essa ação não pode ser desfeita.');
    if (!confirmar) return;
    setErro('');
    setProcessando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/appointments/${agendamento.id}?actorUserId=${userId || ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      onAtualizado();
    } catch {
      setErro('Não foi possível excluir esse agendamento.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium text-[#1E1A16]">{agendamento.patient.fullName}</h2>
            {agendamento.patient.phone && <p className="text-xs text-[#8A8177] mt-0.5">{agendamento.patient.phone}</p>}
          </div>
          <span
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: info.bg, color: info.text }}
          >
            {info.label}
          </span>
        </div>

        <div className="text-sm text-[#3A332C] space-y-1">
          <p>
            <span className="text-[#8A8177]">Tipo: </span>
            {TIPOS_AGENDAMENTO.find((t) => t.value === agendamento.type)?.label || agendamento.type}
          </p>
          <p>
            <span className="text-[#8A8177]">Horário: </span>
            {formatarHora(agendamento.startsAt)} às {formatarHora(agendamento.endsAt)}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[#8A8177]">Local: </span>
            <select
              value={agendamento.location ?? ''}
              disabled={processando}
              onChange={(e) => mudarLocal(e.target.value)}
              className="text-xs text-stone-800 border border-stone-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#C9A05C] disabled:opacity-50"
            >
              <option value="">Não definido</option>
              {LOCAIS_ATENDIMENTO.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          {agendamento.notes && (
            <p>
              <span className="text-[#8A8177]">Observações: </span>
              {agendamento.notes}
            </p>
          )}
        </div>

        <Link
          href={`/painel/pacientes/${agendamento.patientId}`}
          className="inline-block text-xs text-[#A9702F] font-medium hover:underline"
        >
          Ver ficha do paciente →
        </Link>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
          {agendamento.status !== 'confirmado' && agendamento.status !== 'concluido' && (
            <button
              disabled={processando}
              onClick={() => mudarStatus('confirmado')}
              className="text-xs px-3 py-1.5 rounded-md border border-[#4C7A54]/30 text-[#4C7A54] hover:bg-[#E6F0E5] transition disabled:opacity-50"
            >
              Confirmar
            </button>
          )}
          {agendamento.status !== 'concluido' && (
            <button
              disabled={processando}
              onClick={() => mudarStatus('concluido')}
              className="text-xs px-3 py-1.5 rounded-md border border-stone-300 text-stone-600 hover:bg-stone-100 transition disabled:opacity-50"
            >
              Marcar concluído
            </button>
          )}
          {agendamento.status !== 'faltou' && (
            <button
              disabled={processando}
              onClick={() => mudarStatus('faltou')}
              className="text-xs px-3 py-1.5 rounded-md border border-[#B5602A]/30 text-[#B5602A] hover:bg-[#F6DCC8] transition disabled:opacity-50"
            >
              Marcar falta
            </button>
          )}
          {agendamento.status !== 'cancelado' && (
            <button
              disabled={processando}
              onClick={() => mudarStatus('cancelado')}
              className="text-xs px-3 py-1.5 rounded-md border border-[#A64545]/30 text-[#A64545] hover:bg-[#F3E3E3] transition disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            disabled={processando}
            onClick={excluir}
            className="text-xs px-3 py-1.5 rounded-md text-red-600 hover:underline disabled:opacity-50 ml-auto"
          >
            Excluir
          </button>
        </div>

        <button onClick={onFechar} className="text-xs text-stone-500 hover:underline">
          Fechar
        </button>
      </div>
    </div>
  );
}
