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
  const showVal = (val: string | undefined | null) => {
    if (!val || val.trim() === '') {
        return <span className="text-gray-400 italic font-normal">Não Fornecido/Identificado</span>;
    }
    return val;
  };

  return (
    <div id="laudo-preview-container" className="bg-white p-[15mm] font-sans text-xs text-black w-[210mm] min-h-[297mm] mx-auto relative box-border" style={{ color: '#000000' }}>
      
      {/* HEADER VISUAL (Apenas para Preview em Tela - Sincronizado com PDF) */}
      <div className="relative flex items-center justify-center mb-8 pt-6 pb-2">
         <div className="text-center w-full">
             <h2 className="font-black text-2xl uppercase text-black leading-none mb-1" style={{color: '#000000'}}>Estado do Paraná</h2>
             <h3 className="font-black text-xl uppercase text-black leading-none mb-1" style={{color: '#000000'}}>Coordenadoria Estadual da Defesa Civil</h3>
             <p className="font-bold text-sm uppercase text-black leading-none" style={{color: '#000000'}}>Fundo Estadual para Calamidades Públicas</p>
         </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (Alvo do PDF) */}
      <div id="laudo-content-body" className="w-full text-black" style={{ color: '#000000' }}>
          
          {/* TITULO */}
          <div className="text-center mb-10">
            <h1 className="text-xl font-black uppercase tracking-wider underline text-black" style={{color: '#000000'}}>Laudo de Imóvel Afetado por Evento Climático</h1>
          </div>

          {/* DADOS GERAIS */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
                <span className="font-bold uppercase text-black" style={{color: '#000000'}}>Município:</span> <span className="uppercase ml-2 border-b border-dotted border-gray-400">{showVal(data.municipio)}</span>
            </div>
            <div className="text-right">
                <span className="font-bold uppercase text-black" style={{color: '#000000'}}>Data:</span> <span className="uppercase ml-2 border-b border-dotted border-gray-400">{new Date(data.data).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* INFORMAÇÕES DO IMÓVEL */}
          <div className="mb-8">
            <h2 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-1 text-black" style={{color: '#000000'}}>Informações do Imóvel</h2>
            <div className="space-y-3 pl-2">
                <div className="grid grid-cols-1 mb-2 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Zona do Imóvel:</span> {data.zona}</p>
                </div>

                {data.zona === 'Urbano' ? (
                    <>
                        <div className="grid grid-cols-1 break-inside-avoid">
                            <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Indicação Fiscal:</span> {showVal(data.indicacaoFiscal)}</p>
                        </div>
                        <div className="grid grid-cols-1 break-inside-avoid">
                            <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Inscrição Municipal:</span> {showVal(data.inscricaoMunicipal)}</p>
                        </div>
                        <div className="grid grid-cols-1 break-inside-avoid">
                            <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Matrícula:</span> {showVal(data.matricula)}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-1 break-inside-avoid">
                            <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>NIRF (Receita):</span> {showVal(data.nirf)}</p>
                        </div>
                        <div className="grid grid-cols-1 break-inside-avoid">
                            <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>INCRA (CCIR):</span> {showVal(data.incra)}</p>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-1 mt-2 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Proprietário:</span> {showVal(data.proprietario)}</p>
                </div>
                <div className="grid grid-cols-1 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Requerente:</span> {showVal(data.requerente)}</p>
                </div>
                <div className="grid grid-cols-1 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>CPF do Requerente:</span> {showVal(data.cpfRequerente)}</p>
                </div>
                <div className="grid grid-cols-1 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Endereço:</span> {showVal(data.endereco)}</p>
                </div>
                <div className="grid grid-cols-1 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Coordenadas:</span> {data.latitude}, {data.longitude}</p>
                </div>
                <div className="grid grid-cols-1 break-inside-avoid">
                    <p><span className="font-bold uppercase w-40 inline-block text-black" style={{color: '#000000'}}>Tipologia:</span> {data.tipologia === 'Outro' ? showVal(data.tipologiaOutro) : showVal(data.tipologia)}</p>
                </div>
            </div>
          </div>

          {/* MAPA */}
          <div className="mb-8 border-2 border-gray-300 p-1 flex justify-center items-center bg-gray-100 min-h-[200px] break-inside-avoid">
            <div className="text-center text-gray-400 w-full">
                <p className="font-bold mb-2 uppercase text-xs text-gray-500">Imagem Aérea de Satélite (Localização Georreferenciada)</p>
                <div className="w-full flex items-center justify-center relative overflow-hidden">
                    {mapSnapshot ? (
                        <div className="relative w-full h-auto max-h-[400px]">
                            <img src={mapSnapshot} alt="Imagem Aérea da Localização" className="max-w-full h-auto object-contain mx-auto" style={{ maxHeight: '400px' }} />
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
            <h2 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-1 text-black" style={{color: '#000000'}}>Levantamento de Danos</h2>
            <div className="space-y-6">
                {data.levantamentoDanos.length === 0 && <p className="italic text-gray-500">Nenhum dano registrado.</p>}
                {data.levantamentoDanos.map((dano, idx) => (
                    <div key={idx} className="mb-4 break-inside-avoid">
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
          <div className="mb-12 border-t-2 border-gray-800 pt-6 break-inside-avoid">
            <h2 className="font-bold uppercase text-center text-base mb-6 text-black" style={{color: '#000000'}}>Classificação e Parecer Técnico</h2>
            <div className="grid grid-cols-1 gap-2 text-sm pl-4">
                <p><span className="font-bold uppercase w-64 inline-block text-black" style={{color: '#000000'}}>Classificação do Dano:</span> {showVal(data.classificacaoDanos)}</p>
                <p><span className="font-bold uppercase w-64 inline-block text-black" style={{color: '#000000'}}>Nível de Destruição:</span> {showVal(getNivelDestruicao(data.classificacaoDanos))}</p>
                <p><span className="font-bold uppercase w-64 inline-block text-black" style={{color: '#000000'}}>Percentual Estimado:</span> {showVal(getPercentualDestruicao(data.classificacaoDanos))}</p>
            </div>
          </div>

          {/* ASSINATURA */}
          <div className="mt-16 flex flex-col items-center justify-center break-inside-avoid text-black" style={{color: '#000000'}}>
            <div className="w-80 border-t border-black mb-2"></div>
            <p className="font-bold uppercase text-sm text-black" style={{color: '#000000'}}>{engenheiro?.nome || '__________________________'}</p>
            <p className="uppercase text-xs text-black" style={{color: '#000000'}}>Engenheiro Civil</p>
            <p className="text-xs text-black" style={{color: '#000000'}}>CREA: {engenheiro?.creaEstado} {engenheiro?.creaNumero || '__________'}</p>
          </div>

      </div>

      {/* FOOTER VISUAL (Apenas para Preview em Tela) */}
      <div className="mt-16 pb-4">
         <div className="w-full h-2 flex mb-2">
             <div className="bg-[#0038a8] w-[85%] h-full" style={{ clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)' }}></div>
             <div className="bg-[#009943] w-[15%] h-full ml-[-10px]" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
         </div>
         <div className="text-center text-[10px] text-black font-bold" style={{color: '#000000'}}>
            <p className="leading-tight">Palácio das Araucárias - 1º andar - Setor C | Centro Cívico | Curitiba/PR | CEP 80.530-140</p>
            <p className="leading-tight">E-mail: defesacivil@defesacivil.pr.gov.br | Fone: (41) 3281-2500</p>
            <p className="mt-1 font-black italic text-black text-[10px]" style={{color: '#000000'}}>"Defesa Civil somos todos nós"</p>
         </div>
      </div>

    </div>
  );
};

export default LaudoPreview;