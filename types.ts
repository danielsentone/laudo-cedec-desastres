
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
  inscricaoMunicipal: string;
  proprietario: string;
  requerente: string;
  endereco: string;
  latitude: string;
  longitude: string;
  tipologia: string;
  tipologiaOutro: string;
  levantamentoDanos: DanoInfo[];
  classificacaoDanos: string;
}
