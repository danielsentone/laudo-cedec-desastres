
import React from 'react';
import { LaudoData } from '../types';
import { Engenheiro } from '../constants';
import { getNivelDestruicao, getPercentualDestruicao } from '../utils';
import { LOGO_DEFESA_CIVIL_BASE64, LOGO_PARANA_BASE64 } from '../assets';

interface Props {
  data: LaudoData;
  engenheiro: Engenheiro | undefined;
}

const LaudoPreview: React.FC<Props> = ({ data, engenheiro }) => {
  // URL para mapa estático (simulado para este ambiente, idealmente seria uma API Key real)
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&zoom=18&size=600x300&maptype=hybrid&markers=color:red%7Clabel:A%7C${data.latitude},${data.longitude}&key=YOUR_API_KEY_HERE_IF_NEEDED`; 
  // Nota: Sem API Key do Google, isso pode falhar em produção real, mas a lógica está correta. 
  // Para visualização local sem chave, podemos usar um placeholder ou o container do Leaflet se fosse renderização direta, 
  // mas para PDF estático, uma imagem é necessária. Vou usar um placeholder visual se a imagem falhar ou para demonstração.
  
  return (
    <div id="laudo-pdf-content" className="bg-white p-12 font-sans text-xs text-gray-900 w-full max-w-[21cm] min-h-[29.7cm] relative">
      {/* Background Pattern Simples para simular papel timbrado se necessário, ou branco limpo */}
      
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
            <span className="font-bold uppercase">Município:</span> <span className="uppercase ml-2 border-b border-dotted border-gray-400">{data.municipio}</span>
        </div>
        <div className="text-right">
            <span className="font-bold uppercase">Data:</span> <span className="uppercase ml-2 border-b border-dotted border-gray-400">{new Date(data.data).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* INFORMAÇÕES DO IMÓVEL */}
      <div className="mb-8">
        <h2 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-1">Informações do Imóvel</h2>
        <div className="space-y-3 pl-2">
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Inscrição Municipal:</span> {data.inscricaoMunicipal || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Proprietário:</span> {data.proprietario}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Requerente:</span> {data.requerente}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Endereço:</span> {data.endereco}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Coordenadas:</span> {data.latitude}, {data.longitude}</p>
            </div>
            <div className="grid grid-cols-1">
                <p><span className="font-bold uppercase w-40 inline-block">Tipologia:</span> {data.tipologia === 'Outro' ? data.tipologiaOutro : data.tipologia}</p>
            </div>
        </div>
      </div>

      {/* MAPA */}
      <div className="mb-8 border-2 border-gray-300 p-1 flex justify-center items-center bg-gray-100 min-h-[200px]">
         {/* Simulando a imagem do mapa. Em produção real, use a imagem gerada ou capture o canvas */}
         <div className="text-center text-gray-400">
            <p className="font-bold mb-2">LOCALIZAÇÃO GEORREFERENCIADA</p>
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center relative overflow-hidden">
                {/* Fallback visual para o PDF */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 text-6xl">🗺️</div>
                <div className="z-10 bg-white p-2 rounded shadow text-xs">
                    Lat: {data.latitude}<br/>Lon: {data.longitude}
                </div>
            </div>
         </div>
      </div>

      {/* DANOS */}
      <div className="mb-8 page-break-inside-avoid">
        <h2 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-1">Levantamento de Danos</h2>
        <div className="space-y-6">
            {data.levantamentoDanos.length === 0 && <p className="italic text-gray-500">Nenhum dano registrado.</p>}
            {data.levantamentoDanos.map((dano, idx) => (
                <div key={idx} className="mb-4">
                    <p className="mb-2 text-justify">
                        <span className="font-bold uppercase text-red-700 mr-2">[{dano.tipo}]:</span> 
                        {dano.descricao}
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
            <p><span className="font-bold uppercase w-64 inline-block">Classificação do Dano:</span> {data.classificacaoDanos}</p>
            <p><span className="font-bold uppercase w-64 inline-block">Nível de Destruição:</span> {getNivelDestruicao(data.classificacaoDanos)}</p>
            <p><span className="font-bold uppercase w-64 inline-block">Percentual Estimado:</span> {getPercentualDestruicao(data.classificacaoDanos)}</p>
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
      <div className="absolute bottom-8 left-12 right-12 text-center text-[10px] text-gray-500 border-t border-gray-200 pt-2">
        <p>Palácio das Araucárias - 1º andar - Setor C | Centro Cívico | Curitiba/PR | CEP 80.530-140</p>
        <p>E-mail: defesacivil@defesacivil.pr.gov.br | Fone: (41) 3281-2500</p>
        <p className="mt-1 font-bold italic">"Defesa Civil somos todos nós"</p>
      </div>
    </div>
  );
};

export default LaudoPreview;
