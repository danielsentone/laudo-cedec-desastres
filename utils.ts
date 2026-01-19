
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
