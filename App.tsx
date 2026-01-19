
import React, { useState, useEffect, useRef } from 'react';
import { MUNICIPIOS_PR, TIPOLOGIAS, ITENS_DANOS, CLASSIFICACOES, ENGENHEIROS_INICIAIS, Engenheiro } from './constants';
import { LaudoData, DanoInfo } from './types';
import { getNivelDestruicao, getPercentualDestruicao, fileToBase64 } from './utils';
import EngenheiroModal from './components/EngenheiroModal';
import LaudoPreview from './components/LaudoPreview';

// @ts-ignore
const html2pdf = window.html2pdf;
// @ts-ignore
const L = window.L;

const App: React.FC = () => {
  const [engenheiros, setEngenheiros] = useState<Engenheiro[]>(ENGENHEIROS_INICIAIS);
  const [isEngModalOpen, setIsEngModalOpen] = useState(false);
  const [editingEng, setEditingEng] = useState<Engenheiro | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [formData, setFormData] = useState<LaudoData>({
    id: Date.now(),
    municipio: 'Curitiba',
    data: new Date().toISOString().split('T')[0],
    engenheiroId: '1',
    inscricaoMunicipal: '',
    proprietario: '',
    requerente: '',
    endereco: '',
    latitude: '-25.4290',
    longitude: '-49.2671',
    tipologia: 'Casa de Alvenaria',
    tipologiaOutro: '',
    levantamentoDanos: [],
    classificacaoDanos: 'Danos Mínimos'
  });

  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');

  // Função para buscar endereço a partir de coordenadas (Reverse Geocoding)
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const rua = addr.road || addr.pedestrian || addr.suburb || '';
        const numero = addr.house_number || 'S/N';
        const bairro = addr.neighbourhood || addr.suburb || addr.city_district || '';
        const cep = addr.postcode || '';
        
        const fullAddress = `${rua}, ${numero}, ${bairro}, CEP: ${cep}`.replace(/^[,\s]+|[,\s]+$/g, '');
        setFormData(prev => ({ ...prev, endereco: fullAddress }));
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  };

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map-container').setView([formData.latitude, formData.longitude], 16);
      
      const layers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri &copy; Source: Esri, i-cubed, USDA, USGS'
        })
      };

      layers[mapType].addTo(mapRef.current);
      markerRef.current = L.marker([formData.latitude, formData.longitude], { draggable: true }).addTo(mapRef.current);

      markerRef.current.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        updateCoords(lat, lng);
        fetchAddressFromCoords(lat, lng);
      });

      mapRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        markerRef.current.setLatLng([lat, lng]);
        updateCoords(lat, lng);
        fetchAddressFromCoords(lat, lng);
      });

      (mapRef.current as any)._layers_cache = layers;
    }
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      const layers = (mapRef.current as any)._layers_cache;
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) mapRef.current.removeLayer(layer);
      });
      layers[mapType].addTo(mapRef.current);
    }
  }, [mapType]);

  useEffect(() => {
    const fetchCityCoords = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.municipio + ', PR, Brasil')}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          mapRef.current.setView([lat, lon], 14);
          markerRef.current.setLatLng([lat, lon]);
          updateCoords(parseFloat(lat), parseFloat(lon));
        }
      } catch (error) {}
    };
    if (mapRef.current) fetchCityCoords();
  }, [formData.municipio]);

  const updateCoords = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  const handleDanoToggle = (dano: string) => {
    setFormData(prev => {
      const exists = prev.levantamentoDanos.find(d => d.tipo === dano);
      if (exists) {
        return { ...prev, levantamentoDanos: prev.levantamentoDanos.filter(d => d.tipo !== dano) };
      } else {
        return { ...prev, levantamentoDanos: [...prev.levantamentoDanos, { tipo: dano, descricao: '', fotos: [] }] };
      }
    });
  };

  const handleDanoDescChange = (tipo: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      levantamentoDanos: prev.levantamentoDanos.map(d => d.tipo === tipo ? { ...d, descricao: val } : d)
    }));
  };

  const handleFotoUpload = async (tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const base64s = await Promise.all(files.map(f => fileToBase64(f)));
      setFormData(prev => ({
        ...prev,
        levantamentoDanos: prev.levantamentoDanos.map(d => d.tipo === tipo ? { ...d, fotos: [...d.fotos, ...base64s] } : d)
      }));
    }
  };

  const removeFoto = (tipo: string, fotoIndex: number) => {
    setFormData(prev => ({
      ...prev,
      levantamentoDanos: prev.levantamentoDanos.map(d => 
        d.tipo === tipo 
          ? { ...d, fotos: d.fotos.filter((_, idx) => idx !== fotoIndex) } 
          : d
      )
    }));
  };

  const generatePDF = () => {
    const element = document.getElementById('laudo-pdf-content');
    const opt = {
      margin: 10,
      filename: `laudo-defesacivil-${formData.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleSaveEngenheiro = (eng: Engenheiro) => {
    setEngenheiros(prev => {
      const idx = prev.findIndex(e => e.id === eng.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = eng;
        return copy;
      }
      return [...prev, eng];
    });
    setFormData(prev => ({ ...prev, engenheiroId: eng.id }));
    setIsEngModalOpen(false);
    setEditingEng(null);
  };

  const currentEngenheiro = engenheiros.find(e => e.id === formData.engenheiroId);

  return (
    <div className="bg-[#f2f2f2] min-h-screen">
      <div className="bg-[#1e2b58] text-white py-2 px-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>PR.GOV.BR</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Governo do Paraná</span>
          <div className="flex gap-2">
            <span className="w-4 h-4 rounded-full bg-white/20"></span>
            <span className="w-4 h-4 rounded-full bg-white/20"></span>
          </div>
        </div>
      </div>

      <header className="bg-white shadow-md border-b-4 border-[#f38b00]">
        <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row items-center gap-6">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Símbolo_Internacional_da_Proteção_Civil.svg/1200px-Símbolo_Internacional_da_Proteção_Civil.svg.png" 
               alt="Defesa Civil PR" className="h-20" />
          <div className="text-center md:text-left flex-1 border-l-0 md:border-l-2 md:pl-6 border-gray-200">
            <h1 className="text-xl md:text-2xl font-black text-[#1e2b58] uppercase">Coordenadoria Estadual da Defesa Civil</h1>
            <p className="text-[#f38b00] font-bold text-sm md:text-base">Sistema de Composição de Laudos Técnicos</p>
          </div>
          <div className="hidden lg:block">
            <img src="https://www.governodigital.pr.gov.br/sites/governo-digital/files/styles/extra_large/public/imagem/2021-03/logo_governo_pr.png?itok=39S9I5xL" 
                 alt="Governo PR" className="h-16" />
          </div>
        </div>
      </header>

      <div className="bg-[#f38b00] py-2 shadow-inner">
        <div className="max-w-6xl mx-auto px-4 flex gap-4 overflow-x-auto no-scrollbar">
          <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold uppercase cursor-default whitespace-nowrap">Novo Laudo</span>
          <span className="text-white/80 px-3 py-1 rounded-full text-xs font-bold uppercase hover:bg-white/10 cursor-pointer whitespace-nowrap">Consultar</span>
          <span className="text-white/80 px-3 py-1 rounded-full text-xs font-bold uppercase hover:bg-white/10 cursor-pointer whitespace-nowrap">Estatísticas</span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 md:p-10 space-y-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-[#1e2b58] text-white px-3 py-1 rounded text-sm font-bold">01</span>
                <h2 className="text-lg font-black text-[#1e2b58] uppercase">Informações da Inspeção</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Município do Paraná</label>
                  <select
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#1e2b58] focus:border-[#1e2b58] p-3 text-sm font-semibold border-2"
                    value={formData.municipio}
                    onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                  >
                    {MUNICIPIOS_PR.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Data do Levantamento</label>
                  <input
                    type="date"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#1e2b58] focus:border-[#1e2b58] p-3 text-sm font-semibold border-2"
                    value={formData.data}
                    onChange={e => setFormData({ ...formData, data: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-[#f8f9fa] p-4 rounded-lg border-2 border-dashed border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-[#1e2b58] uppercase">Engenheiro Responsável</label>
                  <button 
                    onClick={() => { setEditingEng(null); setIsEngModalOpen(true); }}
                    className="text-[10px] bg-[#1e2b58] text-white px-2 py-1 rounded hover:bg-[#2a3c7a] transition"
                  >
                    + CADASTRAR NOVO
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-bold border-2"
                    value={formData.engenheiroId}
                    onChange={e => setFormData({ ...formData, engenheiroId: e.target.value })}
                  >
                    {engenheiros.map(eng => (
                      <option key={eng.id} value={eng.id}>
                        {eng.nome} - CREA {eng.creaEstado} {eng.creaNumero}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => { setEditingEng(currentEngenheiro!); setIsEngModalOpen(true); }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 border border-gray-300"
                  >
                    EDITAR
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-[#1e2b58] text-white px-3 py-1 rounded text-sm font-bold">02</span>
                <h2 className="text-lg font-black text-[#1e2b58] uppercase">Identificação do Imóvel</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Inscrição Municipal</label>
                  <input
                    type="text"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#1e2b58] p-3 text-sm font-semibold border-2"
                    value={formData.inscricaoMunicipal}
                    onChange={e => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Proprietário</label>
                  <input
                    type="text"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#1e2b58] p-3 text-sm font-semibold border-2"
                    value={formData.proprietario}
                    onChange={e => setFormData({ ...formData, proprietario: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Requerente</label>
                  <input
                    type="text"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#1e2b58] p-3 text-sm font-semibold border-2"
                    value={formData.requerente}
                    onChange={e => setFormData({ ...formData, requerente: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Tipologia da Edificação</label>
                  <select
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2"
                    value={formData.tipologia}
                    onChange={e => setFormData({ ...formData, tipologia: e.target.value })}
                  >
                    {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {formData.tipologia === 'Outro' && (
                    <input
                      type="text"
                      placeholder="Descreva a tipologia..."
                      className="mt-2 w-full rounded border-gray-300 bg-white shadow-sm p-3 text-sm border-2 italic"
                      value={formData.tipologiaOutro}
                      onChange={e => setFormData({ ...formData, tipologiaOutro: e.target.value })}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase">Localização no Mapa (Clique para obter Endereço)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="md:col-span-3">
                     <input
                      type="text"
                      placeholder="Rua, Número, Bairro, CEP"
                      className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2"
                      value={formData.endereco}
                      onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                    />
                   </div>
                   <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Latitude</label>
                      <input type="text" readOnly className="w-full rounded bg-gray-100 border-gray-300 p-2 text-sm text-gray-700 font-mono border" value={formData.latitude} />
                   </div>
                   <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400">Longitude</label>
                      <input type="text" readOnly className="w-full rounded bg-gray-100 border-gray-300 p-2 text-sm text-gray-700 font-mono border" value={formData.longitude} />
                   </div>
                   <div className="flex items-end">
                      <select 
                        className="w-full rounded border-gray-300 bg-[#f38b00] text-white p-2 text-xs font-black uppercase shadow-sm cursor-pointer"
                        value={mapType}
                        onChange={e => setMapType(e.target.value as any)}
                      >
                        <option value="satellite">Satélite</option>
                        <option value="street">Mapa</option>
                      </select>
                   </div>
                </div>
                
                <div id="map-container" className="w-full h-80 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner z-10"></div>
                <p className="text-[10px] text-gray-400 italic">Ao posicionar o marcador, o endereço será preenchido automaticamente.</p>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-[#1e2b58] text-white px-3 py-1 rounded text-sm font-bold">03</span>
                <h2 className="text-lg font-black text-[#1e2b58] uppercase">Levantamento de Danos</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {ITENS_DANOS.map(item => {
                  const isActive = formData.levantamentoDanos.some(d => d.tipo === item);
                  return (
                    <button
                      key={item}
                      onClick={() => handleDanoToggle(item)}
                      className={`p-2 text-[10px] font-bold uppercase rounded border-2 transition text-center ${
                        isActive 
                          ? 'bg-[#1e2b58] text-white border-[#1e2b58] shadow-lg scale-105' 
                          : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6 mt-6">
                {formData.levantamentoDanos.map((dano, idx) => (
                  <div key={idx} className="bg-[#f8f9fa] p-5 rounded-lg border-l-4 border-[#1e2b58] shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-[#1e2b58] uppercase text-xs tracking-wider">{dano.tipo}</h3>
                      <button 
                        onClick={() => handleDanoToggle(dano.tipo)}
                        className="text-red-600 hover:text-red-800 text-[10px] font-bold uppercase underline"
                      >
                        Remover Elemento
                      </button>
                    </div>
                    <textarea
                      placeholder={`Detalhes técnicos sobre os danos em ${dano.tipo}...`}
                      className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 h-24 text-sm border-2 font-medium"
                      value={dano.descricao}
                      onChange={e => handleDanoDescChange(dano.tipo, e.target.value)}
                    />
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Registros Fotográficos</label>
                       <div className="flex flex-wrap gap-3">
                          {dano.fotos.map((foto, fIdx) => (
                            <div key={fIdx} className="relative group">
                              <img src={foto} className="w-24 h-24 object-cover rounded border-2 border-white shadow-md" />
                              <button 
                                onClick={() => removeFoto(dano.tipo, fIdx)}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-lg border-2 border-white"
                              >✕</button>
                            </div>
                          ))}
                          <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 hover:border-[#1e2b58] transition">
                            <span className="text-2xl text-gray-300 font-light">+</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Anexar</span>
                            <input type="file" multiple className="hidden" accept="image/*" onChange={e => handleFotoUpload(dano.tipo, e)} />
                          </label>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-[#1e2b58] text-white px-3 py-1 rounded text-sm font-bold">04</span>
                <h2 className="text-lg font-black text-[#1e2b58] uppercase">Classificação Final</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Parecer de Danos</label>
                  <select
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-4 text-sm font-black border-2"
                    value={formData.classificacaoDanos}
                    onChange={e => setFormData({ ...formData, classificacaoDanos: e.target.value })}
                  >
                    {CLASSIFICACOES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="bg-[#1e2b58] p-5 rounded-lg text-white flex flex-col justify-center shadow-lg">
                  <p className="text-[10px] text-white/60 font-black uppercase mb-1 tracking-widest">Nível de Destruição Estimado</p>
                  <p className="text-xl font-black uppercase text-[#f38b00]">{getNivelDestruicao(formData.classificacaoDanos)}</p>
                  <p className="text-xs text-white/80 mt-2 font-bold italic">Percentual: {getPercentualDestruicao(formData.classificacaoDanos)}</p>
                </div>
              </div>
            </section>

            <div className="pt-8 flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1 bg-white text-[#1e2b58] border-2 border-[#1e2b58] font-black py-4 rounded uppercase text-sm tracking-widest hover:bg-gray-50 transition shadow-md"
              >
                {showPreview ? 'Ocultar Prévia' : 'Visualizar Relatório'}
              </button>
              {showPreview && (
                <button 
                  onClick={generatePDF}
                  className="flex-1 bg-[#f38b00] text-white font-black py-4 rounded uppercase text-sm tracking-widest hover:bg-[#e07f00] transition shadow-md border-b-4 border-[#c06a00]"
                >
                  Gerar Laudo PDF Oficial
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showPreview && (
        <div className="max-w-5xl mx-auto mb-20">
          <div className="bg-gray-800 p-8 rounded-lg overflow-x-auto shadow-2xl border-4 border-gray-700">
             <div className="inline-block min-w-full">
                <LaudoPreview data={formData} engenheiro={currentEngenheiro} />
             </div>
          </div>
        </div>
      )}

      <EngenheiroModal 
        isOpen={isEngModalOpen} 
        onClose={() => setIsEngModalOpen(false)} 
        onSave={handleSaveEngenheiro} 
        initialData={editingEng}
      />

      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-[#1e2b58] font-black uppercase text-sm">Governo do Estado do Paraná</p>
            <p className="text-gray-400 text-xs font-bold">Secretaria de Estado da Segurança Pública</p>
          </div>
          <div className="flex gap-4 grayscale opacity-50">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Símbolo_Internacional_da_Proteção_Civil.svg/1200px-Símbolo_Internacional_da_Proteção_Civil.svg.png" className="h-10" />
            <img src="https://www.governodigital.pr.gov.br/sites/governo-digital/files/styles/extra_large/public/imagem/2021-03/logo_governo_pr.png?itok=39S9I5xL" className="h-10" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
