
export interface DanoInfo {
  tipo: string;
  descricao: string;
  fotos: string[];
}

export interface LaudoData {
  id: number;
  municipio: string;
  data: string;
  engenheiroId: string;
  
  // Identificação do Imóvel
  zona: 'Urbano' | 'Rural';
  proprietario: string;
  requerente: string;
  cpfRequerente: string; // Novo campo
  endereco: string;
  latitude: string;
  longitude: string;
  
  // Campos Urbanos
  indicacaoFiscal: string;
  inscricaoMunicipal: string;
  matricula: string;

  // Campos Rurais
  nirf: string;
  incra: string;

  tipologia: string;
  tipologiaOutro: string;
  levantamentoDanos: DanoInfo[];
  classificacaoDanos: string;
}