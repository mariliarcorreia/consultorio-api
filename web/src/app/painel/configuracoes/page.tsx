'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const TIPOS_MODELO = [
  { code: 'consentimento', label: 'Termo de consentimento' },
  { code: 'orcamento', label: 'Orçamento' },
  { code: 'atestado', label: 'Atestado' },
  { code: 'receita', label: 'Receita' },
  { code: 'atestado_comparecimento', label: 'Atestado de comparecimento' },
];

const PLACEHOLDERS_AUTOMATICOS = [
  { chave: 'paciente_nome', descricao: 'Nome completo do paciente' },
  { chave: 'paciente_cpf', descricao: 'CPF do paciente' },
  { chave: 'paciente_nascimento', descricao: 'Data de nascimento do paciente' },
  { chave: 'paciente_endereco', descricao: 'Endereço do paciente' },
  { chave: 'clinica_nome', descricao: 'Nome da clínica' },
  { chave: 'data_hoje', descricao: 'Data de hoje' },
  { chave: 'profissional_nome', descricao: 'Nome de quem gerou o documento' },
];

type Template = {
  id: string;
  code: string;
  title: string;
  content: string;
  active: boolean;
};

type FormularioModelo = {
  id?: string;
  code: string;
  title: string;
  content: string;
  active: boolean;
};

type DiaSemana = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type ConfigDia = { open: boolean; start?: string; end?: string };
type WorkingHours = Record<DiaSemana, ConfigDia>;

type Bloqueio = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

