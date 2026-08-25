'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const ROTULOS_TIPO: Record<string, string> = {
  consentimento: 'Termo de consentimento',
  orcamento: 'Orçamento',
  atestado: 'Atestado',
  receita: 'Receita',
  atestado_comparecimento: 'Atestado de comparecimento',
};

function rotuloTipo(code: string) {
  return ROTULOS_TIPO[code] ?? code;
}

function rotuloCampo(chave: string) {
  return chave
    .split('_')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString('pt-BR');
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

type Template = {
  id: string;
  code: string;
  title: string;
};

type Documento = {
  id: string;
  title: string;
  status: string;
  signatureMethod: string | null;
  createdAt: string;
  signedAt: string | null;
  template: { title: string; code: string };
};

function PainelAssinatura({
  onCancelar,
  onConfirmar,
}: {
  onCancelar: () => void;
  onConfirmar: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  function posicao(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    desenhando.current = true;
    const { x, y } = posicao(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = posicao(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#292524';
    ctx.lineTo(x, y);
    ctx.stroke();
    setVazio(false);
  }

  function parar() {
    desenhando.current = false;
  }

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
  }

  function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || vazio) return;
    onConfirmar(canvas.toDataURL('image/png'));
  }

  return (
    <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-lg">
      <p className="text-xs text-stone-500 mb-2">Peça para o paciente assinar no espaço abaixo.</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full max-w-md bg-white border border-stone-300 rounded-md touch-none"
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={parar}
      />
      <div className="flex gap-3 mt-3">
        <button
          onClick={limpar}
          type="button"
          className="text-xs text-stone-600 hover:underline"
        >
          Limpar
        </button>
        <button
          onClick={confirmar}
          type="button"
          disabled={vazio}
          className="bg-stone-800 text-white px-4 py-1.5 rounded-md text-xs font-medium hover:bg-stone-700 transition disabled:opacity-50"
        >
          Confirmar assinatura
        </button>
        <button onClick={onCancelar} type="button" className="text-xs text-stone-500 hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function DocumentosPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params?.id as string;

  const [nomePaciente, setNomePaciente] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [templateId, setTemplateId] = useState('');
  const [campos, setCampos] = useState<string[]>([]);
  const [valoresCampos, setValoresCampos] = useState<Record<string, string>>({});
  const [gerando, setGerando] = useState(false);

  const [documentoAssinando, setDocumentoAssinando] = useState<string | null>(null);
  const [documentoEnviandoScan, setDocumentoEnviandoScan] = useState<string | null>(null);

  async function carregar() {
    setErro('');
    try {
      const token = localStorage.getItem('token');
      const [pacienteRes, documentosRes, templatesRes] = await Promise.all([
        fetch(`${API_URL}/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/documents?patientId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/document-templates?clinicId=${user?.clinicId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (pacienteRes.ok) {
        const paciente = await pacienteRes.json();
        setNomePaciente(paciente.fullName ?? '');
      }
      if (documentosRes.ok) {
        const lista = await documentosRes.json();
        setDocumentos(Array.isArray(lista) ? lista : []);
      }
      if (templatesRes.ok) {
        const lista = await templatesRes.json();
        setTemplates(Array.isArray(lista) ? lista : []);
      }
    } catch {
      setErro('Não foi possível conectar ao servidor. Confira se o backend (consultorio-api) está rodando.');
    }
    setCarregando(false);
  }

  useEffect(() => {
    if (id && user?.clinicId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.clinicId]);

  async function handleSelecionarTemplate(novoId: string) {
    setTemplateId(novoId);
    setValoresCampos({});
    setCampos([]);
    if (!novoId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/document-templates/${novoId}/campos-personalizados`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampos(Array.isArray(data.campos) ? data.campos : []);
      }
    } catch {
      // se não der pra buscar os campos, a geração ainda funciona sem eles
    }
  }

  async function handleGerar(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) {
      setErro('Escolha um modelo de documento.');
      return;
    }
    setErro('');
    setSucesso('');
    setGerando(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          templateId,
          fieldsData: valoresCampos,
          createdBy: user?.id,
        }),
      });
      if (!res.ok) throw new Error('Falha ao gerar');

      setSucesso('Documento gerado com sucesso.');
      setTemplateId('');
      setCampos([]);
      setValoresCampos({});
      carregar();
    } catch {
      setErro('Não foi possível gerar esse documento. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  async function handleAssinarDigital(documentoId: string, dataUrl: string) {
    setErro('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/documents/${documentoId}/sign-digital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signatureImage: dataUrl, actorUserId: user?.id }),
      });
      if (!res.ok) throw new Error('Falha ao assinar');
      setDocumentoAssinando(null);
      setSucesso('Documento assinado com sucesso.');
      carregar();
    } catch {
      setErro('Não foi possível registrar essa assinatura.');
    }
  }

  async function handleEnviarScan(documentoId: string, file: File, inputEl: HTMLInputElement) {
    setErro('');
    setDocumentoEnviandoScan(documentoId);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('actorUserId', user?.id || '');

      const res = await fetch(`${API_URL}/documents/${documentoId}/sign-scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Falha ao enviar');
      setSucesso('Termo assinado anexado com sucesso.');
      carregar();
    } catch {
      setErro('Não foi possível anexar o termo assinado.');
    } finally {
      setDocumentoEnviandoScan(null);
      inputEl.value = '';
    }
  }

  async function handleDownload(documentoId: string) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/documents/${documentoId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao gerar link');
      const data = await res.json();
      window.open(data.url, '_blank');
    } catch {
      setErro('Não foi possível abrir esse documento.');
    }
  }

  async function handleExcluir(documentoId: string) {
    const confirmar = window.confirm('Tem certeza que deseja excluir esse documento?');
    if (!confirmar) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/documents/${documentoId}?actorUserId=${user?.id ?? ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      carregar();
    } catch {
      setErro('Não foi possível excluir esse documento.');
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

      <PatientTabs id={id} active="documentos" />

      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <h2 className="font-medium text-stone-800 mb-4 text-sm">Gerar novo documento</h2>

        {templates.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhum modelo cadastrado ainda. Crie um em{' '}
            <Link href="/painel/configuracoes" className="text-[#B88A3D] hover:underline">
              Configurações → Modelos de documentos
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleGerar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Modelo</label>
              <select
                value={templateId}
                onChange={(e) => handleSelecionarTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
              >
                <option value="">Selecione...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({rotuloTipo(t.code)})
                  </option>
                ))}
              </select>
            </div>

            {campos.map((chave) => (
              <div key={chave}>
                <label className="block text-xs font-medium text-stone-600 mb-1">{rotuloCampo(chave)}</label>
                <input
                  value={valoresCampos[chave] ?? ''}
                  onChange={(e) => setValoresCampos((v) => ({ ...v, [chave]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm text-stone-800 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A05C]"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={gerando}
              className="bg-stone-800 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
            >
              {gerando ? 'Gerando...' : 'Gerar documento'}
            </button>
          </form>
        )}

        {erro && <p className="text-red-600 text-sm mt-3">{erro}</p>}
        {sucesso && <p className="text-green-700 text-sm mt-3">{sucesso}</p>}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="font-medium text-stone-800 text-sm">
            Documentos gerados {documentos.length > 0 && `(${documentos.length})`}
          </h2>
        </div>
        {documentos.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">Nenhum documento gerado ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {documentos.map((d) => (
              <li key={d.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 truncate">{d.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {rotuloTipo(d.template?.code ?? '')} · {formatarDataHora(d.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        d.status === 'assinado'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {d.status === 'assinado' ? 'Assinado' : 'Gerado'}
                    </span>
                    <button onClick={() => handleDownload(d.id)} className="text-xs text-[#B88A3D] hover:underline">
                      Baixar
                    </button>
                    <button onClick={() => handleExcluir(d.id)} className="text-xs text-red-600 hover:underline">
                      Excluir
                    </button>
                  </div>
                </div>

                {d.status !== 'assinado' && (
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => setDocumentoAssinando(documentoAssinando === d.id ? null : d.id)}
                      className="text-xs text-stone-600 hover:underline"
                    >
                      Assinar na tela
                    </button>
                    <label className="text-xs text-stone-600 hover:underline cursor-pointer">
                      {documentoEnviandoScan === d.id ? 'Enviando...' : 'Anexar termo assinado (escaneado)'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={documentoEnviandoScan === d.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEnviarScan(d.id, file, e.target);
                        }}
                      />
                    </label>
                  </div>
                )}

                {documentoAssinando === d.id && (
                  <PainelAssinatura
                    onCancelar={() => setDocumentoAssinando(null)}
                    onConfirmar={(dataUrl) => handleAssinarDigital(d.id, dataUrl)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
