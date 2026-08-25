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

const CAMPOS_INICIAIS = {
  complaint: '',
  evaluation: '',
  diagnosis: '',
  conduct: '',
  notes: '',
};

const NOTA_INICIAL = {
  date: '',
  procedure: '',
  region: '',
  evolution: '',
  intercurrence: '',
  conduct: '',
  nextFollowUp: '',
};

function formatarData(data: string) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function ProntuarioPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params?.id as string;

  const [nomePaciente, setNomePaciente] = useState('');
  const [recordId, setRecordId] = useState<string | null>(null);
  const [form, setForm] = useState(CAMPOS_INICIAIS);
  const [notas, setNotas] = useState<any[]>([]);
  const [novaNota, setNovaNota] = useState(NOTA_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregar() {
    setErro('');
    try {
      const token = localStorage.getItem('token');

      const [pacienteRes, recordRes] = await Promise.all([
        fetch(`${API_URL}/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/clinical-records?patientId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (pacienteRes.ok) {
        const paciente = await pacienteRes.json();
        setNomePaciente(paciente.fullName ?? '');
      }

      if (recordRes.ok) {
        const texto = await recordRes.text();
        const record = texto ? JSON.parse(texto) : null;
        if (record) {
          setRecordId(record.id);
          setForm({
            complaint: record.complaint ?? '',
            evaluation: record.evaluation ?? '',
            diagnosis: record.diagnosis ?? '',
            conduct: record.conduct ?? '',
            notes: record.notes ?? '',
          });
          setNotas(record.clinicalNotes ?? []);
        }
      } else {
        setErro('Não foi possível carregar o prontuário (o servidor respondeu com um erro).');
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

  function handleChange(campo: keyof typeof CAMPOS_INICIAIS, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function handleNotaChange(campo: keyof typeof NOTA_INICIAL, valor: string) {
    setNovaNota((n) => ({ ...n, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const token = localStorage.getItem('token');
      const professionalId = user?.id || '';

      if (recordId) {
        const res = await fetch(`${API_URL}/clinical-records/${recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Falha ao salvar');
      } else {
        const res = await fetch(`${API_URL}/clinical-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...form, patientId: id, professionalId }),
        });
        if (!res.ok) throw new Error('Falha ao criar');
        const created = await res.json();
        setRecordId(created.id);
      }

      setSucesso('Prontuário salvo com sucesso.');
    } catch {
      setErro('Não foi possível salvar o prontuário. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleAddNota(e: React.FormEvent) {
    e.preventDefault();
    if (!recordId) {
      setErro('Salve os dados principais do prontuário antes de adicionar uma evolução.');
      return;
    }
    setSalvandoNota(true);
    setErro('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clinical-records/${recordId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...novaNota, professionalId: user?.id || '' }),
      });
      if (!res.ok) throw new Error('Falha ao salvar evolução');
      const atualizado = await res.json();
      setNotas(atualizado.clinicalNotes ?? []);
      setNovaNota(NOTA_INICIAL);
    } catch {
      setErro('Não foi possível salvar essa evolução. Tente novamente.');
    } finally {
      setSalvandoNota(false);
    }
  }

  async function handleExcluirRegistro() {
    if (!recordId) return;
    const confirmar = window.confirm(
      'Tem certeza que deseja excluir o prontuário desse paciente, com todas as evoluções registradas nele? Essa ação não pode ser desfeita.',
    );
    if (!confirmar) return;
    try {
      const token = localStorage.getItem('token');
      const actorParam = user?.id ? `?actorUserId=${user.id}` : '';
      const res = await fetch(`${API_URL}/clinical-records/${recordId}${actorParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      setRecordId(null);
      setForm(CAMPOS_INICIAIS);
      setNotas([]);
      setSucesso('Prontuário excluído com sucesso.');
    } catch {
      setErro('Não foi possível excluir o prontuário.');
    }
  }

  async function handleExcluirNota(notaId: string) {
    if (!recordId) return;
    const confirmar = window.confirm('Tem certeza que deseja excluir essa evolução?');
    if (!confirmar) return;
    try {
      const token = localStorage.getItem('token');
      const actorParam = user?.id ? `?actorUserId=${user.id}` : '';
      const res = await fetch(`${API_URL}/clinical-records/${recordId}/notes/${notaId}${actorParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      const atualizado = await res.json();
      setNotas(atualizado.clinicalNotes ?? []);
    } catch {
      setErro('Não foi possível excluir essa evolução.');
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

      <PatientTabs id={id} active="prontuario" />

      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-stone-800 text-sm">Ficha clínica</h2>
          {recordId && (
            <button
              type="button"
              onClick={handleExcluirRegistro}
              className="text-xs text-red-600 hover:underline"
            >
              Excluir prontuário
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Queixa principal</label>
          <textarea
            rows={2}
            value={form.complaint}
            onChange={(e) => handleChange('complaint', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Avaliação clínica</label>
          <textarea
            rows={2}
            value={form.evaluation}
            onChange={(e) => handleChange('evaluation', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Diagnóstico</label>
          <textarea
            rows={2}
            value={form.diagnosis}
            onChange={(e) => handleChange('diagnosis', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Conduta</label>
          <textarea
            rows={2}
            value={form.conduct}
            onChange={(e) => handleChange('conduct', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Observações</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
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
          {salvando ? 'Salvando...' : 'Salvar ficha clínica'}
        </button>
      </form>

      <div className="mt-6 bg-white border border-stone-200 rounded-xl p-6">
        <h2 className="font-medium text-stone-800 mb-4 text-sm">Evoluções</h2>

        {notas.length === 0 ? (
          <p className="text-sm text-stone-500 mb-4">Nenhuma evolução registrada ainda.</p>
        ) : (
          <ul className="space-y-3 mb-6">
            {notas.map((nota) => (
              <li key={nota.id} className="border border-stone-100 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-stone-500 mb-1">
                    {formatarData(nota.date)}
                    {nota.procedure ? ` · ${nota.procedure}` : ''}
                    {nota.region ? ` · ${nota.region}` : ''}
                  </p>
                  <button
                    onClick={() => handleExcluirNota(nota.id)}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Excluir
                  </button>
                </div>
                {nota.evolution && <p className="text-stone-700">{nota.evolution}</p>}
                {nota.intercurrence && (
                  <p className="text-stone-500 text-xs mt-1">Intercorrência: {nota.intercurrence}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddNota} className="space-y-3 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium text-stone-500">Nova evolução</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Data</label>
              <input
                required
                type="date"
                value={novaNota.date}
                onChange={(e) => handleNotaChange('date', e.target.value)}
                className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Procedimento</label>
              <input
                value={novaNota.procedure}
                onChange={(e) => handleNotaChange('procedure', e.target.value)}
                className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Região</label>
            <input
              value={novaNota.region}
              onChange={(e) => handleNotaChange('region', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Evolução</label>
            <textarea
              rows={2}
              value={novaNota.evolution}
              onChange={(e) => handleNotaChange('evolution', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Intercorrência</label>
            <input
              value={novaNota.intercurrence}
              onChange={(e) => handleNotaChange('intercurrence', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Próximo retorno</label>
            <input
              type="date"
              value={novaNota.nextFollowUp}
              onChange={(e) => handleNotaChange('nextFollowUp', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>

          <button
            type="submit"
            disabled={salvandoNota}
            className="w-full bg-stone-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
          >
            {salvandoNota ? 'Salvando...' : 'Adicionar evolução'}
          </button>
        </form>
      </div>
    </div>
  );
}
