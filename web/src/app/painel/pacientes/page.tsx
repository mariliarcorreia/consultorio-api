'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LOCAIS_ATENDIMENTO, rotuloLocal } from '@/lib/atendimento';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Patient = {
  id: string;
  fullName: string;
  birthDate: string;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
};

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

function formatarData(data: string) {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function PacientesPage() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState(CAMPOS_INICIAIS);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [busca, setBusca] = useState('');

  const pacientesFiltrados = busca.trim()
    ? pacientes.filter((p) => normalizar(p.fullName).includes(normalizar(busca)))
    : pacientes;

  async function carregarPacientes(clinicId: string) {
    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/patients?clinicId=${clinicId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPacientes(Array.isArray(data) ? data : []);
    } catch {
      setErro('Não foi possível carregar a lista de pacientes.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (user?.clinicId) {
      carregarPacientes(user.clinicId);
    }
  }, [user?.clinicId]);

  async function handleExcluir(id: string, nome: string) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o paciente "${nome}"? Ele vai sumir da lista.`,
    );
    if (!confirmar) return;

    try {
      const token = localStorage.getItem('token');
      const actorParam = user?.id ? `?actorUserId=${user.id}` : '';
      const res = await fetch(`${API_URL}/patients/${id}${actorParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      if (user?.clinicId) carregarPacientes(user.clinicId);
    } catch {
      setErro('Não foi possível excluir esse paciente. Tente novamente.');
    }
  }

  function handleChange(campo: keyof typeof CAMPOS_INICIAIS, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.clinicId) return;
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, clinicId: user.clinicId, actorUserId: user.id }),
      });

      if (!res.ok) throw new Error('Falha ao cadastrar paciente');

      setForm(CAMPOS_INICIAIS);
      setSucesso('Paciente cadastrado com sucesso.');
      carregarPacientes(user.clinicId);
    } catch {
      setErro('Não foi possível cadastrar o paciente. Confira os dados e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[#1E1A16] mb-1">
        Pacientes
      </h1>
      <p className="text-[#8A8177] text-sm mb-8">Cadastre novos pacientes e veja a lista completa.</p>

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        {/* Formulário de cadastro */}
        <div className="bg-white border border-[#EFE6D3] rounded-xl p-6 h-fit">
          <h2 className="font-medium text-[#1E1A16] mb-4">Novo paciente</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full bg-[#A9702F] text-white py-2.5 rounded-md text-sm font-medium hover:bg-[#8A5A2A] transition disabled:opacity-50 shadow-[0_2px_8px_rgba(169,112,47,0.28)]"
            >
              {salvando ? 'Salvando...' : 'Cadastrar paciente'}
            </button>
          </form>
        </div>

        {/* Lista de pacientes */}
        <div className="bg-white border border-[#EFE6D3] rounded-xl overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-[#EFE6D3] space-y-3">
            <h2 className="font-medium text-[#1E1A16]">
              Lista de pacientes {pacientes.length > 0 && `(${pacientes.length})`}
            </h2>
            {pacientes.length > 0 && (
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar paciente pelo nome..."
                className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
              />
            )}
          </div>

          {carregando ? (
            <p className="p-6 text-sm text-stone-500">Carregando...</p>
          ) : pacientes.length === 0 ? (
            <p className="p-6 text-sm text-stone-500">Nenhum paciente cadastrado ainda.</p>
          ) : pacientesFiltrados.length === 0 ? (
            <p className="p-6 text-sm text-stone-500">Nenhum paciente encontrado com esse nome.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] tracking-[0.08em] text-[#A79C89] font-semibold px-6 py-3 border-b border-[#F2EBDB]">
                      PACIENTE
                    </th>
                    <th className="text-left text-[10.5px] tracking-[0.08em] text-[#A79C89] font-semibold px-6 py-3 border-b border-[#F2EBDB]">
                      CONTATO
                    </th>
                    <th className="text-left text-[10.5px] tracking-[0.08em] text-[#A79C89] font-semibold px-6 py-3 border-b border-[#F2EBDB]">
                      STATUS
                    </th>
                    <th className="text-left text-[10.5px] tracking-[0.08em] text-[#A79C89] font-semibold px-6 py-3 border-b border-[#F2EBDB]">
                      AÇÃO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FBF8F0] transition-colors">
                      <td className="px-6 py-3.5 border-b border-[#F2EBDB]">
                        <Link href={`/painel/pacientes/${p.id}`} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#F1E3C2] text-[#8A5A2A] flex items-center justify-center text-xs font-semibold shrink-0">
                            {iniciais(p.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#1E1A16] text-sm truncate">{p.fullName}</p>
                            <p className="text-xs text-[#8A8177] mt-0.5">Nascimento: {formatarData(p.birthDate)}</p>
                            {p.location && (
                              <p className="text-xs text-[#A9702F] mt-0.5">{rotuloLocal(p.location)}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 border-b border-[#F2EBDB] text-sm text-[#3A332C]">
                        {p.phone || '—'}
                      </td>
                      <td className="px-6 py-3.5 border-b border-[#F2EBDB]">
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#E6F0E5] text-[#4C7A54] font-medium">
                          Ativo
                        </span>
                      </td>
                      <td className="px-6 py-3.5 border-b border-[#F2EBDB]">
                        <div className="flex items-center gap-4">
                          <Link href={`/painel/pacientes/${p.id}`} className="text-xs text-[#A9702F] font-medium">
                            Ver paciente →
                          </Link>
                          <button
                            onClick={() => handleExcluir(p.id, p.fullName)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
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
    </div>
  );
}
