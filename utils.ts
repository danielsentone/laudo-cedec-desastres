
export const getNivelDestruicao = (classificacao: string): string => {
  switch (classificacao) {
    case "Danos Mínimos": return "Sem Destruição";
    case "Danos Parciais": return "Destruição Parcial Leve";
    case "Danos Severos": return "Destruição Parcial Grave";
    case "Ruína": return "Destruição Total";
    default: return "";
  }
};

export const getPercentualDestruicao = (classificacao: string): string => {
  switch (classificacao) {
    case "Danos Mínimos": return "10%";
    case "Danos Parciais": return "40%";
    case "Danos Severos": return "70%";
    case "Ruína": return "100%";
    default: return "";
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- MÁSCARAS E VALIDAÇÕES ---

export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
};

export const maskINCRA = (value: string) => {
  // Padrão SNCR: 000.000.000.000-0 (13 dígitos)
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{1})\d+?$/, '$1');
};

export const validateINCRA = (value: string): boolean => {
  const cleanValue = value.replace(/[^\d]/g, '');
  // Verifica se tem 13 dígitos (padrão completo)
  return cleanValue.length === 13;
};

export const maskMatricula = (value: string) => {
  // Padrão: CCCCCC.L.NNNNNNN-VV (16 dígitos)
  // CNS (6) . Livro (1) . Número (7) - Verificador (2)
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{6})(\d)/, '$1.$2')      // Adiciona ponto após o CNS
    .replace(/^(\d{6})\.(\d)(\d)/, '$1.$2.$3') // Adiciona ponto após o Livro
    .replace(/\.(\d{7})(\d)/, '.$1-$2')    // Adiciona hífen antes dos verificadores
    .replace(/(-\d{2})\d+?$/, '$1');       // Limita o tamanho
};

export const validateMatricula = (value: string): boolean => {
  const cleanValue = value.replace(/[^\d]/g, '');
  // Verifica se tem 16 dígitos (padrão completo)
  return cleanValue.length === 16;
};