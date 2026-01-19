
import React from 'react';
import { LaudoData } from '../types';
import { Engenheiro } from '../constants';
import { getNivelDestruicao, getPercentualDestruicao } from '../utils';

interface Props {
  data: LaudoData;
  engenheiro: Engenheiro | undefined;
}

const LaudoPreview: React.FC<Props> = ({ data, engenheiro }) => {
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&zoom=18&size=800x400&maptype=satellite&markers=color:blue%7Clabel:S%7C${data.latitude},${data.longitude}`;

  return (
    <div id="laudo-pdf-content" className="bg-white p-8 font-serif text-sm max-w-[21cm] mx-auto text-gray-900 border border-gray-200">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-blue-800 pb-4">
        <div className="flex gap-4 items-center">
            <img src="https://www.governodigital.pr.gov.br/sites/governo-digital/files/styles/extra_large/public/imagem/2021-03/logo_governo_pr.png?itok=39S9I5xL" alt="Governo PR" className="h-16" />
            <div className="text-center font-bold">
                <p>ESTADO DO PARANÁ</p>
                <p>COORDENADORIA ESTADUAL DA DEFESA CIVIL</p>
                <p>FUNDO ESTADUAL PARA CALAMIDADES PÚBLICAS</p>
            </div>
        </div>
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Símbolo_Internacional_da_Proteção_Civil.svg/1200px-Símbolo_Internacional_da_Proteção_Civil.svg.png" alt="Defesa Civil" className="h-16" />
      </div>

      <h1 className="text-center text-xl font-bold mb-8 uppercase tracking-widest">Laudo de Imóvel Afetado por Evento Climático</h1>

      <div className="space-y-4 mb-8">
        <p><span className="font-bold">MUNICÍPIO:</span> <span className="bg-yellow-200 px-1">{data.municipio}</span></p>
        <p><span className="font-bold">DATA:</span> <span className="bg-yellow-200 px-1">{new Date(data.data).toLocaleDateString('pt-BR')}</span></p>
      </div>

      <div className="border-t border-gray-300 pt-4">
        <h2 className="font-bold text-center mb-4 uppercase">Informações do Imóvel</h2>
        <div className="grid grid-cols-1 gap-3">
            <p><span className="font-bold">INSCRIÇÃO MUNICIPAL:</span> <span className="bg-yellow-200 px-1">{data.inscricaoMunicipal}</span></p>
            <p><span className="font-bold">PROPRIETÁRIO:</span> <span className="bg-yellow-200 px-1">{data.proprietario}</span></p>
            <p><span className="font-bold">REQUERENTE:</span> <span className="bg-yellow-200 px-1">{data.requerente}</span></p>
            <p><span className="font-bold">ENDEREÇO:</span> <span className="bg-yellow-200 px-1">{data.endereco}</span></p>
            <p><span className="font-bold">COORDENADAS:</span> <span className="bg-yellow-200 px-1">{data.latitude}, {data.longitude}</span></p>
            
            <div className="my-4 flex justify-center border p-2 bg-gray-50">
              <img src={mapUrl} alt="Mapa Satélite" className="max-w-full h-auto rounded shadow-sm" />
            </div>

            <p><span className="font-bold">TIPOLOGIA:</span> <span className="bg-yellow-200 px-1">{data.tipologia === 'Outro' ? data.tipologiaOutro : data.tipologia}</span></p>
        </div>
      </div>

      <div className="page-break-before mt-12 pt-8 border-t-2 border-gray-100">
        <h2 className="font-bold text-center mb-6 uppercase">Levantamento de Danos</h2>
        <div className="space-y-8">
          {data.levantamentoDanos.map((dano, index) => (
            <div key={index} className="space-y-4">
              <p className="text-justify">
                <span className="font-bold uppercase">{dano.tipo}:</span> <span className="bg-yellow-200 px-1 leading-relaxed">{dano.descricao}</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                {dano.fotos.map((foto, fIdx) => (
                  <img key={fIdx} src={foto} alt={`Foto dano ${dano.tipo}`} className="w-full h-48 object-cover rounded border shadow-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 border-t pt-6">
        <h2 className="font-bold text-center mb-4 uppercase">Ações do Evento Climático</h2>
        <div className="space-y-3">
          <p><span className="font-bold uppercase">Classificação:</span> <span className="bg-yellow-200 px-1">{data.classificacaoDanos}</span></p>
          <p><span className="font-bold uppercase">Nível de Destruição:</span> <span className="bg-yellow-200 px-1">{getNivelDestruicao(data.classificacaoDanos)}</span></p>
          <p><span className="font-bold uppercase">Percentual Considerado de Destruição:</span> <span className="bg-yellow-200 px-1">{getPercentualDestruicao(data.classificacaoDanos)}</span></p>
        </div>
      </div>

      <div className="mt-20 text-center flex flex-col items-center">
        <div className="w-64 border-t border-black mb-1"></div>
        <p className="font-bold uppercase text-lg">{engenheiro?.nome || '---'}</p>
        <p>Engenheiro Civil</p>
        <p>CREA <span className="bg-yellow-200 px-1">{engenheiro?.creaEstado} {engenheiro?.creaNumero}</span></p>
      </div>

      <footer className="mt-12 pt-4 border-t border-gray-200 text-[10px] text-center text-gray-500">
        <p>Palácio das Araucárias - 1º andar - Setor C | Centro Cívico | Curitiba/PR | CEP 80.530-140</p>
        <p>E-mail: defesacivil@defesacivil.pr.gov.br | Fone: (41) 3281-2500</p>
        <p className="mt-2 font-bold italic text-gray-700">"Defesa Civil somos todos nós"</p>
      </footer>
    </div>
  );
};

export default LaudoPreview;
