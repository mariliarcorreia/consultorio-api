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

const ITEM_INICIAL = {
  procedure: '',
  region: '',
  quantity: '1',
  price: '',
  discount: '0',
};

const STATUS_LABEL: Record<string, string> = {
  proposed: 'Proposto',
  accepted: 'Aceito',
  rejected: 'Recusado',
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PlanoTratamentoPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params?.id as string;

  const [nomePaciente, setNomePaciente] = useState('');
  const [planos, setPlanos] = useState<any[]>([]);
  const [novoItem, setNovoItem] = useState<Record<string, typeof ITEM_INICIAL>>({});
  const [carregando, setCarregando] = useState(true);
  const [criandoPlano, setCriandoPlano] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    setErro('');
    try {
      const token = localStorage.getItem('token');

      const [pacienteRes, planosRes] = await Promise.all([
        fetch(`${API_URL}/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/treatment-plans?patientId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (pacienteRes.ok) {
        const paciente = await pacienteRes.json();
        setNomePaciente(paciente.fullName ?? '');
      }

      if (planosRes.ok) {
        const lista = await planosRes.json();
        setPlanos(Array.isArray(lista) ? lista : []);
      } else {
        setErro('Não foi possível carregar os planos de tratamento (o servidor respondeu com um erro).');
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

  async function handleNovoPlano() {
    setCriandoPlano(true);
    setErro('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/treatment-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId: id }),
      });
      if (!res.ok) throw new Error('Falha ao criar plano');
      await carregar();
    } catch {
      setErro('Não foi possível criar um novo plano de tratamento.');
    } finally {
      setCriandoPlano(false);
    }
  }

  async function handleStatusChange(planoId: string, status: string) {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/treatment-plans/${planoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      carregar();
    } catch {
      setErro('Não foi possível atualizar o status do plano.');
    }
  }

  function getItemForm(planoId: string) {
    return novoItem[planoId] || ITEM_INICIAL;
  }

  function handleItemChange(planoId: string, campo: keyof typeof ITEM_INICIAL, valor: string) {
    setNovoItem((prev) => ({
      ...prev,
      [planoId]: { ...getItemForm(planoId), [campo]: valor },
    }));
  }

  async function handleExcluirPlano(planoId: string) {
    const confirmar = window.confirm(
      'Tem certeza que deseja excluir esse plano de tratamento inteiro, com todos os procedimentos dele? Essa ação não pode ser desfeita.',
    );
    if (!confirmar) return;
    try {
      const token = localStorage.getItem('token');
      const actorParam = user?.id ? `?actorUserId=${user.id}` : '';
      const res = await fetch(`${API_URL}/treatment-plans/${planoId}${actorParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      carregar();
    } catch {
      setErro('Não foi possível excluir esse plano de tratamento.');
    }
  }

  async function handleExcluirItem(planoId: string, itemId: string) {
    const confirmar = window.confirm('Tem certeza que deseja excluir esse procedimento do plano?');
    if (!confirmar) return;
    try {
      const token = localStorage.getItem('token');
      const actorParam = user?.id ? `?actorUserId=${user.id}` : '';
      const res = await fetch(`${API_URL}/treatment-plans/${planoId}/items/${itemId}${actorParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      carregar();
    } catch {
      setErro('Não foi possível excluir esse procedimento.');
    }
  }

  async function handleAddItem(planoId: string, e: React.FormEvent) {
    e.preventDefault();
    const item = getItemForm(planoId);
    if (!item.procedure || !item.price) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/treatment-plans/${planoId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          procedure: item.procedure,
          region: item.region || undefined,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price),
          discount: Number(item.discount) || 0,
        }),
      });
      if (!res.ok) throw new Error('Falha ao adicionar item');
      setNovoItem((prev) => ({ ...prev, [planoId]: ITEM_INICIAL }));
      carregar();
    } catch {
      setErro('Não foi possível adicionar esse procedimento ao plano.');
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

      <PatientTabs id={id} active="plano" />

      {erro && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      <button
        onClick={handleNovoPlano}
        disabled={criandoPlano}
        className="mb-6 bg-stone-800 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
      >
        {criandoPlano ? 'Criando...' : '+ Novo plano de tratamento'}
      </button>

      {planos.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhum plano de tratamento criado ainda.</p>
      ) : (
        <div className="space-y-6">
          {planos.map((plano) => {
            const total = (plano.items || []).reduce(
              (soma: number, item: any) => soma + Number(item.finalPrice),
              0,
            );
            const itemForm = getItemForm(plano.id);

            return (
              <div key={plano.id} className="bg-white border border-stone-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-stone-500">
                    Plano criado em {new Date(plano.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex items-center gap-3">
                    <select
                      value={plano.status}
                      onChange={(e) => handleStatusChange(plano.id, e.target.value)}
                      className="text-xs text-stone-800 border border-stone-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    >
                      <option value="proposed">Proposto</option>
                      <option value="accepted">Aceito</option>
                      <option value="rejected">Recusado</option>
                    </select>
                    <button
                      onClick={() => handleExcluirPlano(plano.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Excluir plano
                    </button>
                  </div>
                </div>

                {plano.items.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-stone-500 border-b border-stone-100">
                          <th className="py-2 pr-2">Procedimento</th>
                          <th className="py-2 pr-2">Região</th>
                          <th className="py-2 pr-2">Qtd</th>
                          <th className="py-2 pr-2">Valor</th>
                          <th className="py-2 pr-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {plano.items.map((item: any) => (
                          <tr key={item.id} className="border-b border-stone-50">
                            <td className="py-2 pr-2 text-stone-800">{item.procedure}</td>
                            <td className="py-2 pr-2 text-stone-600">{item.region || '-'}</td>
                            <td className="py-2 pr-2 text-stone-600">{item.quantity}</td>
                            <td className="py-2 pr-2 text-stone-800">{formatarMoeda(Number(item.finalPrice))}</td>
                            <td className="py-2 pr-2 text-right">
                              <button
                                onClick={() => handleExcluirItem(plano.id, item.id)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-right text-sm font-medium text-stone-800 mt-2">
                      Total: {formatarMoeda(total)}
                    </p>
                  </div>
                )}

                <form
                  onSubmit={(e) => handleAddItem(plano.id, e)}
                  className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end border-t border-stone-100 pt-4"
                >
                  <div className="col-span-2 md:col-span-2">
                    <label className="block text-xs font-medium text-stone-600 mb-1">Procedimento</label>
                    <input
                      value={itemForm.procedure}
                      onChange={(e) => handleItemChange(plano.id, 'procedure', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Região</label>
                    <input
                      value={itemForm.region}
                      onChange={(e) => handleItemChange(plano.id, 'region', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Qtd</label>
                    <input
                      type="number"
                      min={1}
                      value={itemForm.quantity}
                      onChange={(e) => handleItemChange(plano.id, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.price}
                      onChange={(e) => handleItemChange(plano.id, 'price', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-5">
                    <button
                      type="submit"
                      className="w-full bg-stone-100 text-stone-800 py-2 rounded-md text-sm font-medium hover:bg-stone-200 transition"
                    >
                      + Adicionar procedimento
                    </button>
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
