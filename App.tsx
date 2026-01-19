import React, { useState, useEffect, useRef } from 'react';
import { MUNICIPIOS_PR, TIPOLOGIAS, ITENS_DANOS, CLASSIFICACOES, ENGENHEIROS_INICIAIS, Engenheiro } from './constants';
import { LaudoData } from './types';
import { getNivelDestruicao, getPercentualDestruicao, fileToBase64 } from './utils';
import EngenheiroModal from './components/EngenheiroModal';
import LaudoPreview from './components/LaudoPreview';
import { LOGO_DEFESA_CIVIL_BASE64 } from './assets';

// @ts-ignore
const html2pdf = window.html2pdf;
// @ts-ignore
const html2canvas = window.html2canvas;
// @ts-ignore
const L = window.L;

const App: React.FC = () => {
  const [engenheiros, setEngenheiros] = useState<Engenheiro[]>(ENGENHEIROS_INICIAIS);
  const [isEngModalOpen, setIsEngModalOpen] = useState(false);
  const [editingEng, setEditingEng] = useState<Engenheiro | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [formData, setFormData] = useState<LaudoData>({
    id: Date.now(),
    municipio: '',
    data: new Date().toISOString().split('T')[0],
    engenheiroId: '',
    zona: 'Urbano', // Default
    indicacaoFiscal: '',
    inscricaoImobiliaria: '',
    matricula: '',
    nirf: '',
    incra: '',
    proprietario: '',
    requerente: '',
    endereco: '',
    latitude: '-25.4290',
    longitude: '-49.2671',
    tipologia: '',
    tipologiaOutro: '',
    levantamentoDanos: [],
    classificacaoDanos: ''
  });

  const [mapType, setMapType] = useState<'satellite' | 'street' | 'hybrid'>('hybrid');

  // Função para buscar endereço a partir de coordenadas (Reverse Geocoding)
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      // Adiciona timestamp para evitar cache
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&t=${Date.now()}`, {
        headers: {
            'Accept-Language': 'pt-BR'
        }
      });
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        
        // Prioridade de campos para logradouro
        const rua = addr.road || addr.street || addr.pedestrian || addr.path || addr.highway || addr.suburb || '';
        
        // Número: Se o mapa não tiver, usa 'S/N' como placeholder padrão de laudo, mas permite edição fácil
        const numero = addr.house_number || 'S/N';
        
        // Bairro: Expande busca para cidades menores (village, town, hamlet)
        const bairro = addr.neighbourhood || addr.suburb || addr.city_district || addr.village || addr.district || '';
        
        const cep = addr.postcode || '';
        const cidade = addr.city || addr.town || addr.municipality || addr.village || '';

        // Monta o endereço de forma estruturada: Rua, Número, Bairro - Cidade, CEP
        const parts = [];
        
        if (rua) parts.push(rua);
        parts.push(numero); // Sempre adiciona o número ou S/N na segunda posição
        if (bairro) parts.push(bairro);
        
        let fullAddress = parts.join(', ');

        // Adiciona cidade se não estiver contida no nome da rua/bairro
        if (cidade && !fullAddress.includes(cidade)) {
            fullAddress += ` - ${cidade}`; 
        }
        
        if (cep) {
            fullAddress += `, CEP: ${cep}`;
        }
        
        setFormData(prev => ({ ...prev, endereco: fullAddress }));
      } else {
        // Fallback se a API não retornar endereço estruturado
        setFormData(prev => ({ ...prev, endereco: `Lat: ${lat}, Lon: ${lng} (Endereço não encontrado, preencha manualmente)` }));
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  };

  // Função para pegar localização do GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // 1. Atualiza formulário com coordenadas
        updateCoords(latitude, longitude);
        
        // 2. Atualiza Mapa (Visual)
        if (mapRef.current && markerRef.current) {
          const newLatLng = new L.LatLng(latitude, longitude);
          // Usa flyTo para uma transição suave até a localização do usuário
          mapRef.current.flyTo(newLatLng, 18, {
             animate: true,
             duration: 1.5
          });
          markerRef.current.setLatLng(newLatLng);
        }
        
        // 3. Busca o endereço correspondente à localização do GPS
        fetchAddressFromCoords(latitude, longitude);
        
        setIsLoadingLocation(false);
      },
      (error) => {
        setIsLoadingLocation(false);
        let msg = "Erro ao obter localização.";
        if (error.code === 1) msg = "Permissão de localização negada. Verifique as configurações do seu navegador.";
        if (error.code === 2) msg = "Localização indisponível (Sinal GPS fraco).";
        if (error.code === 3) msg = "Tempo limite esgotado ao buscar localização.";
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map-container').setView([parseFloat(formData.latitude), parseFloat(formData.longitude)], 16);
      
      // IMPORTANTE: Utilizando provedores que suportam CORS explicitamente (OpenStreetMap e Esri).
      // O Google Maps (mt1.google.com) frequentemente bloqueia o acesso via Canvas (html2canvas) gerando erro de Tainted Canvas.
      const layers = {
        street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          crossOrigin: 'anonymous'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri',
          crossOrigin: 'anonymous'
        }),
        // Usando Esri Satélite como base robusta para o híbrido para garantir o print
        hybrid: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            crossOrigin: 'anonymous'
        })
      };

      // Inicializa com Híbrido (que agora é seguro para print)
      layers[mapType].addTo(mapRef.current);
      
      markerRef.current = L.marker([parseFloat(formData.latitude), parseFloat(formData.longitude)], { draggable: true }).addTo(mapRef.current);

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
        if (!formData.municipio) return;
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

  const handleTogglePreview = async () => {
    if (!showPreview) {
        // Ao abrir o preview, tenta capturar a imagem do mapa atual
        const mapElement = document.getElementById('map-container');
        if (mapElement && (window as any).html2canvas) {
            // Aumentando delay para 1s para garantir renderização dos tiles em mobile
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                // Tira um print do elemento do mapa
                const canvas = await (window as any).html2canvas(mapElement, {
                    useCORS: true, // ESSENCIAL: Permite carregar imagens de outros domínios
                    allowTaint: false, // ESSENCIAL: Deve ser falso para permitir toDataURL
                    proxy: null, // Desabilita proxy para evitar erros de requisição
                    logging: true,
                    scale: 2, // Mantém resolução alta
                    backgroundColor: null,
                    ignoreElements: (element: any) => {
                        // Remove controles de zoom do print
                        return element.classList.contains('leaflet-control-zoom');
                    }
                });
                setMapSnapshot(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error("Erro ao capturar imagem do mapa:", error);
                // Mesmo com erro, permite abrir o preview (sem o mapa)
                setMapSnapshot(null);
            }
        }
    }
    setShowPreview(!showPreview);
  };

  const generatePDF = () => {
    const element = document.getElementById('laudo-pdf-content');
    
    // Sanitiza strings para evitar caracteres inválidos no nome do arquivo
    const safeText = (text: string) => text ? text.replace(/[\/\\:*?"<>|]/g, '').trim() : '';
    
    const municipio = safeText(formData.municipio) || 'Municipio';
    const data = formData.data;
    const proprietario = safeText(formData.proprietario) || 'Proprietario';
    
    const filename = `${municipio}_${data}_${proprietario}.pdf`;

    // Configurações otimizadas para evitar páginas em branco e permitir múltiplas páginas
    const opt = {
      margin: [10, 10, 10, 10], // Margem em mm (Top, Left, Bottom, Right)
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Melhora a qualidade
        useCORS: true, // Permite carregar imagens externas se houver
        letterRendering: true,
        scrollY: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Evita cortes bruscos
    };
    
    // Pequeno delay para garantir que o renderizador pegue o elemento visível
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
    <div className="bg-[#f2f2f2] min-h-screen font-sans">
      
      <div className="sticky top-0 z-30">
        {/* Barra topo */}
        <div className="bg-[#1e1e1e] text-white py-1 px-4 flex justify-between items-center text-xs">
          <span className="font-bold">PR.GOV.BR</span>
          <div className="flex items-center gap-4">
            <span className="font-semibold hidden sm:inline uppercase">Governo do Estado do Paraná</span>
          </div>
        </div>

        {/* Header Principal */}
        <header className="bg-white shadow-md border-b-4 border-[#f38b00]">
          <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                  <img 
                      src={LOGO_DEFESA_CIVIL_BASE64}
                      alt="Defesa Civil Paraná" 
                      className="h-14" 
                  />
                  <div className="hidden md:flex flex-col">
                    <span className="text-[#f38b00] font-black uppercase text-sm leading-tight">
                        Defesa Civil
                    </span>
                    <span className="text-gray-500 font-semibold uppercase text-xs">
                        Coordenadoria Estadual
                    </span>
                  </div>
              </div>
              <div className="text-right">
                 <h1 className="text-lg md:text-xl font-black text-gray-700 uppercase">
                    Laudo Técnico
                 </h1>
                 <p className="text-xs text-gray-400">Sistema de Gestão de Desastres</p>
              </div>
          </div>
        </header>
      </div>

      <main className="max-w-5xl mx-auto py-8 px-4">
        
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 md:p-10 space-y-10">
            
            {/* Seção 1 */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">1</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Informações da Inspeção</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Município do Paraná</label>
                  <input 
                    list="municipios-list"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                    value={formData.municipio}
                    onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                    placeholder="Digite para buscar..."
                  />
                  <datalist id="municipios-list">
                    {MUNICIPIOS_PR.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Data do Levantamento</label>
                  <input
                    type="date"
                    readOnly
                    className="w-full rounded border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm p-3 text-sm font-semibold border-2"
                    value={formData.data}
                  />
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border-2 border-dashed border-orange-200">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3 gap-2">
                  <label className="block text-xs font-bold text-[#f38b00] uppercase">Engenheiro Responsável</label>
                  <button 
                    onClick={() => { setEditingEng(null); setIsEngModalOpen(true); }}
                    className="text-[10px] bg-[#f38b00] text-white px-3 py-2 rounded-full hover:bg-orange-600 transition uppercase font-bold self-start sm:self-auto"
                  >
                    + Novo Engenheiro
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="flex-1 rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-bold border-2 focus:border-[#f38b00] focus:ring-[#f38b00]"
                    value={formData.engenheiroId}
                    onChange={e => setFormData({ ...formData, engenheiroId: e.target.value })}
                  >
                    <option value="" disabled>Selecionar...</option>
                    {engenheiros.map(eng => (
                      <option key={eng.id} value={eng.id}>
                        {eng.nome} - CREA {eng.creaEstado} {eng.creaNumero}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => { if(currentEngenheiro) { setEditingEng(currentEngenheiro); setIsEngModalOpen(true); } }}
                    disabled={!currentEngenheiro}
                    className="px-4 py-3 sm:py-2 bg-white text-gray-700 rounded text-xs font-bold hover:bg-gray-50 border-2 border-gray-300 disabled:opacity-50"
                  >
                    EDITAR
                  </button>
                </div>
              </div>
            </section>

            {/* Seção 2 */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">2</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Identificação do Imóvel</h2>
              </div>
              
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Zona do Imóvel</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setFormData({...formData, zona: 'Urbano'})}
                        className={`group flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.zona === 'Urbano'
                            ? 'border-[#f38b00] bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.zona === 'Urbano' ? 'text-[#f38b00]' : 'text-gray-400 group-hover:text-orange-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className={`text-sm font-black uppercase tracking-wider ${formData.zona === 'Urbano' ? 'text-gray-900' : 'text-gray-500'}`}>Urbano</span>
                    </button>

                    <button
                        onClick={() => setFormData({...formData, zona: 'Rural'})}
                        className={`group flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.zona === 'Rural'
                            ? 'border-[#f38b00] bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.zona === 'Rural' ? 'text-[#f38b00]' : 'text-gray-400 group-hover:text-orange-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`text-sm font-black uppercase tracking-wider ${formData.zona === 'Rural' ? 'text-gray-900' : 'text-gray-500'}`}>Rural</span>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {formData.zona === 'Urbano' ? (
                    <>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">Indicação Fiscal</label>
                          <input
                            type="text"
                            placeholder="Ex: 00.00.000.0000.000"
                            className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                            value={formData.indicacaoFiscal}
                            onChange={e => setFormData({ ...formData, indicacaoFiscal: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">Inscrição Imobiliária</label>
                          <input
                            type="text"
                            className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                            value={formData.inscricaoImobiliaria}
                            onChange={e => setFormData({ ...formData, inscricaoImobiliaria: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">Matrícula</label>
                          <input
                            type="text"
                            className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                            value={formData.matricula}
                            onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                          />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">NIRF (Receita Federal)</label>
                          <input
                            type="text"
                            placeholder="Número do Imóvel na Receita Federal"
                            className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                            value={formData.nirf}
                            onChange={e => setFormData({ ...formData, nirf: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">INCRA (CCIR)</label>
                          <input
                            type="text"
                            placeholder="Código do Imóvel Rural"
                            className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                            value={formData.incra}
                            onChange={e => setFormData({ ...formData, incra: e.target.value })}
                          />
                        </div>
                    </>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Proprietário</label>
                  <input
                    type="text"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                    value={formData.proprietario}
                    onChange={e => setFormData({ ...formData, proprietario: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Requerente</label>
                  <input
                    type="text"
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                    value={formData.requerente}
                    onChange={e => setFormData({ ...formData, requerente: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Tipologia da Edificação</label>
                  <select
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2"
                    value={formData.tipologia}
                    onChange={e => setFormData({ ...formData, tipologia: e.target.value })}
                  >
                    <option value="" disabled>Selecionar...</option>
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
                <div className="flex justify-between items-end flex-wrap gap-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Localização (Mapa)</label>
                    <div className="flex gap-2 items-center">
                        <button
                          onClick={handleGetLocation}
                          disabled={isLoadingLocation}
                          className="flex items-center gap-1 bg-[#f38b00] text-white px-3 py-1 rounded shadow text-xs font-bold hover:bg-orange-600 transition disabled:opacity-50"
                        >
                          {isLoadingLocation ? 'Buscando...' : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Minha Localização
                            </>
                          )}
                        </button>
                        <select 
                            className="rounded border-gray-300 bg-white text-gray-900 p-1 text-xs font-bold border shadow-sm cursor-pointer"
                            value={mapType}
                            onChange={e => setMapType(e.target.value as any)}
                        >
                            <option value="hybrid">Híbrido</option>
                            <option value="satellite">Satélite</option>
                            <option value="street">Mapa</option>
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="md:col-span-3">
                     <input
                      type="text"
                      placeholder="Endereço Completo (Preenchimento Automático pelo Mapa ou GPS)"
                      className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2 bg-gray-50"
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
                </div>
                
                <div id="map-container" className="w-full h-80 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 shadow-inner z-10 relative"></div>
                <p className="text-[10px] text-gray-400 italic">Arraste o marcador ou use o GPS para ajustar a localização exata.</p>
              </div>
            </section>

            {/* Seção 3 */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">3</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Levantamento de Danos</h2>
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
                          ? 'bg-[#f38b00] text-white border-[#f38b00] shadow-md transform scale-105' 
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#f38b00] hover:text-[#f38b00]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6 mt-6">
                {formData.levantamentoDanos.map((dano, idx) => (
                  <div key={idx} className="bg-gray-50 p-5 rounded-lg border-l-4 border-[#f38b00] shadow-sm space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-gray-800 uppercase text-sm tracking-wider">{dano.tipo}</h3>
                      <button 
                        onClick={() => handleDanoToggle(dano.tipo)}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        Remover
                      </button>
                    </div>
                    <textarea
                      placeholder={`Descreva os danos observados em ${dano.tipo}...`}
                      className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 h-24 text-sm border focus:ring-[#f38b00] focus:border-[#f38b00]"
                      value={dano.descricao}
                      onChange={e => handleDanoDescChange(dano.tipo, e.target.value)}
                    />
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Fotos</label>
                       <div className="flex flex-wrap gap-3">
                          {dano.fotos.map((foto, fIdx) => (
                            <div key={fIdx} className="relative group w-24 h-24">
                              <img src={foto} className="w-full h-full object-cover rounded border border-gray-200 shadow-sm" />
                              <button 
                                onClick={() => removeFoto(dano.tipo, fIdx)}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition"
                              >✕</button>
                            </div>
                          ))}
                          <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 hover:border-[#f38b00] transition group">
                            <span className="text-2xl text-gray-300 group-hover:text-[#f38b00]">+</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Adicionar</span>
                            <input type="file" multiple className="hidden" accept="image/*" onChange={e => handleFotoUpload(dano.tipo, e)} />
                          </label>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Seção 4 */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">4</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Classificação Final</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Parecer de Danos</label>                  
                  <select
                    className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-4 text-sm font-black border-2 focus:ring-[#f38b00] focus:border-[#f38b00]"
                    value={formData.classificacaoDanos}
                    onChange={e => setFormData({ ...formData, classificacaoDanos: e.target.value })}
                  >
                    <option value="" disabled>Selecionar...</option>
                    {CLASSIFICACOES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="bg-gray-800 p-5 rounded-lg text-white flex flex-col justify-center shadow-lg border-l-8 border-[#f38b00]">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Estimativa do Sistema</p>
                  <p className="text-xl font-black uppercase text-white">{getNivelDestruicao(formData.classificacaoDanos) || '---'}</p>
                  <p className="text-xs text-[#f38b00] mt-2 font-bold italic">Dano Estimado: {getPercentualDestruicao(formData.classificacaoDanos)}</p>
                </div>
              </div>
            </section>

            {/* Ações */}
            <div className="pt-8 flex flex-col md:flex-row gap-4 border-t border-gray-200 mt-8">
              <button 
                onClick={handleTogglePreview}
                className="flex-1 bg-white text-gray-700 border-2 border-gray-300 font-black py-4 rounded uppercase text-sm tracking-widest hover:bg-gray-50 transition shadow-sm"
              >
                {showPreview ? 'Ocultar Prévia' : 'Visualizar Relatório'}
              </button>
              {showPreview && (
                <button 
                  onClick={generatePDF}
                  className="flex-1 bg-[#f38b00] text-white font-black py-4 rounded uppercase text-sm tracking-widest hover:bg-orange-600 transition shadow-lg border-b-4 border-orange-700 active:border-b-0 active:translate-y-1"
                >
                  Baixar Laudo PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showPreview && (
        <div className="max-w-5xl mx-auto mb-20 px-4">
          <div className="bg-gray-300 p-4 md:p-8 rounded-lg overflow-x-auto shadow-inner border border-gray-400">
             <div className="inline-block min-w-[21cm] mx-auto bg-white shadow-2xl">
                <LaudoPreview data={formData} engenheiro={currentEngenheiro} mapSnapshot={mapSnapshot} />
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

      <footer className="bg-[#1e1e1e] text-white py-8 border-t-4 border-[#f38b00]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="font-black uppercase text-sm">Governo do Estado do Paraná</p>
            <p className="text-xs text-gray-400">Defesa Civil - Coordenadoria Estadual</p>
          </div>
          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Sistema de Laudos
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;