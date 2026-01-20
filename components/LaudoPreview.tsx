import React from 'react';
import { LaudoData } from '../types';
import { Engenheiro } from '../constants';
import { getNivelDestruicao, getPercentualDestruicao } from '../utils';
import { LOGO_DEFESA_CIVIL_BASE64, LOGO_PARANA_BASE64 } from '../assets';

interface Props {
  data: LaudoData;
  engenheiro: Engenheiro | undefined;
  mapSnapshot: string | null;
}

const LaudoPreview: React.FC<Props> = ({ data, engenheiro, mapSnapshot }) => {
  // Helper para exibir "Não Fornecido/Identificado" caso o valor seja vazio
  const showVal = (val: string | undefined | null) => {
    if (!val || val.trim() === '') {
        return <span className="text-gray-400 italic font-normal">Não Fornecido/Identificado</span>;
    }
    return val;
  };

  return (
    <div id="laudo-pdf-content" className="bg-white p-12 font-sans text-xs text-gray-900 w-full max-w-[21cm] h-auto relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
        <div className="flex items-center gap-4">
            {/* Logo Paraná */}
            <img src={LOGO_PARANA_BASE64} alt="Brasão PR" className="h-20" />
            <div className="text-center">
                <h2 className="font-bold text-sm uppercase">Estado do Paraná</h2>
                <h3 className="font-bold text-xs uppercase">Coordenadoria Estadual da Defesa Civil</h3>
                <p className="text-[10px] uppercase">Fundo Estadual para Calamidades Públicas</p>
            </div>
        </div>
        {/* Logo Defesa Civil */}
        <img src={LOGO_DEFESA_CIVIL_BASE64} alt="Defesa Civil" className="h-16" />
      </div>

      {/* TITULO */}
      <div className="text-center mb-10">
        <h1 className="text-xl font-black uppercase tracking-wider underline">Laudo de Imóvel Afetado por Evento Climático</h1>
      </div>

      {/* DADOS GERAIS */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
            <span className="font-bold uppercase">Município:</span> <span className="uppercase ml-2 border-b border-dotted border-gray-400">{showVal(data.municipio)}</span>
        </div>
        <div className="text-right">
            <span className="font-bold uppercase">Data:</span> <span className="uppercase ml-2 border-b border-dotted border-gray-400">{new Date(data.data).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* INFORMAÇÕES DO IMÓVEL */}
      <div className="mb-8">
        <h2 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-1">Informações do Imóvel</h2>
        <div className="space-y-3 pl-2">
            <div className="grid grid-cols-1 mb-2">
                <p><span className="font-bold uppercase w-40 inline-block">Zona do Imóvel:</span> {data.zona}</p>
            </div>

            {/* Campos Condicionais baseados na Zona */}
            {data.zona === 'Urbano' ? (
                <>
                    <div className="grid grid-cols-1">
                        <p><span className="font-bold uppercase w-40 inline-block">Indicação Fiscal:</span> {showVal(data.indicacaoFiscal)}</p>
                    </div>
                    <div className="grid grid-cols-1">
                        <p><span className="font-bold uppercase w-40 inline-block">Inscrição Imobiliária:</span> {showVal(data.inscricaoImobiliaria)}</p>
                    </div>
                    <div className="grid grid-cols-1">
                        <p><span className="font-bold uppercase w-40 inline-block">Matrícula:</span> {showVal(data.matricula)}</p>
                    </div>
                </>
            ) : (
                <>
                     <div className="grid grid-cols-1">
                        <p><span className="font-bold uppercase w-40 inline-block">NIRF (Receita):</span> {showVal(data.nirf)}</p>
                    </div>
                    <div className="grid grid-cols-1">
                        <p><span className="font-bold uppercase w-40 inline-block">INCRA (CCIR):</span> {showVal(data.incra)}</p>
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 mt-2">
                <p><span className="font-bold uppercase w-40 inline-block">Proprietário:</span> {showVal(data.proprietario)}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Requerente:</span> {showVal(data.requerente)}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">CPF do Requerente:</span> {showVal(data.cpfRequerente)}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Endereço:</span> {showVal(data.endereco)}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Coordenadas:</span> {data.latitude}, {data.longitude}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Tipologia:</span> {data.tipologia === 'Outro' ? showVal(data.tipologiaOutro) : showVal(data.tipologia)}</p>
            </div>
        </div>
      </div>

      {/* MAPA */}
      <div className="mb-8 border-2 border-gray-300 p-1 flex justify-center items-center bg-gray-100 min-h-[200px] page-break-inside-avoid">
         <div className="text-center text-gray-400 w-full">
            <p className="font-bold mb-2 uppercase text-xs text-gray-500">Imagem Aérea de Satélite (Localização Georreferenciada)</p>
            <div className="w-full flex items-center justify-center relative overflow-hidden">
                {mapSnapshot ? (
                    <div className="relative w-full h-auto max-h-[400px]">
                        <img src={mapSnapshot} alt="Imagem Aérea da Localização" className="w-full h-auto object-contain mx-auto" style={{ maxHeight: '400px' }} />
                        {/* Marcador Central (Pin) */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full -mt-1 pointer-events-none drop-shadow-lg">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor" stroke="#fff" strokeWidth="1.5">
                              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                           </svg>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-200">
                        <div className="text-4xl opacity-20">📡</div>
                        <p className="text-[10px] mt-2">Imagem de satélite indisponível</p>
                    </div>
                )}
            </div>
            <div className="mt-2 text-[10px] text-gray-500 font-mono">
                Lat: {data.latitude} | Lon: {data.longitude}
            </div>
         </div>
      </div>

      {/* DANOS */}
      <div className="mb-8">
        <h2 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-1">Levantamento de Danos</h2>
        <div className="space-y-6">
            {data.levantamentoDanos.length === 0 && <p className="italic text-gray-500">Nenhum dano registrado.</p>}
            {data.levantamentoDanos.map((dano, idx) => (
                <div key={idx} className="mb-4 page-break-inside-avoid">
                    <p className="mb-2 text-justify">
                        <span className="font-bold uppercase text-red-700 mr-2">[{dano.tipo}]:</span> 
                        {showVal(dano.descricao)}
                    </p>
                    {dano.fotos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {dano.fotos.map((foto, fIdx) => (
                                <img key={fIdx} src={foto} className="w-full h-40 object-cover border border-gray-200" alt={`Dano ${dano.tipo}`} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* AÇÕES / CLASSIFICAÇÃO */}
      <div className="mb-12 border-t-2 border-gray-800 pt-6 page-break-inside-avoid">
        <h2 className="font-bold uppercase text-center text-base mb-6">Classificação e Parecer Técnico</h2>
        <div className="grid grid-cols-1 gap-2 text-sm pl-4">
            <p><span className="font-bold uppercase w-64 inline-block">Classificação do Dano:</span> {showVal(data.classificacaoDanos)}</p>
            <p><span className="font-bold uppercase w-64 inline-block">Nível de Destruição:</span> {showVal(getNivelDestruicao(data.classificacaoDanos))}</p>
            <p><span className="font-bold uppercase w-64 inline-block">Percentual Estimado:</span> {showVal(getPercentualDestruicao(data.classificacaoDanos))}</p>
        </div>
      </div>

      {/* ASSINATURA */}
      <div className="mt-16 flex flex-col items-center justify-center page-break-inside-avoid">
        <div className="w-80 border-t border-black mb-2"></div>
        <p className="font-bold uppercase text-sm">{engenheiro?.nome || '__________________________'}</p>
        <p className="uppercase text-xs">Engenheiro Civil</p>
        <p className="text-xs">CREA: {engenheiro?.creaEstado} {engenheiro?.creaNumero || '__________'}</p>
      </div>

      {/* RODAPÉ */}
      <div className="mt-16 text-center text-[10px] text-gray-500 border-t border-gray-200 pt-4 page-break-inside-avoid">
        <p>Palácio das Araucárias - 1º andar - Setor C | Centro Cívico | Curitiba/PR | CEP 80.530-140</p>
        <p>E-mail: defesacivil@defesacivil.pr.gov.br | Fone: (41) 3281-2500</p>
        <p className="mt-1 font-bold italic">"Defesa Civil somos todos nós"</p>
      </div>
    </div>
  );
};

export default LaudoPreview;