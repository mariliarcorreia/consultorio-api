// Utilitário de placeholders dos modelos de documento.
// Um modelo (termo de consentimento, orçamento, atestado etc.) é um texto livre
// escrito pela clínica com marcadores no formato {{chave}}. Alguns marcadores são
// preenchidos automaticamente pelo sistema (dados do paciente, da clínica, a data
// de hoje); qualquer outro marcador que apareça no texto é tratado como um campo
// personalizado, que a tela de geração pede pra preencher na hora.

export const PLACEHOLDERS_AUTOMATICOS = [
  'paciente_nome',
  'paciente_cpf',
  'paciente_nascimento',
  'paciente_endereco',
  'clinica_nome',
  'data_hoje',
  'profissional_nome',
] as const;

const REGEX_PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extrairPlaceholders(conteudo: string): string[] {
  const encontrados = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(REGEX_PLACEHOLDER);
  while ((match = regex.exec(conteudo))) {
    encontrados.add(match[1]);
  }
  return Array.from(encontrados);
}

export function camposPersonalizados(conteudo: string): string[] {
  return extrairPlaceholders(conteudo).filter(
    (chave) => !(PLACEHOLDERS_AUTOMATICOS as readonly string[]).includes(chave),
  );
}

export function preencherModelo(conteudo: string, dados: Record<string, string>): string {
  return conteudo.replace(new RegExp(REGEX_PLACEHOLDER), (_match, chave: string) => {
    return dados[chave] ?? '';
  });
}
