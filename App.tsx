
import React, { useState } from 'react';
import ERDiagram from './components/ERDiagram';
import ERDiagramChen from './components/ERDiagramChen';
import SQLModal from './components/SQLModal';

// --- TYPES ---
export type ColorScheme = 'blue' | 'orange' | 'green' | 'pink';
export type CardinalityType = 'zero' | 'one' | 'many';

export interface Attribute {
  id: string;
  name: string;
  type: string;
  isKey: boolean;
}

export interface Entity {
  id: string;
  title: string;
  colorScheme: ColorScheme;
  x: number;
  y: number;
  attributes: Attribute[];
  description?: string; // New field for explanation
}

export interface Relationship {
  id: string;
  from: string; // Entity ID
  to: string;   // Entity ID
  cardFrom: CardinalityType[];
  cardTo: CardinalityType[];
  label: string;
  description?: string; // New field for explanation
}

// --- INITIAL DATA ---
const initialEntities: Entity[] = [
  { 
    id: 'USUARIO', title: 'USUÁRIO', colorScheme: 'orange', x: 675, y: 500,
    description: 'Esta é a peça central. Representa você ou qualquer pessoa que usa o sistema Cofry. Todas as finanças, metas e configurações estão ligadas a esta conta.',
    attributes: [
      { id: 'u1', name: 'ID_Usuario', type: 'int', isKey: true },
      { id: 'u2', name: 'Nome', type: 'varchar(100)', isKey: false },
      { id: 'u3', name: 'Email', type: 'varchar(100)', isKey: false },
      { id: 'u4', name: 'Senha_Hash', type: 'varchar(255)', isKey: false },
      { id: 'u5', name: 'Tipo_Usuario', type: 'varchar(20)', isKey: false }
    ]
  },
  { 
    id: 'META_POUPANCA', title: 'META_POUPANÇA', colorScheme: 'blue', x: 250, y: 100,
    description: 'Aqui ficam seus sonhos financeiros, como "Comprar um Carro" ou "Viagem". O sistema acompanha quanto você já guardou versus quanto precisa.',
    attributes: [
      { id: 'm1', name: 'ID_Meta', type: 'int', isKey: true },
      { id: 'm2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'm3', name: 'Valor_Alvo', type: 'decimal(10,2)', isKey: false },
      { id: 'm4', name: 'Valor_Atual', type: 'decimal(10,2)', isKey: false },
      { id: 'm5', name: 'Data_Limite', type: 'date', isKey: false }
    ]
  },
  { 
    id: 'INVESTIMENTO', title: 'INVESTIMENTO', colorScheme: 'blue', x: 675, y: 50,
    description: 'Registra o dinheiro que está aplicado (Renda Fixa, Ações, etc.) para fazer seu patrimônio crescer, diferente do dinheiro parado na conta.',
    attributes: [
      { id: 'i1', name: 'ID_Invest', type: 'int', isKey: true },
      { id: 'i2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'i3', name: 'Tipo_Ativo', type: 'varchar(50)', isKey: false },
      { id: 'i4', name: 'Valor_Aplicado', type: 'decimal(10,2)', isKey: false },
      { id: 'i5', name: 'ROI_Atual', type: 'decimal(5,2)', isKey: false }
    ]
  },
  { 
    id: 'LOG_AUDITORIA', title: 'LOG_AUDITORIA', colorScheme: 'pink', x: 1100, y: 100,
    description: 'Uma "caixa preta" de segurança. Grava ações importantes (como mudar senha ou apagar dados) para que administradores saibam o que aconteceu no sistema.',
    attributes: [
      { id: 'l1', name: 'ID_Log', type: 'int', isKey: true },
      { id: 'l2', name: 'ID_Admin', type: 'int', isKey: false },
      { id: 'l3', name: 'Acao', type: 'varchar(255)', isKey: false },
      { id: 'l4', name: 'Data_Hora', type: 'datetime', isKey: false }
    ]
  },
  { 
    id: 'CONTA', title: 'CONTA', colorScheme: 'green', x: 1250, y: 350,
    description: 'Representa suas contas bancárias reais (Nubank, Itaú, Carteira física). É de onde sai ou para onde vai o dinheiro das transações.',
    attributes: [
      { id: 'c1', name: 'ID_Conta', type: 'int', isKey: true },
      { id: 'c2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'c3', name: 'Saldo', type: 'decimal(10,2)', isKey: false },
      { id: 'c4', name: 'Instituicao', type: 'varchar(100)', isKey: false }
    ]
  },
  { 
    id: 'CARTAO_CREDITO', title: 'CARTAO_CREDITO', colorScheme: 'green', x: 1250, y: 600,
    description: 'Seus cartões de crédito. Diferente da conta, aqui você gasta com um limite e paga no vencimento.',
    attributes: [
      { id: 'cc1', name: 'ID_Cartao', type: 'int', isKey: true },
      { id: 'cc2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'cc3', name: 'Limite', type: 'decimal(10,2)', isKey: false },
      { id: 'cc4', name: 'Dia_Vencimento', type: 'int', isKey: false }
    ]
  },
  { 
    id: 'TRANSACAO', title: 'TRANSAÇÃO', colorScheme: 'green', x: 1250, y: 900,
    description: 'O coração do controle financeiro. Cada café comprado, salário recebido ou conta paga é registrado aqui.',
    attributes: [
      { id: 't1', name: 'ID_Trans', type: 'int', isKey: true },
      { id: 't2', name: 'ID_Origem', type: 'int', isKey: false },
      { id: 't3', name: 'Valor', type: 'decimal(10,2)', isKey: false },
      { id: 't4', name: 'Data', type: 'date', isKey: false },
      { id: 't5', name: 'Comprovante_URL', type: 'varchar(255)', isKey: false },
      { id: 't6', name: 'ID_Categoria', type: 'int', isKey: false }
    ]
  },
  { 
    id: 'CATEGORIA', title: 'CATEGORIA', colorScheme: 'blue', x: 950, y: 950,
    description: 'Etiquetas para organizar seu dinheiro, como "Alimentação", "Transporte" ou "Lazer". Ajuda a saber para onde o dinheiro está indo.',
    attributes: [
      { id: 'cat1', name: 'ID_Categoria', type: 'int', isKey: true },
      { id: 'cat2', name: 'Nome', type: 'varchar(50)', isKey: false },
      { id: 'cat3', name: 'Tipo', type: 'varchar(20)', isKey: false },
      { id: 'cat4', name: 'Icone', type: 'varchar(50)', isKey: false }
    ]
  },
  { 
    id: 'ORCAMENTO', title: 'ORÇAMENTO', colorScheme: 'blue', x: 600, y: 950,
    description: 'Seu planejamento mensal. Aqui você define limites, por exemplo: "Quero gastar no máximo R$ 500,00 com Alimentação este mês".',
    attributes: [
      { id: 'o1', name: 'ID_Orc', type: 'int', isKey: true },
      { id: 'o2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'o3', name: 'ID_Categoria', type: 'int', isKey: false },
      { id: 'o4', name: 'Valor_Limite', type: 'decimal(10,2)', isKey: false },
      { id: 'o5', name: 'Mes_Ano', type: 'varchar(7)', isKey: false }
    ]
  },
  { 
    id: 'BOLETO_DDA', title: 'BOLETO_DDA', colorScheme: 'blue', x: 200, y: 900,
    description: 'Contas que chegam automaticamente no seu nome (Busca DDA), como luz ou internet, aguardando pagamento ou agendamento.',
    attributes: [
      { id: 'b1', name: 'ID_Boleto', type: 'int', isKey: true },
      { id: 'b2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'b3', name: 'Cod_Barras', type: 'varchar(255)', isKey: false },
      { id: 'b4', name: 'Vencimento', type: 'date', isKey: false },
      { id: 'b5', name: 'Status', type: 'varchar(20)', isKey: false }
    ]
  },
  { 
    id: 'ASSINATURA', title: 'ASSINATURA', colorScheme: 'blue', x: 100, y: 600,
    description: 'Controla se você paga pelo Cofry Premium. Define quais recursos extras do sistema você pode acessar.',
    attributes: [
      { id: 'a1', name: 'ID_Assin', type: 'int', isKey: true },
      { id: 'a2', name: 'ID_Usuario', type: 'int', isKey: false },
      { id: 'a3', name: 'ID_Plano', type: 'int', isKey: false },
      { id: 'a4', name: 'Status', type: 'varchar(20)', isKey: false },
      { id: 'a5', name: 'Data_Fim', type: 'date', isKey: false }
    ]
  },
  { 
    id: 'PLANO', title: 'PLANO', colorScheme: 'blue', x: 100, y: 300,
    description: 'Os pacotes disponíveis no Cofry (Ex: Gratuito, Gold, Platinum) e o que cada um oferece.',
    attributes: [
      { id: 'p1', name: 'ID_Plano', type: 'int', isKey: true },
      { id: 'p2', name: 'Nome', type: 'varchar(50)', isKey: false },
      { id: 'p3', name: 'Preco', type: 'decimal(10,2)', isKey: false },
      { id: 'p4', name: 'Recursos', type: 'text', isKey: false }
    ]
  },
];

const initialRelationships: Relationship[] = [
  { 
    id: 'r1', from: 'USUARIO', to: 'META_POUPANCA', cardFrom: ['one'], cardTo: ['many'], label: 'TEM',
    description: 'Um único Usuário pode criar várias Metas de Poupança diferentes ao mesmo tempo.'
  },
  { 
    id: 'r2', from: 'USUARIO', to: 'INVESTIMENTO', cardFrom: ['one'], cardTo: ['many'], label: 'POSSUI',
    description: 'O Usuário pode ter múltiplos Investimentos registrados na sua carteira.'
  },
  { 
    id: 'r3', from: 'USUARIO', to: 'LOG_AUDITORIA', cardFrom: ['one'], cardTo: ['many'], label: 'GERA',
    description: 'As ações de um Usuário geram vários registros de segurança (Logs) para controle.'
  },
  { 
    id: 'r4', from: 'USUARIO', to: 'CONTA', cardFrom: ['one'], cardTo: ['many'], label: 'MANTÉM',
    description: 'Um Usuário pode gerenciar várias Contas bancárias (Ex: uma no Banco A, outra no Banco B).'
  },
  { 
    id: 'r5', from: 'USUARIO', to: 'CARTAO_CREDITO', cardFrom: ['one'], cardTo: ['many'], label: 'POSSUI',
    description: 'Da mesma forma que as contas, um Usuário pode cadastrar vários Cartões de Crédito.'
  },
  { 
    id: 'r6', from: 'USUARIO', to: 'BOLETO_DDA', cardFrom: ['one'], cardTo: ['many'], label: 'PAGA',
    description: 'Boletos são emitidos no nome do Usuário; ele pode ter vários boletos pendentes.'
  },
  { 
    id: 'r7', from: 'USUARIO', to: 'ORCAMENTO', cardFrom: ['one'], cardTo: ['many'], label: 'DEFINE',
    description: 'O Usuário define Orçamentos para controlar seus gastos em diferentes áreas.'
  },
  { 
    id: 'r8', from: 'USUARIO', to: 'ASSINATURA', cardFrom: ['one'], cardTo: ['many'], label: 'ASSINA',
    description: 'O Usuário contrata Assinaturas para liberar recursos no sistema.'
  },
  { 
    id: 'r9', from: 'PLANO', to: 'ASSINATURA', cardFrom: ['one'], cardTo: ['many'], label: 'CONTÉM',
    description: 'Um Plano (ex: Gold) serve de base para várias Assinaturas de usuários diferentes.'
  },
  { 
    id: 'r10', from: 'CATEGORIA', to: 'ORCAMENTO', cardFrom: ['one'], cardTo: ['many'], label: 'CLASSIFICA',
    description: 'Uma Categoria (ex: Alimentação) é usada para criar um Orçamento específico para ela.'
  },
  { 
    id: 'r11', from: 'CATEGORIA', to: 'TRANSACAO', cardFrom: ['one'], cardTo: ['many'], label: 'CLASSIFICA',
    description: 'Muitas Transações podem pertencer à mesma Categoria (ex: vários gastos com "Uber" na categoria "Transporte").'
  },
  { 
    id: 'r12', from: 'CARTAO_CREDITO', to: 'TRANSACAO', cardFrom: ['one'], cardTo: ['many'], label: 'REALIZA',
    description: 'Um Cartão de Crédito contém o histórico de várias Transações realizadas com ele.'
  },
  { 
    id: 'r13', from: 'CONTA', to: 'TRANSACAO', cardFrom: ['one'], cardTo: ['many'], label: 'REALIZA',
    description: 'Uma Conta Bancária reflete o extrato de várias Transações (saídas e entradas) feitas nela.'
  },
];

const App: React.FC = () => {
  const [isChenView, setIsChenView] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSQLModalOpen, setIsSQLModalOpen] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false); 
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [entities, setEntities] = useState<Entity[]>(initialEntities);
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'entity' | 'relationship' | null>(null);

  // --- CRUD HELPERS ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- HANDLERS ---
  const handleSelect = (id: string, type: 'entity' | 'relationship') => {
    if (isEditMode) {
        setSelectedId(id);
        setSelectedType(type);
    } else {
        setSelectedId(null);
        setSelectedType(null);
    }
  };

  const handleUpdateEntityPos = (id: string, x: number, y: number) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, x, y } : e));
  };

  const handleAddEntity = () => {
    const newId = `ENT_${generateId()}`;
    const newEntity: Entity = {
      id: newId,
      title: 'NOVA_ENTIDADE',
      colorScheme: 'blue',
      // Center new entity in view
      x: (800 - pan.x) / scale,
      y: (400 - pan.y) / scale,
      attributes: [{ id: generateId(), name: 'ID', type: 'int', isKey: true }],
      description: 'Nova entidade criada. Edite para descrever sua função.'
    };
    setEntities([...entities, newEntity]);
    if (isEditMode) handleSelect(newId, 'entity');
  };

  const handleDeleteEntity = () => {
    if (!selectedId || selectedType !== 'entity') return;
    setRelationships(prev => prev.filter(r => r.from !== selectedId && r.to !== selectedId));
    setEntities(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
  };

  const handleAddRelationship = () => {
    if (entities.length < 2) return alert("Precisa de pelo menos 2 entidades.");
    const newId = `REL_${generateId()}`;
    const newRel: Relationship = {
      id: newId,
      from: entities[0].id,
      to: entities[1].id,
      cardFrom: ['one'],
      cardTo: ['many'],
      label: 'RELACAO'
    };
    setRelationships([...relationships, newRel]);
    if (isEditMode) handleSelect(newId, 'relationship');
  };

  const handleDeleteRelationship = () => {
    if (!selectedId || selectedType !== 'relationship') return;
    setRelationships(prev => prev.filter(r => r.id !== selectedId));
    setSelectedId(null);
  };

  const handleImportData = (newEntities: Entity[], newRelationships: Relationship[]) => {
      setEntities(newEntities);
      setRelationships(newRelationships);
      setIsSQLModalOpen(false);
      // Reset view to center content reasonably
      setScale(0.8);
      setPan({x: 0, y: 0});
  };

  // --- ZOOM ---
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.2));
  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // --- DOWNLOAD ---
  const handleDownloadJPG = () => {
    const svgElement = document.getElementById('er-diagram-svg');
    if (!svgElement) {
      alert("Não foi possível encontrar o diagrama para baixar.");
      return;
    }
    
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    
    canvas.width = 1600; 
    canvas.height = 1200;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 1600, 1200); 
      URL.revokeObjectURL(url);
      const jpgUrl = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = jpgUrl;
      link.download = `diagrama-er-cofry.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = url;
  };

  // --- EDITOR RENDER ---
  const renderEditor = () => {
    if (!isEditMode) return null;

    if (!selectedId) {
      return (
        <div className="text-center text-gray-500 mt-10">
          <p>Selecione um item para editar.</p>
          <div className="flex flex-col gap-2 mt-4">
            <button onClick={handleAddEntity} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Nova Entidade</button>
            <button onClick={handleAddRelationship} className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700">Nova Relação</button>
          </div>
        </div>
      );
    }

    if (selectedType === 'entity') {
      const entity = entities.find(e => e.id === selectedId);
      if (!entity) return null;

      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="font-bold text-lg text-gray-800">Editar Entidade</h3>
             <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input 
              type="text" 
              value={entity.title} 
              onChange={(e) => setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, title: e.target.value} : ent))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Explicação para Leigos</label>
            <textarea 
              value={entity.description || ''} 
              rows={4}
              placeholder="Descreva em linguagem simples o que esta tabela faz..."
              onChange={(e) => setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, description: e.target.value} : ent))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cor</label>
            <select 
              value={entity.colorScheme} 
              onChange={(e) => setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, colorScheme: e.target.value as ColorScheme} : ent))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            >
              <option value="blue">Azul</option>
              <option value="orange">Laranja</option>
              <option value="green">Verde</option>
              <option value="pink">Rosa</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Atributos</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {entity.attributes.map((attr, idx) => (
                <div key={attr.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                  <input 
                    className="w-1/3 text-xs border p-1 rounded" 
                    value={attr.name} 
                    onChange={(e) => {
                       const newAttrs = [...entity.attributes];
                       newAttrs[idx].name = e.target.value;
                       setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, attributes: newAttrs} : ent));
                    }}
                  />
                  <input 
                    className="w-1/4 text-xs border p-1 rounded" 
                    value={attr.type} 
                    onChange={(e) => {
                       const newAttrs = [...entity.attributes];
                       newAttrs[idx].type = e.target.value;
                       setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, attributes: newAttrs} : ent));
                    }}
                  />
                  <input 
                    type="checkbox" 
                    checked={attr.isKey} 
                    onChange={(e) => {
                       const newAttrs = [...entity.attributes];
                       newAttrs[idx].isKey = e.target.checked;
                       setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, attributes: newAttrs} : ent));
                    }}
                  />
                  <button 
                    onClick={() => {
                       const newAttrs = entity.attributes.filter(a => a.id !== attr.id);
                       setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, attributes: newAttrs} : ent));
                    }}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >×</button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                const newAttr: Attribute = { id: generateId(), name: 'Novo', type: 'varchar', isKey: false };
                setEntities(prev => prev.map(ent => ent.id === entity.id ? {...ent, attributes: [...ent.attributes, newAttr]} : ent));
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + Adicionar Atributo
            </button>
          </div>
          
          <div className="pt-4 border-t">
             <button onClick={handleDeleteEntity} className="w-full bg-red-100 text-red-700 p-2 rounded hover:bg-red-200">Excluir Entidade</button>
          </div>
        </div>
      );
    }

    if (selectedType === 'relationship') {
      const rel = relationships.find(r => r.id === selectedId);
      if (!rel) return null;
      return (
        <div className="space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="font-bold text-lg text-gray-800">Editar Relação</h3>
             <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rótulo</label>
            <input 
              type="text" 
              value={rel.label} 
              onChange={(e) => setRelationships(prev => prev.map(r => r.id === rel.id ? {...r, label: e.target.value} : r))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Explicação para Leigos</label>
             <textarea 
              value={rel.description || ''} 
              rows={4}
              placeholder="Explique como essas duas coisas se conectam na vida real..."
              onChange={(e) => setRelationships(prev => prev.map(r => r.id === rel.id ? {...r, description: e.target.value} : r))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">De (Entidade)</label>
            <select 
              value={rel.from} 
              onChange={(e) => setRelationships(prev => prev.map(r => r.id === rel.id ? {...r, from: e.target.value} : r))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            >
              {entities.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Para (Entidade)</label>
            <select 
              value={rel.to} 
              onChange={(e) => setRelationships(prev => prev.map(r => r.id === rel.id ? {...r, to: e.target.value} : r))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            >
              {entities.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div>
                <label className="block text-xs font-bold text-gray-500">Card. Origem</label>
                <select 
                    value={rel.cardFrom[0] || 'one'}
                    onChange={(e) => setRelationships(prev => prev.map(r => r.id === rel.id ? {...r, cardFrom: [e.target.value as CardinalityType]} : r))}
                    className="w-full border p-1 rounded"
                >
                    <option value="zero">Zero (0)</option>
                    <option value="one">Um (1)</option>
                    <option value="many">Muitos (N)</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500">Card. Destino</label>
                <select 
                    value={rel.cardTo[0] || 'many'}
                    onChange={(e) => setRelationships(prev => prev.map(r => r.id === rel.id ? {...r, cardTo: [e.target.value as CardinalityType]} : r))}
                    className="w-full border p-1 rounded"
                >
                    <option value="zero">Zero (0)</option>
                    <option value="one">Um (1)</option>
                    <option value="many">Muitos (N)</option>
                </select>
             </div>
          </div>
          <div className="pt-4 border-t">
             <button onClick={handleDeleteRelationship} className="w-full bg-red-100 text-red-700 p-2 rounded hover:bg-red-200">Excluir Relação</button>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col font-sans h-screen">
      <header className="w-full bg-white shadow-sm p-4 z-10 shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 rounded-lg text-blue-700 font-bold">COFRY</div>
             <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Diagrama Entidade-Relacionamento</h1>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {/* PAN TOOL TOGGLE */}
            <button
              onClick={() => setIsPanMode(!isPanMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow transition text-sm ${isPanMode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              title="Clique e arraste para mover o diagrama inteiro"
            >
               <span>🖐️ Mover</span>
            </button>

            {/* ZOOM CONTROLS */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 border">
                <button onClick={handleZoomOut} className="px-3 py-1 hover:bg-gray-200 rounded text-gray-600 font-bold" title="Zoom Out">-</button>
                <span className="px-2 text-xs text-gray-500 w-12 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} className="px-3 py-1 hover:bg-gray-200 rounded text-gray-600 font-bold" title="Zoom In">+</button>
                <button onClick={handleResetView} className="px-2 py-1 ml-1 hover:bg-gray-200 rounded text-gray-500 text-xs" title="Reset View">R</button>
            </div>

            {/* EXPLANATION TOGGLE */}
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow transition text-sm ${showExplanations ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
               <span>💡 Explicação</span>
            </button>

            {/* SQL IMPORT/EXPORT */}
            <button
              onClick={() => setIsSQLModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow transition text-sm bg-violet-600 text-white hover:bg-violet-700`}
            >
               <span>💾 SQL</span>
            </button>

            {/* EDIT TOGGLE */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow transition ${isEditMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
            >
              {isEditMode ? '✎ Editando' : '👁️ Visualizando'}
            </button>

            {/* VIEW MODE TOGGLE */}
            <div className="bg-gray-200 rounded-lg p-1 flex">
                <button
                    onClick={() => setIsChenView(false)}
                    className={`px-3 py-1.5 text-sm rounded transition ${!isChenView ? 'bg-white shadow text-blue-900 font-medium' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    Tabela
                </button>
                <button
                    onClick={() => setIsChenView(true)}
                    className={`px-3 py-1.5 text-sm rounded transition ${isChenView ? 'bg-white shadow text-blue-900 font-medium' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    Chen
                </button>
            </div>

            <button
              onClick={handleDownloadJPG}
              className="px-3 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition text-sm flex items-center gap-1"
            >
              <span>⬇ JPG</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        {/* DIAGRAM AREA */}
        <div className={`flex-1 overflow-auto bg-slate-100 relative ${isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
            <div className="min-w-[100%] min-h-[100%] flex items-center justify-center p-10">
                {isChenView ? (
                    <ERDiagramChen 
                        entities={entities} 
                        relationships={relationships} 
                        onSelect={handleSelect}
                        onEntityUpdate={handleUpdateEntityPos}
                        zoomScale={scale}
                        pan={pan}
                        setPan={setPan}
                        isPanMode={isPanMode}
                        showExplanations={showExplanations}
                    /> 
                ) : (
                    <ERDiagram 
                        entities={entities} 
                        relationships={relationships} 
                        onEntityUpdate={handleUpdateEntityPos}
                        onSelect={handleSelect}
                        zoomScale={scale}
                        pan={pan}
                        setPan={setPan}
                        isPanMode={isPanMode}
                        showExplanations={showExplanations}
                    />
                )}
            </div>
        </div>

        {/* EDITOR SIDEBAR */}
        {isEditMode && (
            <div className="w-80 bg-white shadow-2xl border-l overflow-y-auto p-6 z-20 shrink-0 absolute right-0 top-0 bottom-0 h-full transition-transform">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Editor</h2>
            {renderEditor()}
            </div>
        )}
      </main>

      {/* SQL MODAL */}
      {isSQLModalOpen && (
          <SQLModal 
            isOpen={isSQLModalOpen} 
            onClose={() => setIsSQLModalOpen(false)} 
            entities={entities} 
            relationships={relationships}
            onImport={handleImportData}
          />
      )}
    </div>
  );
};

export default App;