const DIAS_SEMANA: DiaSemana[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const NOMES_DIA: Record<DiaSemana, string> = {
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
  sun: 'Domingo',
};

function TabsConfiguracoes({ aba, onMudar }: { aba: string; onMudar: (aba: string) => void }) {
  const tabs = [
    { key: 'geral', label: 'Geral' },
    { key: 'horario', label: 'Horário de atendimento' },
    { key: 'modelos', label: 'Modelos de documentos' },
  ];
  return (
    <div className="flex gap-1 border-b border-stone-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onMudar(tab.key)}
          className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
            aba === tab.key
              ? 'border-[#C9A05C] text-[#8A5A2A] font-medium'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FormularioGeral({ clinicId }: { clinicId?: string }) {
  const [nome, setNome] = useState('');
  const [cro, setCro] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregarLogo() {
    if (!clinicId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clinics/${clinicId}/logo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.url ?? null);
      }
    } catch {
      // se não der pra carregar a prévia da logo, a tela ainda funciona sem ela
    }
  }

  useEffect(() => {
    async function carregar() {
      if (!clinicId) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/clinics/${clinicId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNome(data.name ?? '');
          setCro(data.cro ?? '');
        } else {
          setErro('Não foi possível carregar os dados da clínica.');
        }
      } catch {
        setErro('Não foi possível conectar ao servidor.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
    carregarLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId) return;
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: nome, cro }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setSucesso('Dados da clínica atualizados com sucesso.');
    } catch {
      setErro('Não foi possível salvar as alterações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleUploadLogo(file: File) {
    if (!clinicId) return;
    setErro('');
    setSucesso('');
    setEnviandoLogo(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/clinics/${clinicId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Falha ao enviar');

      setSucesso('Logo atualizada com sucesso.');
      carregarLogo();
    } catch {
      setErro('Não foi possível enviar essa imagem. Tente um PNG ou JPG de até 5 MB.');
    } finally {
      setEnviandoLogo(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-stone-500">Carregando...</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <h2 className="font-medium text-stone-800 text-sm">Logo da clínica</h2>
        <p className="text-xs text-stone-500">
          Aparece no cabeçalho dos documentos gerados (termos, orçamentos, atestados). Use um PNG ou JPG.
        </p>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo da clínica" className="h-16 w-16 object-contain border border-stone-200 rounded-md" />
          ) : (
            <div className="h-16 w-16 flex items-center justify-center border border-dashed border-stone-300 rounded-md text-xs text-stone-400">
              Sem logo
            </div>
          )}
          <label className="text-sm text-[#B88A3D] hover:underline cursor-pointer">
            {enviandoLogo ? 'Enviando...' : logoUrl ? 'Trocar imagem' : 'Enviar imagem'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={enviandoLogo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadLogo(file);
              }}
            />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Nome da clínica</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">CRO da clínica</label>
          <input
            value={cro}
            onChange={(e) => setCro(e.target.value)}
            placeholder="Ex.: CRO-SP 12345"
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
          <p className="text-xs text-stone-500 mt-1">Aparece no cabeçalho dos documentos gerados.</p>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        {sucesso && <p className="text-green-700 text-sm">{sucesso}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-stone-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}

function HorarioAtendimento({ clinicId }: { clinicId?: string }) {
  const [horarios, setHorarios] = useState<WorkingHours | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [novoBloqueioInicio, setNovoBloqueioInicio] = useState('');
  const [novoBloqueioFim, setNovoBloqueioFim] = useState('');
  const [novoBloqueioMotivo, setNovoBloqueioMotivo] = useState('');
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [erroBloqueio, setErroBloqueio] = useState('');

  async function carregarHorarios() {
    if (!clinicId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clinics/${clinicId}/working-hours`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHorarios(await res.json());
      else setErro('Não foi possível carregar o horário de atendimento.');
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarBloqueios() {
    if (!clinicId) return;
    try {
      const token = localStorage.getItem('token');
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const res = await fetch(
        `${API_URL}/schedule-blocks?clinicId=${clinicId}&start=${inicio.toISOString()}&end=${new Date(inicio.getTime() + 1000 * 60 * 60 * 24 * 365).toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setBloqueios(await res.json());
    } catch {
      // segue sem a lista de bloqueios se der erro
    }
  }

  useEffect(() => {
    carregarHorarios();
    carregarBloqueios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  function mudarDia(dia: DiaSemana, campo: keyof ConfigDia, valor: string | boolean) {
    if (!horarios) return;
    setHorarios({ ...horarios, [dia]: { ...horarios[dia], [campo]: valor } });
  }

  async function salvarHorarios() {
    if (!clinicId || !horarios) return;
    setErro('');
    setSucesso('');
    setSalvando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clinics/${clinicId}/working-hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(horarios),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setSucesso('Horário de atendimento atualizado com sucesso.');
    } catch {
      setErro('Não foi possível salvar o horário de atendimento.');
    } finally {
      setSalvando(false);
    }
  }

  async function criarBloqueio() {
    if (!clinicId || !novoBloqueioInicio || !novoBloqueioFim) {
      setErroBloqueio('Preencha o início e o fim do bloqueio.');
      return;
    }
    setErroBloqueio('');
    setSalvandoBloqueio(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/schedule-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          startsAt: new Date(novoBloqueioInicio).toISOString(),
          endsAt: new Date(novoBloqueioFim).toISOString(),
          reason: novoBloqueioMotivo || undefined,
        }),
      });
      if (!res.ok) throw new Error('Falha ao criar bloqueio');
      setNovoBloqueioInicio('');
      setNovoBloqueioFim('');
      setNovoBloqueioMotivo('');
      carregarBloqueios();
    } catch {
      setErroBloqueio('Não foi possível criar esse bloqueio.');
    } finally {
      setSalvandoBloqueio(false);
    }
  }

  async function excluirBloqueio(id: string) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/schedule-blocks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      carregarBloqueios();
    } catch {
      setErroBloqueio('Não foi possível excluir esse bloqueio.');
    }
  }

  function formatarPeriodo(b: Bloqueio) {
    const inicio = new Date(b.startsAt);
    const fim = new Date(b.endsAt);
    const mesmaData = inicio.toDateString() === fim.toDateString();
    const opcoesData: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const opcoesHora: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    if (mesmaData) {
      return `${inicio.toLocaleDateString('pt-BR', opcoesData)}, ${inicio.toLocaleTimeString('pt-BR', opcoesHora)} às ${fim.toLocaleTimeString('pt-BR', opcoesHora)}`;
    }
    return `${inicio.toLocaleDateString('pt-BR', opcoesData)} ${inicio.toLocaleTimeString('pt-BR', opcoesHora)} até ${fim.toLocaleDateString('pt-BR', opcoesData)} ${fim.toLocaleTimeString('pt-BR', opcoesHora)}`;
  }

  if (carregando || !horarios) {
    return <p className="text-sm text-stone-500">Carregando...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h2 className="font-medium text-stone-800 text-sm mb-1">Dias e horários de atendimento</h2>
        <p className="text-xs text-stone-500 mb-4">
          Usado pra agenda saber quando é possível marcar consultas e mostrar a grade de horários certa.
        </p>

        <div className="space-y-2">
          {DIAS_SEMANA.map((dia) => {
            const cfg = horarios[dia];
            return (
              <div key={dia} className="flex items-center gap-3 py-1.5 border-b border-stone-100 last:border-0">
                <label className="flex items-center gap-2 w-40 shrink-0">
                  <input
                    type="checkbox"
                    checked={cfg.open}
                    onChange={(e) => mudarDia(dia, 'open', e.target.checked)}
                  />
                  <span className="text-sm text-stone-700">{NOMES_DIA[dia]}</span>
                </label>
                {cfg.open ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={cfg.start || ''}
                      onChange={(e) => mudarDia(dia, 'start', e.target.value)}
                      className="px-2 py-1.5 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                    <span className="text-stone-400 text-sm">às</span>
                    <input
                      type="time"
                      value={cfg.end || ''}
                      onChange={(e) => mudarDia(dia, 'end', e.target.value)}
                      className="px-2 py-1.5 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-stone-400">Fechado</span>
                )}
              </div>
            );
          })}
        </div>

        {erro && <p className="text-red-600 text-sm mt-4">{erro}</p>}
        {sucesso && <p className="text-green-700 text-sm mt-4">{sucesso}</p>}

        <button
          onClick={salvarHorarios}
          disabled={salvando}
          className="mt-5 bg-[#A9702F] text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-[#8A5A2A] transition disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar horário de atendimento'}
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h2 className="font-medium text-stone-800 text-sm mb-1">Bloqueios (almoço, folga, feriado)</h2>
        <p className="text-xs text-stone-500 mb-4">
          Períodos em que a agenda não deve aceitar novos agendamentos, mesmo dentro do horário de atendimento.
        </p>

        {bloqueios.length === 0 ? (
          <p className="text-sm text-stone-500 mb-4">Nenhum bloqueio cadastrado.</p>
        ) : (
          <ul className="divide-y divide-stone-100 mb-4">
            {bloqueios.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-stone-800">{b.reason || 'Bloqueio'}</p>
                  <p className="text-xs text-stone-500">{formatarPeriodo(b)}</p>
                </div>
                <button onClick={() => excluirBloqueio(b.id)} className="text-xs text-red-600 hover:underline">
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Motivo</label>
            <input
              value={novoBloqueioMotivo}
              onChange={(e) => setNovoBloqueioMotivo(e.target.value)}
              placeholder="Ex.: Almoço, Folga, Feriado"
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Início</label>
              <input
                type="datetime-local"
                value={novoBloqueioInicio}
                onChange={(e) => setNovoBloqueioInicio(e.target.value)}
                className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Fim</label>
              <input
                type="datetime-local"
                value={novoBloqueioFim}
                onChange={(e) => setNovoBloqueioFim(e.target.value)}
                className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
              />
            </div>
          </div>
          {erroBloqueio && <p className="text-red-600 text-sm">{erroBloqueio}</p>}
          <button
            onClick={criarBloqueio}
            disabled={salvandoBloqueio}
            className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
          >
            {salvandoBloqueio ? 'Salvando...' : '+ Adicionar bloqueio'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormularioTemplate({
  form,
  onMudar,
  onSalvar,
  onCancelar,
  salvando,
}: {
  form: FormularioModelo;
  onMudar: (form: FormularioModelo) => void;
  onSalvar: () => void;
  onCancelar: () => void;
  salvando: boolean;
}) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Título do modelo</label>
        <input
          value={form.title}
          onChange={(e) => onMudar({ ...form, title: e.target.value })}
          placeholder="Ex.: Termo de consentimento - Toxina botulínica"
          className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Texto do documento</label>
        <textarea
          value={form.content}
          onChange={(e) => onMudar({ ...form, content: e.target.value })}
          rows={10}
          placeholder="Eu, {{paciente_nome}}, portador do CPF {{paciente_cpf}}, autorizo a realização do procedimento de {{procedimento}}..."
          className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A05C] font-mono"
        />
        <p className="text-xs text-stone-500 mt-2">
          Marcadores preenchidos automaticamente:{' '}
          {PLACEHOLDERS_AUTOMATICOS.map((p) => `{{${p.chave}}}`).join(', ')}. Qualquer outro marcador que você
          escrever, como {'{{procedimento}}'} ou {'{{valor}}'}, vira um campo pra preencher na hora de gerar o
          documento.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => onMudar({ ...form, active: e.target.checked })}
        />
        Modelo ativo (aparece na hora de gerar documentos)
      </label>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar modelo'}
        </button>
        <button onClick={onCancelar} className="text-sm text-stone-500 hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ModelosDocumentos({ clinicId }: { clinicId?: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [formulario, setFormulario] = useState<FormularioModelo | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!clinicId) return;
    setErro('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/document-templates?clinicId=${clinicId}&includeInactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setErro('Não foi possível carregar os modelos de documento.');
      }
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  function abrirNovo(code: string) {
    setSucesso('');
    setFormulario({ code, title: '', content: '', active: true });
  }

  function abrirEdicao(template: Template) {
    setSucesso('');
    setFormulario({ ...template });
  }

  async function salvar() {
    if (!formulario || !clinicId) return;
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const token = localStorage.getItem('token');
      const isNovo = !formulario.id;
      const url = isNovo ? `${API_URL}/document-templates` : `${API_URL}/document-templates/${formulario.id}`;
      const res = await fetch(url, {
        method: isNovo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(
          isNovo
            ? { clinicId, code: formulario.code, title: formulario.title, content: formulario.content }
            : { title: formulario.title, content: formulario.content, active: formulario.active },
        ),
      });
      if (!res.ok) throw new Error('Falha ao salvar');

      setSucesso('Modelo salvo com sucesso.');
      setFormulario(null);
      carregar();
    } catch {
      setErro('Não foi possível salvar esse modelo. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(template: Template) {
    const confirmar = window.confirm(`Tem certeza que deseja excluir o modelo "${template.title}"?`);
    if (!confirmar) return;

    setErro('');
    setSucesso('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/document-templates/${template.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');

      const resultado = await res.json();
      setSucesso(
        resultado.excluido
          ? 'Modelo excluído com sucesso.'
          : 'Esse modelo já foi usado para gerar documentos, então foi apenas desativado (não aparece mais na lista de gerar documentos), pra não afetar os documentos já existentes.',
      );
      if (formulario?.id === template.id) setFormulario(null);
      carregar();
    } catch {
      setErro('Não foi possível excluir esse modelo. Tente novamente.');
    }
  }

  if (carregando) {
    return <p className="text-sm text-stone-500">Carregando...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      {sucesso && <p className="text-green-700 text-sm">{sucesso}</p>}

      {TIPOS_MODELO.map((tipo) => {
        const doTipo = templates.filter((t) => t.code === tipo.code);
        return (
          <div key={tipo.code} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-medium text-stone-800 text-sm">{tipo.label}</h2>
              <button
                onClick={() => abrirNovo(tipo.code)}
                className="text-xs text-[#B88A3D] hover:underline"
              >
                + Novo modelo
              </button>
            </div>

            {doTipo.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">Nenhum modelo de {tipo.label.toLowerCase()} ainda.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {doTipo.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-stone-800 truncate">{t.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{t.active ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <button onClick={() => abrirEdicao(t)} className="text-xs text-[#B88A3D] hover:underline">
                        Editar
                      </button>
                      <button onClick={() => excluir(t)} className="text-xs text-red-600 hover:underline">
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {formulario && formulario.code === tipo.code && (
              <div className="p-4 border-t border-stone-200">
                <FormularioTemplate
                  form={formulario}
                  onMudar={setFormulario}
                  onSalvar={salvar}
                  onCancelar={() => setFormulario(null)}
                  salvando={salvando}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [aba, setAba] = useState('geral');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-1">Configurações</h1>
      <p className="text-stone-500 text-sm mb-6">Dados gerais da clínica, horário de atendimento e modelos de documentos.</p>

      <TabsConfiguracoes aba={aba} onMudar={setAba} />

      {aba === 'geral' && <FormularioGeral clinicId={user?.clinicId} />}
      {aba === 'horario' && <HorarioAtendimento clinicId={user?.clinicId} />}
      {aba === 'modelos' && <ModelosDocumentos clinicId={user?.clinicId} />}
    </div>
  );
}
