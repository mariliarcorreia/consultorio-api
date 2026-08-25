'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function PatientTabs({ id, active }: { id: string; active: string }) {
  const tabs = [
    { key: 'dados', label: 'Dados cadastrais', href: `/painel/pacientes/${id}` },
    { key: 'anamnese', label: 'Anamnese', href: `/painel/pacientes/${id}/anamnese` },
    { key: 'prontuario', label: 'Prontuário', href: `/painel/pacientes/${id}/prontuario` },
    { key: 'plano', label: 'Plano de tratamento', href: `/painel/pacientes/${id}/plano-tratamento` },
    { key: 'arquivos', label: 'Arquivos', href: `/painel/pacientes/${id}/arquivos` },
    { key: 'documentos', label: 'Documentos', href: `/painel/pacientes/${id}/documentos` },
  ];
  return (
    <div className="flex gap-1 border-b border-stone-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
            active === tab.key
              ? 'border-[#C9A05C] text-[#8A5A2A] font-medium'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

const RESPOSTAS_INICIAIS = {
  alergias: '',
  medicamentosEmUso: '',
  doencasPreExistentes: '',
  gestante: 'nao',
  sangramentoAnormal: 'nao',
  tabagismo: 'nao',
  tratamentoOdontologicoAnterior: '',
  observacoes: '',
};

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString('pt-BR');
}

export default function AnamnesePage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params?.id as string;

  const [nomePaciente, setNomePaciente] = useState('');
  const [respostas, setRespostas] = useState(RESPOSTAS_INICIAIS);
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregar() {
    setErro('');
    try {
      const token = localStorage.getItem('token');

      const [pacienteRes, anamneseRes] = await Promise.all([
        fetch(`${API_URL}/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/anamnesis?patientId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (pacienteRes.ok) {
        const paciente = await pacienteRes.json();
        setNomePaciente(paciente.fullName ?? '');
      }

      if (anamneseRes.ok) {
        const lista = await anamneseRes.json();
        setHistorico(Array.isArray(lista) ? lista : []);
        if (lista?.[0]?.answers) {
          setRespostas({ ...RESPOSTAS_INICIAIS, ...lista[0].answers });
        }
      } else {
        setErro('Não foi possível carregar a anamnese (o servidor respondeu com um erro).');
      }
    } catch {
      setErro('Não foi possível conectar ao servidor. Confira se o backend (consultorio-api) está rodando.');
    }

    setCarregando(false);
  }

  useEffect(() => {
    if (id) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleChange(campo: keyof typeof RESPOSTAS_INICIAIS, valor: string) {
    setRespostas((r) => ({ ...r, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/anamnesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: id,
          answers: respostas,
          filledBy: user?.name || 'Equipe do consultório',
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setSucesso('Anamnese salva com sucesso.');
      carregar();
    } catch {
      setErro('Não foi possível salvar a anamnese. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirVersao(anamneseId: string) {
    const confirmar = window.confirm('Tem certeza que deseja excluir essa versão da anamnese?');
    if (!confirmar) return;
    try {
      const token = localStorage.getItem('token');
      const actorParam = user?.id ? `?actorUserId=${user.id}` : '';
      const res = await fetch(`${API_URL}/anamnesis/${anamneseId}${actorParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      carregar();
    } catch {
      setErro('Não foi possível excluir essa versão da anamnese.');
    }
  }

  if (carregando) {
    return <p className="text-sm text-stone-500">Carregando...</p>;
  }

  return (
    <div className="max-w-2xl">
      <Link href="/painel/pacientes" className="text-sm text-[#B88A3D] hover:underline">
        ← Voltar para a lista
      </Link>

      <h1 className="text-2xl font-semibold text-stone-800 mt-3 mb-4">{nomePaciente || 'Paciente'}</h1>

      <PatientTabs id={id} active="anamnese" />

      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Alergias</label>
          <input
            value={respostas.alergias}
            onChange={(e) => handleChange('alergias', e.target.value)}
            placeholder="Ex: penicilina, látex..."
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Medicamentos em uso</label>
          <input
            value={respostas.medicamentosEmUso}
            onChange={(e) => handleChange('medicamentosEmUso', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Doenças pré-existentes (diabetes, hipertensão, cardiopatia, etc.)
          </label>
          <input
            value={respostas.doencasPreExistentes}
            onChange={(e) => handleChange('doencasPreExistentes', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Gestante</label>
            <select
              value={respostas.gestante}
              onChange={(e) => handleChange('gestante', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
              <option value="na">Não se aplica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Sangramento anormal</label>
            <select
              value={respostas.sangramentoAnormal}
              onChange={(e) => handleChange('sangramentoAnormal', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Tabagismo</label>
            <select
              value={respostas.tabagismo}
              onChange={(e) => handleChange('tabagismo', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Tratamento odontológico anterior</label>
          <input
            value={respostas.tratamentoOdontologicoAnterior}
            onChange={(e) => handleChange('tratamentoOdontologicoAnterior', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Observações gerais</label>
          <textarea
            rows={3}
            value={respostas.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        {sucesso && <p className="text-green-700 text-sm">{sucesso}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-stone-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar anamnese'}
        </button>
      </form>

      {historico.length > 0 && (
        <div className="mt-6 bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-medium text-stone-800 mb-3 text-sm">Histórico de preenchimentos</h2>
          <ul className="space-y-2">
            {historico.map((item) => (
              <li key={item.id} className="text-xs text-stone-500 flex items-center justify-between gap-3">
                <span>
                  Versão {item.version} · preenchida por {item.filledBy} em {formatarDataHora(item.createdAt)}
                </span>
                <button
                  onClick={() => handleExcluirVersao(item.id)}
                  className="text-red-600 hover:underline shrink-0"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
