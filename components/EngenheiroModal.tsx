
import React, { useState, useEffect } from 'react';
import { ESTADOS_BR, Engenheiro } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eng: Engenheiro) => void;
  initialData?: Engenheiro | null;
}

const EngenheiroModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Engenheiro>({
    id: '',
    nome: '',
    creaEstado: 'PR',
    creaNumero: '',
    endereco: '',
    telefone: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        nome: '',
        creaEstado: 'PR',
        creaNumero: '',
        endereco: '',
        telefone: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-blue-900">
          {initialData ? 'Editar Engenheiro' : 'Cadastrar Engenheiro'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700">CREA UF</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                value={formData.creaEstado}
                onChange={e => setFormData({...formData, creaEstado: e.target.value})}
              >
                {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Número CREA</label>
              <input
                type="text"
                placeholder="Ex: 123.456/D"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                value={formData.creaNumero}
                onChange={e => setFormData({...formData, creaNumero: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Endereço Profissional</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.endereco}
              onChange={e => setFormData({...formData, endereco: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              value={formData.telefone}
              onChange={e => setFormData({...formData, telefone: e.target.value})}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EngenheiroModal;
