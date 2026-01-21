import React, { useState, useEffect, useRef } from 'react';
import { MUNICIPIOS_PR, TIPOLOGIAS, ITENS_DANOS, CLASSIFICACOES, ENGENHEIROS_INICIAIS, Engenheiro } from './constants';
import { LaudoData } from './types';
import { getNivelDestruicao, getPercentualDestruicao, fileToBase64, maskCPF, validateCPF, maskINCRA, validateINCRA, maskMatricula, validateMatricula } from './utils';
import EngenheiroModal from './components/EngenheiroModal';
import LaudoPreview from './components/LaudoPreview';
import { LOGO_DEFESA_CIVIL_BASE64, PIN_MARKER_BASE64, LOGO_PARANA_BASE64 } from './assets';

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
  
  // Estados de Erro de Validação
  const [cpfError, setCpfError] = useState(false);
  const [incraError, setIncraError] = useState(false);
  const [matriculaError, setMatriculaError] = useState(false);
  
  // States para o Mapa
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(18); // Zoom inicial padrão
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  // Mantém referência à camada atual para remoção correta
  const currentLayerRef = useRef<any>(null);
  
  const [formData, setFormData] = useState<LaudoData>({
    id: Date.now(),
    municipio: '',
    data: new Date().toISOString().split('T')[0],
    engenheiroId: '',
    zona: 'Urbano', // Default
    indicacaoFiscal: '',
    inscricaoMunicipal: '',
    matricula: '',
    nirf: '',
    incra: '',
    proprietario: '',
    requerente: '',
    cpfRequerente: '',
    endereco: '',
    // Coordenadas iniciam vazias
    latitude: '',
    longitude: '',
    tipologia: '',
    tipologiaOutro: '',
    levantamentoDanos: [],
    classificacaoDanos: ''
  });

  const [mapType, setMapType] = useState<'satellite' | 'street' | 'hybrid'>('hybrid');

  // Função para buscar endereço a partir de coordenadas (Reverse Geocoding)
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&t=${Date.now()}`, {
        headers: {
            'Accept-Language': 'pt-BR'
        }
      });
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        const rua = addr.road || addr.street || addr.pedestrian || addr.path || addr.highway || addr.suburb || '';
        const numero = addr.house_number || 'S/N';
        const bairro = addr.neighbourhood || addr.suburb || addr.city_district || addr.village || addr.district || '';
        const cep = addr.postcode || '';
        const cidade = addr.city || addr.town || addr.municipality || addr.village || '';

        const parts = [];
        if (rua) parts.push(rua);
        parts.push(numero); 
        if (bairro) parts.push(bairro);
        
        let fullAddress = parts.join(', ');

        if (cidade && !fullAddress.includes(cidade)) {
            fullAddress += ` - ${cidade}`; 
        }
        
        if (cep) {
            fullAddress += `, CEP: ${cep}`;
        }
        
        setFormData(prev => ({ ...prev, endereco: fullAddress }));
      } else {
        setFormData(prev => ({ ...prev, endereco: `Lat: ${lat}, Lon: ${lng} (Endereço não encontrado, preencha manualmente)` }));
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  };

  const updateCoords = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  // Helper para posicionar ou criar o marcador
  const setMarkerPosition = (lat: number, lng: number) => {
      if (!mapRef.current) return;

      if (!markerRef.current) {
          // Cria o marcador se não existir
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
          
          // Adiciona listener de arraste
          markerRef.current.on('dragend', (e: any) => {
              const { lat: dLat, lng: dLng } = e.target.getLatLng();
              updateCoords(dLat, dLng);
              // Não chamamos fetchAddress aqui para não sobrescrever caso o usuário esteja editando, 
              // mas para UX consistente com o clique, chamamos.
              fetchAddressFromCoords(dLat, dLng);
          });
      } else {
          // Apenas move se já existir
          markerRef.current.setLatLng([lat, lng]);
      }
  };

  // Handler para edição manual das coordenadas
  const handleManualCoordChange = (field: 'latitude' | 'longitude', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler para quando o usuário termina de digitar a coordenada (onBlur)
  const handleManualCoordBlur = () => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
        if (mapRef.current) {
            setMarkerPosition(lat, lng);
            // Mantém o zoom atual, apenas centraliza
            mapRef.current.setView([lat, lng], currentZoom);
            fetchAddressFromCoords(lat, lng);
        }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (mapRef.current) {
             mapRef.current.flyTo([latitude, longitude], 18, { animate: true, duration: 1.5 });
             // Atualiza o zoom state para 18 pois o flyTo vai para 18
             setCurrentZoom(18);
             setMarkerPosition(latitude, longitude);
        }

        updateCoords(latitude, longitude);
        fetchAddressFromCoords(latitude, longitude);
        setIsLoadingLocation(false);
      },
      (error) => {
        setIsLoadingLocation(false);
        let msg = "Erro ao obter localização.";
        if (error.code === 1) msg = "Permissão de localização negada.";
        if (error.code === 2) msg = "Localização indisponível.";
        if (error.code === 3) msg = "Tempo limite esgotado.";
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Helper para converter Blob em URL temporária
  const blobToUrl = (blob: Blob) => URL.createObjectURL(blob);

  // Helper para fundir duas imagens em um Canvas e retornar o Blob resultante
  const mergeImages = async (baseBlob: Blob, overlayBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img1 = new Image();
        const img2 = new Image();
        
        img1.onload = () => {
            canvas.width = img1.width;
            canvas.height = img1.height;
            if (ctx) ctx.drawImage(img1, 0, 0);
            
            img2.onload = () => {
                if (ctx) ctx.drawImage(img2, 0, 0);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas conversion failed"));
                }, 'image/png');
            };
            img2.crossOrigin = "Anonymous";
            img2.src = blobToUrl(overlayBlob);
        };
        img1.crossOrigin = "Anonymous";
        img1.src = blobToUrl(baseBlob);
    });
  };

  // Helper para adicionar o PIN (marcador) ao centro da imagem
  const addPinToImage = async (mapBlob: Blob): Promise<string> => {
      return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const mapImg = new Image();
          const pinImg = new Image();

          mapImg.onload = () => {
              canvas.width = mapImg.width;
              canvas.height = mapImg.height;
              if (ctx) {
                  // Desenha o mapa
                  ctx.drawImage(mapImg, 0, 0);
                  
                  pinImg.onload = () => {
                      // Configuração do Pin
                      const pinWidth = 50; 
                      const pinHeight = 50;
                      // Centraliza horizontalmente e posiciona a ponta (base) no centro vertical
                      const x = (canvas.width / 2) - (pinWidth / 2);
                      const y = (canvas.height / 2) - (pinHeight); 
                      
                      // Sombra simples para destaque
                      ctx.shadowColor = "rgba(0,0,0,0.5)";
                      ctx.shadowBlur = 5;
                      ctx.shadowOffsetX = 2;
                      ctx.shadowOffsetY = 2;

                      ctx.drawImage(pinImg, x, y, pinWidth, pinHeight);
                      resolve(canvas.toDataURL('image/png'));
                  };
                  pinImg.src = PIN_MARKER_BASE64;
              }
          };
          mapImg.src = blobToUrl(mapBlob);
      });
  };

  // Função para gerar URL de imagem estática da Esri
  const fetchStaticMap = async (lat: number, lng: number): Promise<string | null> => {
    // Cálculo do Delta com base no Zoom atual para garantir que o PDF tenha o mesmo visual da tela.
    const deltaX = (800 * 360) / (256 * Math.pow(2, currentZoom));
    const deltaY = (500 * 360) / (256 * Math.pow(2, currentZoom));
    
    // Calcula o Bounding Box (bbox) a partir do centro e dos deltas
    const minX = lng - (deltaX / 2);
    const maxX = lng + (deltaX / 2);
    const minY = lat - (deltaY / 2);
    const maxY = lat + (deltaY / 2);
    
    const size = "800,500";
    const commonParams = `bbox=${minX},${minY},${maxX},${maxY}&bboxSR=4326&imageSR=4326&size=${size}&f=image`;
    
    const satUrl = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?${commonParams}`;
    const streetUrl = `https://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/export?${commonParams}`;
    const transParams = `${commonParams}&format=png32&transparent=true`;
    const transRefUrl = `https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer/export?${transParams}`;
    const placesRefUrl = `https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/export?${transParams}`;

    try {
        let finalBlob: Blob | null = null;

        if (mapType === 'street') {
             const response = await fetch(streetUrl);
             if (!response.ok) throw new Error('Erro ao buscar mapa de ruas');
             finalBlob = await response.blob();
        } else {
            const satResponse = await fetch(satUrl);
            if (!satResponse.ok) throw new Error('Falha ao buscar imagem satélite');
            let currentBlob = await satResponse.blob();

            try {
                const transResponse = await fetch(transRefUrl);
                if (transResponse.ok) {
                    const transBlob = await transResponse.blob();
                    currentBlob = await mergeImages(currentBlob, transBlob);
                }
            } catch (e) { console.warn("Falha ao buscar camada transporte", e); }

            try {
                const placesResponse = await fetch(placesRefUrl);
                if (placesResponse.ok) {
                    const placesBlob = await placesResponse.blob();
                    currentBlob = await mergeImages(currentBlob, placesBlob);
                }
            } catch (e) { console.warn("Falha ao buscar camada lugares", e); }
            
            finalBlob = currentBlob;
        }

        if (finalBlob) {
            return await addPinToImage(finalBlob);
        }
        return null;

    } catch (e) {
        console.error("Erro ao buscar mapa estático", e);
        return null;
    }
  };

  useEffect(() => {
    if (!mapRef.current) {
      const defaultLat = -25.4284;
      const defaultLng = -49.2733;
      const initialZoom = 14;

      mapRef.current = L.map('map-container', { preferCanvas: true }).setView([defaultLat, defaultLng], initialZoom);
      setCurrentZoom(initialZoom);

      mapRef.current.on('zoomend', () => {
        setCurrentZoom(mapRef.current.getZoom());
      });
      
      const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', crossOrigin: 'anonymous' });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', crossOrigin: 'anonymous' });

      const hybridLayer = L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { crossOrigin: 'anonymous' }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { crossOrigin: 'anonymous', zIndex: 900 }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { crossOrigin: 'anonymous', zIndex: 1000 })
      ]);

      (mapRef.current as any)._layers_options = {
        street: streetLayer,
        satellite: satelliteLayer,
        hybrid: hybridLayer
      };

      hybridLayer.addTo(mapRef.current);
      currentLayerRef.current = hybridLayer;

      mapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setMarkerPosition(lat, lng);
          updateCoords(lat, lng);
          fetchAddressFromCoords(lat, lng);
      });
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && (mapRef.current as any)._layers_options) {
      if (currentLayerRef.current) {
        if (typeof currentLayerRef.current.remove === 'function') {
             currentLayerRef.current.remove();
        } else if (typeof currentLayerRef.current.removeFrom === 'function') {
            mapRef.current.removeLayer(currentLayerRef.current);
        }
      }
      const newLayer = (mapRef.current as any)._layers_options[mapType];
      if (newLayer) {
        newLayer.addTo(mapRef.current);
        currentLayerRef.current = newLayer;
      }
    }
  }, [mapType]);

  useEffect(() => {
    const fetchCityCoords = async () => {
      if (!formData.municipio || !MUNICIPIOS_PR.includes(formData.municipio)) return;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.municipio + ', Paraná, Brasil')}&limit=1`, {
             headers: { 'Accept-Language': 'pt-BR' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lon);
          
          if (mapRef.current) {
              mapRef.current.setView([latNum, lngNum], 14);
              setCurrentZoom(14); 
          }
        }
      } catch (error) {
          console.error("Erro ao buscar coordenadas da cidade", error);
      }
    };
    if (mapRef.current) fetchCityCoords();
  }, [formData.municipio]);

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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = maskCPF(e.target.value);
    setFormData({ ...formData, cpfRequerente: val });
    if (cpfError && validateCPF(val)) setCpfError(false);
  };

  const handleCpfBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length > 0 && !validateCPF(val)) setCpfError(true);
  };

  const handleIncraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = maskINCRA(e.target.value);
      setFormData({ ...formData, incra: val });
      if (incraError && validateINCRA(val)) setIncraError(false);
  };

  const handleIncraBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length > 0 && !validateINCRA(val)) setIncraError(true);
  };

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = maskMatricula(e.target.value);
      setFormData({ ...formData, matricula: val });
      if (matriculaError && validateMatricula(val)) setMatriculaError(false);
  };

  const handleMatriculaBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.length > 0 && !validateMatricula(val)) setMatriculaError(true);
  };


  const handleTogglePreview = async () => {
    if (!showPreview) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            setIsGeneratingMap(true);
            try {
                const staticMap = await fetchStaticMap(lat, lng);
                if (staticMap) {
                    setMapSnapshot(staticMap);
                } else {
                    setMapSnapshot(null);
                }
            } catch(e) {
                console.error("Erro ao gerar mapa", e);
                setMapSnapshot(null);
            } finally {
                setIsGeneratingMap(false);
            }
        } else {
            setMapSnapshot(null);
        }
    }
    setShowPreview(!showPreview);
  };

  const generatePDF = async () => {
    const headerEl = document.getElementById('pdf-header-template');
    const footerEl = document.getElementById('pdf-footer-template');
    const contentEl = document.getElementById('laudo-content-body');
    
    if (!headerEl || !footerEl || !contentEl) {
        alert("Erro ao gerar PDF: Elementos de template não encontrados.");
        return;
    }

    try {
        setIsGeneratingMap(true);

        const a4WidthPx = 794; // Largura aproximada A4 em px (96dpi)

        const headerCanvas = await html2canvas(headerEl, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: a4WidthPx
        });
        const headerImg = headerCanvas.toDataURL('image/png');
        
        const footerCanvas = await html2canvas(footerEl, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: a4WidthPx
        });
        const footerImg = footerCanvas.toDataURL('image/png');

        // Margens aumentadas para 45mm no topo para evitar corte do cabeçalho
        const opt = {
          margin: [45, 10, 30, 10], 
          filename: `Laudo_${formData.municipio || 'PR'}_${formData.data}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] } 
        };

        html2pdf().from(contentEl).set(opt).toPdf().get('pdf').then((pdf: any) => {
            const totalPages = pdf.internal.getNumberOfPages();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.addImage(headerImg, 'PNG', 0, 0, pageWidth, 35);
                pdf.addImage(footerImg, 'PNG', 0, pageHeight - 25, pageWidth, 25);
            }
        }).save().then(() => {
             setIsGeneratingMap(false);
        });

    } catch (e) {
        console.error("Erro na geração do PDF:", e);
        setIsGeneratingMap(false);
        alert("Erro ao gerar o PDF. Tente novamente.");
    }
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
      
      {/* --- TEMPLATES OCULTOS PARA GERAÇÃO DE PDF --- */}
      {/* Posicionados com top:0, left:0 e zIndex negativo para renderização correta sem interferir no layout visual */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -50, width: '210mm', pointerEvents: 'none', visibility: 'visible' }}>
         
         {/* Template Cabeçalho */}
         <div id="pdf-header-template" className="bg-white px-8 pt-6 pb-2 w-full relative flex items-center justify-center h-[35mm] text-black">
            <div className="text-center w-full">
                <h2 className="font-black text-2xl uppercase text-black leading-none mb-1" style={{color: '#000000'}}>Estado do Paraná</h2>
                <h3 className="font-black text-xl uppercase text-black leading-none mb-1" style={{color: '#000000'}}>Coordenadoria Estadual da Defesa Civil</h3>
                <p className="font-bold text-sm uppercase text-black leading-none" style={{color: '#000000'}}>Fundo Estadual para Calamidades Públicas</p>
            </div>
         </div>

         {/* Template Rodapé */}
         <div id="pdf-footer-template" className="bg-white w-full relative h-[25mm] flex flex-col justify-end pb-2 text-black">
             <div className="w-full h-2 flex mb-2">
                 <div className="bg-[#0038a8] w-[85%] h-full" style={{ clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)' }}></div>
                 <div className="bg-[#009943] w-[15%] h-full ml-[-10px]" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
             </div>
             <div className="text-center text-[9px] text-black font-bold px-8" style={{color: '#000000'}}>
                <p className="leading-tight">Palácio das Araucárias - 1º andar - Setor C | Centro Cívico | Curitiba/PR | CEP 80.530-140</p>
                <p className="leading-tight">E-mail: defesacivil@defesacivil.pr.gov.br | Fone: (41) 3281-2500</p>
                <p className="mt-1 font-black italic text-black text-[10px]" style={{color: '#000000'}}>"Defesa Civil somos todos nós"</p>
             </div>
         </div>

      </div>
      {/* --- FIM TEMPLATES --- */}

      <div className="sticky top-0 z-30">
        <div className="bg-[#1e1e1e] text-white py-1 px-4 flex justify-between items-center text-xs">
          <span className="font-bold">PR.GOV.BR</span>
          <div className="flex items-center gap-4">
            <span className="font-semibold hidden sm:inline uppercase">Governo do Estado do Paraná</span>
          </div>
        </div>

        <header className="bg-white shadow-md border-b-4 border-[#f38b00]">
          <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
              <div className="flex items-end gap-6">
                  <img src={LOGO_DEFESA_CIVIL_BASE64} alt="Defesa Civil Paraná" className="h-28" />
                  <div className="hidden md:flex flex-col">
                    <span className="text-black font-black uppercase text-3xl leading-none translate-y-[2px]">COORDENADORIA ESTADUAL DA DEFESA CIVIL</span>
                  </div>
              </div>
              <div className="text-right self-center">
                 <h1 className="text-lg md:text-xl font-black text-gray-700 uppercase">Laudo Técnico</h1>
                 <p className="text-xs text-gray-400">Sistema de Gestão de Desastres</p>
              </div>
          </div>
        </header>
      </div>

      <main className="max-w-5xl mx-auto py-8 px-4">
        {/* Formulário Principal (Mantido igual) */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 md:p-10 space-y-10">
            {/* ... Conteúdo do Formulário ... */}
            {/* Seção 1 */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">1</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Informações da Inspeção</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Município do Paraná</label>
                  <input list="municipios-list" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} placeholder="Digite para buscar..." />
                  <datalist id="municipios-list">{MUNICIPIOS_PR.map(m => <option key={m} value={m} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Data do Levantamento</label>
                  <input type="date" readOnly className="w-full rounded border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm p-3 text-sm font-semibold border-2" value={formData.data} />
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border-2 border-dashed border-orange-200">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3 gap-2">
                  <label className="block text-xs font-bold text-[#f38b00] uppercase">Engenheiro Responsável</label>
                  <button onClick={() => { setEditingEng(null); setIsEngModalOpen(true); }} className="text-[10px] bg-[#f38b00] text-white px-3 py-2 rounded-full hover:bg-orange-600 transition uppercase font-bold self-start sm:self-auto">+ Novo Engenheiro</button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select className="flex-1 rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-bold border-2 focus:border-[#f38b00] focus:ring-[#f38b00]" value={formData.engenheiroId} onChange={e => setFormData({ ...formData, engenheiroId: e.target.value })}>
                    <option value="" disabled>Selecionar...</option>
                    {engenheiros.map(eng => (<option key={eng.id} value={eng.id}>{eng.nome} - CREA {eng.creaEstado} {eng.creaNumero}</option>))}
                  </select>
                  <button onClick={() => { if(currentEngenheiro) { setEditingEng(currentEngenheiro); setIsEngModalOpen(true); } }} disabled={!currentEngenheiro} className="px-4 py-3 sm:py-2 bg-white text-gray-700 rounded text-xs font-bold hover:bg-gray-50 border-2 border-gray-300 disabled:opacity-50">EDITAR</button>
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
                    <button onClick={() => setFormData({...formData, zona: 'Urbano'})} className={`group flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${formData.zona === 'Urbano' ? 'border-[#f38b00] bg-orange-50 shadow-md' : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.zona === 'Urbano' ? 'text-[#f38b00]' : 'text-gray-400 group-hover:text-orange-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <span className={`text-sm font-black uppercase tracking-wider ${formData.zona === 'Urbano' ? 'text-gray-900' : 'text-gray-500'}`}>Urbano</span>
                    </button>
                    <button onClick={() => setFormData({...formData, zona: 'Rural'})} className={`group flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${formData.zona === 'Rural' ? 'border-[#f38b00] bg-orange-50 shadow-md' : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mb-2 ${formData.zona === 'Rural' ? 'text-[#f38b00]' : 'text-gray-400 group-hover:text-orange-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className={`text-sm font-black uppercase tracking-wider ${formData.zona === 'Rural' ? 'text-gray-900' : 'text-gray-500'}`}>Rural</span>
                    </button>
                </div>
              </div>
              {/* Campos do formulário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                {formData.zona === 'Urbano' ? (
                    <>
                        <div className="space-y-1"><label className="block text-xs font-bold text-gray-500 uppercase">Indicação Fiscal</label><input type="text" placeholder="Ex: 00.00.000.0000.000" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.indicacaoFiscal} onChange={e => setFormData({ ...formData, indicacaoFiscal: e.target.value })} /></div>
                        <div className="space-y-1"><label className="block text-xs font-bold text-gray-500 uppercase">Inscrição Municipal</label><input type="text" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.inscricaoMunicipal} onChange={e => setFormData({ ...formData, inscricaoMunicipal: e.target.value })} /></div>
                        <div className="space-y-1 md:col-span-2 relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Matrícula</label>
                            <input 
                                type="text" 
                                className={`w-full rounded bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2 focus:ring-[#f38b00] focus:border-[#f38b00] ${matriculaError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                                value={formData.matricula} 
                                onChange={handleMatriculaChange}
                                onBlur={handleMatriculaBlur} 
                                placeholder="000000.0.0000000-00"
                                maxLength={19}
                            />
                            {matriculaError && <span className="absolute right-2 top-8 text-[10px] text-red-600 font-bold bg-white px-1">Inválido/Incompleto</span>}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-1"><label className="block text-xs font-bold text-gray-500 uppercase">NIRF/CIB (Receita Federal)</label><input type="text" placeholder="Número do Imóvel na Receita Federal" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.nirf} onChange={e => setFormData({ ...formData, nirf: e.target.value })} /></div>
                        <div className="space-y-1 relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase">INCRA (CCIR)</label>
                            <input 
                                type="text" 
                                placeholder="000.000.000.000-0" 
                                className={`w-full rounded bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2 focus:ring-[#f38b00] focus:border-[#f38b00] ${incraError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
                                value={formData.incra} 
                                onChange={handleIncraChange}
                                onBlur={handleIncraBlur} 
                            />
                            {incraError && <span className="absolute right-2 top-8 text-[10px] text-red-600 font-bold bg-white px-1">Inválido/Incompleto</span>}
                        </div>
                    </>
                )}
                
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Requerente</label>
                    <input type="text" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.requerente} onChange={e => setFormData({ ...formData, requerente: e.target.value })} />
                </div>
                <div className="space-y-1 relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase">CPF do Requerente</label>
                    <input 
                        type="text" 
                        placeholder="000.000.000-00" 
                        className={`w-full rounded bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2 focus:ring-[#f38b00] focus:border-[#f38b00] ${cpfError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
                        value={formData.cpfRequerente} 
                        onChange={handleCpfChange}
                        onBlur={handleCpfBlur} 
                    />
                    {cpfError && <span className="absolute right-2 top-8 text-[10px] text-red-600 font-bold bg-white px-1">CPF Inválido</span>}
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Proprietário</label>
                    <input type="text" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.proprietario} onChange={e => setFormData({ ...formData, proprietario: e.target.value })} />
                </div>

                <div className="space-y-1 md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase">Tipologia da Edificação</label>
                  <select className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm focus:ring-[#f38b00] focus:border-[#f38b00] p-3 text-sm font-semibold border-2" value={formData.tipologia} onChange={e => setFormData({ ...formData, tipologia: e.target.value })}>
                    <option value="" disabled>Selecionar...</option>
                    {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {(formData.tipologia === 'Outro' || formData.tipologia === 'Equipamento Público') && (<input type="text" placeholder="Descreva a tipologia..." className="mt-2 w-full rounded border-gray-300 bg-white shadow-sm p-3 text-sm border-2 italic" value={formData.tipologiaOutro} onChange={e => setFormData({ ...formData, tipologiaOutro: e.target.value })} />)}
                </div>
              </div>

              {/* ... Resto do componente (Mapas, Danos, Classificação) ... */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end flex-wrap gap-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Endereço</label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                   <div className="md:col-span-4">
                     <input type="text" placeholder="Endereço Completo (Preenchimento Automático pelo Mapa ou GPS)" className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 text-sm font-semibold border-2 bg-gray-50" value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
                   </div>
                   
                   <div>
                       <label className="text-[10px] uppercase font-bold text-gray-400">Latitude</label>
                       <input 
                           type="text" 
                           className="w-full rounded bg-white border-gray-300 p-2 text-sm text-gray-700 font-mono border focus:ring-[#f38b00] focus:border-[#f38b00]" 
                           value={formData.latitude} 
                           onChange={(e) => handleManualCoordChange('latitude', e.target.value)}
                           onBlur={handleManualCoordBlur}
                       />
                   </div>
                   <div>
                       <label className="text-[10px] uppercase font-bold text-gray-400">Longitude</label>
                       <input 
                           type="text" 
                           className="w-full rounded bg-white border-gray-300 p-2 text-sm text-gray-700 font-mono border focus:ring-[#f38b00] focus:border-[#f38b00]" 
                           value={formData.longitude} 
                           onChange={(e) => handleManualCoordChange('longitude', e.target.value)}
                           onBlur={handleManualCoordBlur}
                       />
                   </div>
                   
                   <div className="md:col-span-2 flex gap-2">
                        <button onClick={handleGetLocation} disabled={isLoadingLocation} className="flex-1 flex items-center justify-center gap-1 bg-[#f38b00] text-white px-3 py-2 rounded shadow text-xs font-bold hover:bg-orange-600 transition disabled:opacity-50 h-[38px]">
                          {isLoadingLocation ? 'Buscando...' : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Minha Localização</>)}
                        </button>
                        <select className="flex-1 rounded border-gray-300 bg-white text-gray-900 p-1 text-xs font-bold border shadow-sm cursor-pointer h-[38px]" value={mapType} onChange={e => setMapType(e.target.value as any)}>
                            <option value="hybrid">Híbrido</option>
                            <option value="satellite">Satélite</option>
                            <option value="street">Mapa</option>
                        </select>
                   </div>
                </div>
                
                <div id="map-container" className="w-full h-[450px] bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 shadow-inner z-10 relative"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-100 rounded">
                     <p className="text-[10px] text-gray-500 italic">* Arraste o marcador ou edite as coordenadas para ajustar a localização exata.</p>
                </div>
              </div>
            </section>

            {/* Seção 3 e 4 mantidas igual */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">3</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Levantamento de Danos</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {ITENS_DANOS.map(item => {
                  const isActive = formData.levantamentoDanos.some(d => d.tipo === item);
                  return (<button key={item} onClick={() => handleDanoToggle(item)} className={`p-2 text-[10px] font-bold uppercase rounded border-2 transition text-center ${isActive ? 'bg-[#f38b00] text-white border-[#f38b00] shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-[#f38b00] hover:text-[#f38b00]'}`}>{item}</button>);
                })}
              </div>

              <div className="space-y-6 mt-6">
                {formData.levantamentoDanos.map((dano, idx) => (
                  <div key={idx} className="bg-gray-50 p-5 rounded-lg border-l-4 border-[#f38b00] shadow-sm space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-gray-800 uppercase text-sm tracking-wider">{dano.tipo}</h3>
                      <button onClick={() => handleDanoToggle(dano.tipo)} className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase flex items-center gap-1">Remover</button>
                    </div>
                    <textarea placeholder={`Descreva os danos observados em ${dano.tipo}...`} className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-3 h-24 text-sm border focus:ring-[#f38b00] focus:border-[#f38b00]" value={dano.descricao} onChange={e => handleDanoDescChange(dano.tipo, e.target.value)} />
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Fotos</label>
                       <div className="flex flex-wrap gap-3">
                          {dano.fotos.map((foto, fIdx) => (
                            <div key={fIdx} className="relative group w-24 h-24">
                              <img src={foto} className="w-full h-full object-cover rounded border border-gray-200 shadow-sm" />
                              <button onClick={() => removeFoto(dano.tipo, fIdx)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition">✕</button>
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

            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <span className="bg-[#f38b00] text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">4</span>
                <h2 className="text-lg font-black text-gray-700 uppercase">Classificação Final</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Parecer de Danos</label>                  
                  <select className="w-full rounded border-gray-300 bg-white text-gray-900 shadow-sm p-4 text-sm font-black border-2 focus:ring-[#f38b00] focus:border-[#f38b00]" value={formData.classificacaoDanos} onChange={e => setFormData({ ...formData, classificacaoDanos: e.target.value })}>
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
                  {isGeneratingMap ? 'Gerando PDF...' : 'Baixar Laudo PDF'}
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
                {isGeneratingMap && !mapSnapshot ? (
                    <div className="p-12 text-center text-gray-500 font-bold uppercase animate-pulse">
                        Processando dados do laudo...
                    </div>
                ) : (
                    <LaudoPreview data={formData} engenheiro={currentEngenheiro} mapSnapshot={mapSnapshot} />
                )}
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
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8">
             <img src={LOGO_PARANA_BASE64} alt="Governo do Estado do Paraná" className="h-20 w-auto object-contain" />
             <div className="text-left">
                <p className="font-black uppercase text-3xl leading-none">Governo do Estado do Paraná</p>
                <p className="text-sm text-gray-400 mt-1">Defesa Civil - Coordenadoria Estadual</p>
             </div>
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