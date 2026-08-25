'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LOCAIS_ATENDIMENTO } from '@/lib/atendimento';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const CAMPOS_INICIAIS = {
  fullName: '',
  birthDate: '',
  cpf: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  guardianName: '',
  guardianPhone: '',
  location: '',
};

function paraInputDate(data: string) {
  if (!data) return '';
  return data.slice(0, 10);
}

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

export default function PacienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;

  const [form, setForm] = useState(CAMPOS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Paciente não encontrado');
        const data = await res.json();
        setForm({
          fullName: data.fullName ?? '',
          birthDate: paraInputDate(data.birthDate),
          cpf: data.cpf ?? '',
          phone: data.phone ?? '',
          whatsapp: data.whatsapp ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          zipCode: data.zipCode ?? '',
          guardianName: data.guardianName ?? '',
          guardianPhone: data.guardianPhone ?? '',
          location: data.location ?? '',
        });
      } catch {
        setErro('Não foi possível carregar os dados desse paciente.');
      } finally {
        setCarregando(false);
      }
    }
    if (id) carregar();
  }, [id]);

  function handleChange(campo: keyof typeof CAMPOS_INICIAIS, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, actorUserId: user?.id }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setSucesso('Dados atualizados com sucesso.');
    } catch {
      setErro('Não foi possível salvar as alterações. Tente novamente.');
    } finally {
      setSalvando(false);
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

      <h1 className="text-2xl font-semibold text-stone-800 mt-3 mb-4">{form.fullName || 'Paciente'}</h1>

      <PatientTabs id={id} active="dados" />

      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Nome completo *</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Data de nascimento *</label>
          <input
            required
            type="date"
            value={form.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">CPF</label>
            <input
              value={form.cpf}
              onChange={(e) => handleChange('cpf', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Telefone</label>
            <input
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">WhatsApp</label>
            <input
              value={form.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Local de atendimento</label>
          <select
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
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

        <p className="text-xs font-medium text-stone-500 pt-2 border-t border-stone-100">Endereço</p>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Endereço</label>
          <input
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-600 mb-1">Cidade</label>
            <input
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">UF</label>
            <input
              value={form.state}
              maxLength={2}
              onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">CEP</label>
          <input
            value={form.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <p className="text-xs font-medium text-stone-500 pt-2 border-t border-stone-100">
          Responsável (se paciente menor de idade)
        </p>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Nome do responsável</label>
          <input
            value={form.guardianName}
            onChange={(e) => handleChange('guardianName', e.target.value)}
            className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Telefone do responsável</label>
          <input
            value={form.guardianPhone}
            onChange={(e) => handleChange('guardianPhone', e.target.value)}
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
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}
