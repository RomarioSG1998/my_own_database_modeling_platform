import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  description?: string; 
}

export interface Relationship {
  id: string;
  from: string; 
  to: string;   
  cardFrom: CardinalityType[];
  cardTo: CardinalityType[];
  label: string;
  description?: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface RemoteUser {
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
}

// --- INITIAL DATA ---
const initialEntities: Entity[] = [
  { 
    id: 'USUARIO', title: 'USUÁRIO', colorScheme: 'orange', x: 675, y: 500,
    description: 'Esta é a peça central. Representa você ou qualquer pessoa que usa o sistema. Todas as finanças, metas e configurações estão ligadas a esta conta.',
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
    description: 'Controla se você paga pelo sistema Premium. Define quais recursos extras do sistema você pode acessar.',
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
    description: 'Os pacotes disponíveis (Ex: Gratuito, Gold, Platinum) e o que cada um oferece.',
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

const commonDataTypes = [
    'INT', 'VARCHAR(255)', 'TEXT', 'DECIMAL(10,2)', 
    'DATE', 'DATETIME', 'BOOLEAN', 'CHAR(1)', 
    'FLOAT', 'DOUBLE', 'BIGINT'
];

const STORAGE_KEY = 'my_own_model_v1';
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

const App: React.FC = () => {
  // --- PERSISTENCE HELPER ---
  const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return fallback;
        const parsed = JSON.parse(stored);
        return parsed[key] !== undefined ? parsed[key] : fallback;
    } catch (e) {
        console.error("Failed to load from storage", e);
        return fallback;
    }
  };

  // --- IDENTITY & ROOM ---
  const [currentUser] = useState(() => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `User ${Math.floor(Math.random() * 1000)}`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));
  const [roomId, setRoomId] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, RemoteUser>>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const ignoreNextBroadcast = useRef(false);

  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => loadFromStorage<boolean>('isAuthenticated', false));
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');

  // --- APP STATE ---
  const [isChenView, setIsChenView] = useState(() => loadFromStorage<boolean>('isChenView', false));
  const [isEditMode, setIsEditMode] = useState(() => loadFromStorage<boolean>('isEditMode', false));
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSQLModalOpen, setIsSQLModalOpen] = useState(false);
  const [showExplanations, setShowExplanations] = useState(() => loadFromStorage<boolean>('showExplanations', false)); 
  const [isDarkMode, setIsDarkMode] = useState(() => loadFromStorage<boolean>('isDarkMode', false));
  const [scale, setScale] = useState(() => loadFromStorage<number>('scale', 1));
  const [pan, setPan] = useState(() => loadFromStorage<{x:number, y:number}>('pan', { x: 0, y: 0 }));
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [entities, setEntities] = useState<Entity[]>(() => loadFromStorage<Entity[]>('entities', initialEntities));
  const [relationships, setRelationships] = useState<Relationship[]>(() => loadFromStorage<Relationship[]>('relationships', initialRelationships));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'entity' | 'relationship' | null>(null);

  // --- CONNECTION STATE ---
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // --- INITIALIZATION & BROADCAST SETUP ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
        setRoomId(room);
    }
  }, []);

  useEffect(() => {
      if (!roomId) return;

      const channelName = `er-diagram-room-${roomId}`;
      const channel = new BroadcastChannel(channelName);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
          const { type, payload, user } = event.data;

          if (user.id === currentUser.id) return; // Ignore own messages

          if (type === 'DATA_UPDATE') {
              ignoreNextBroadcast.current = true;
              setEntities(payload.entities);
              setRelationships(payload.relationships);
              // Small timeout to allow state settle before enabling broadcast again
              setTimeout(() => { ignoreNextBroadcast.current = false; }, 100);
          } else if (type === 'CURSOR_MOVE') {
              setRemoteUsers(prev => ({
                  ...prev,
                  [user.id]: { ...user, x: payload.x, y: payload.y, lastActive: Date.now() }
              }));
          } else if (type === 'SYNC_REQUEST') {
              // New user wants data, send current state
              channel.postMessage({
                  type: 'DATA_UPDATE',
                  payload: { entities, relationships },
                  user: currentUser
              });
          }
      };

      // Request initial data sync when joining
      channel.postMessage({ type: 'SYNC_REQUEST', user: currentUser });

      return () => {
          channel.close();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Re-run only if room ID changes

  // Cleanup inactive users every 5s
  useEffect(() => {
      if (!roomId) return;
      const interval = setInterval(() => {
          const now = Date.now();
          setRemoteUsers(prev => {
              const next = { ...prev };
              let changed = false;
              Object.keys(next).forEach(key => {
                  if (now - (next[key] as any).lastActive > 10000) { // 10s timeout
                      delete next[key];
                      changed = true;
                  }
              });
              return changed ? next : prev;
          });
      }, 5000);
      return () => clearInterval(interval);
  }, [roomId]);


  // --- BROADCAST HELPERS ---
  const broadcastData = useCallback((newEntities: Entity[], newRelationships: Relationship[]) => {
      if (!broadcastChannelRef.current || ignoreNextBroadcast.current) return;
      broadcastChannelRef.current.postMessage({
          type: 'DATA_UPDATE',
          payload: { entities: newEntities, relationships: newRelationships },
          user: currentUser
      });
  }, [currentUser]);

  const broadcastCursor = useCallback((x: number, y: number) => {
      if (!broadcastChannelRef.current) return;
      broadcastChannelRef.current.postMessage({
          type: 'CURSOR_MOVE',
          payload: { x, y },
          user: currentUser
      });
  }, [currentUser]);


  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    const timer = setTimeout(() => {
        const stateToSave = {
            isAuthenticated,
            isChenView,
            isEditMode,
            showExplanations,
            isDarkMode,
            scale,
            pan,
            entities,
            relationships
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, 500); // Debounce 500ms to avoid thrashing localStorage during drag

    return () => clearTimeout(timer);
  }, [isAuthenticated, isChenView, isEditMode, showExplanations, isDarkMode, scale, pan, entities, relationships]);

  // --- AUTH HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === 'vilmika') {
        setIsAuthenticated(true);
        setAuthError('');
    } else {
        setAuthError('Código de acesso incorreto.');
    }
  };

  // --- CRUD HELPERS ---
  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
  };

  // --- HANDLERS (With Broadcast) ---
  const handleSelect = (id: string, type: 'entity' | 'relationship') => {
    if (isEditMode) {
        // If we are connecting, handle that instead of selecting
        if (connectingSourceId && type === 'entity') {
            if (connectingSourceId === id) {
                setConnectingSourceId(null); 
                return;
            }
            // Create Connection
            const newId = `REL_${generateId()}`;
            const newRel: Relationship = {
                id: newId,
                from: connectingSourceId,
                to: id,
                cardFrom: ['one'],
                cardTo: ['many'],
                label: 'NOVA_REL'
            };
            const nextRels = [...relationships, newRel];
            setRelationships(nextRels);
            broadcastData(entities, nextRels); // Broadcast

            setConnectingSourceId(null);
            setSelectedId(newId);
            setSelectedType('relationship');
            showToast('Relação criada com sucesso!', 'success');
            return;
        }

        setSelectedId(id);
        setSelectedType(type);
    } else {
        setSelectedId(null);
        setSelectedType(null);
    }
  };

  const handleConnectStart = (id: string) => {
      setConnectingSourceId(id);
      showToast('Selecione outra tabela para conectar.', 'info');
  };

  const handleUpdateEntityPos = (id: string, x: number, y: number) => {
    const nextEntities = entities.map(e => e.id === id ? { ...e, x, y } : e);
    setEntities(nextEntities);
    broadcastData(nextEntities, relationships); // Broadcast
  };

  const handleAddEntity = () => {
    const newId = `ENT_${generateId()}`;
    const newEntity: Entity = {
      id: newId,
      title: 'NOVA_TABELA',
      colorScheme: 'blue',
      // Center new entity in view
      x: (window.innerWidth / 2 - pan.x) / scale - 125,
      y: (window.innerHeight / 2 - pan.y) / scale - 50,
      attributes: [{ id: generateId(), name: 'ID', type: 'INT', isKey: true }],
      description: 'Nova entidade criada. Edite para descrever sua função.'
    };
    const nextEntities = [...entities, newEntity];
    setEntities(nextEntities);
    broadcastData(nextEntities, relationships); // Broadcast

    showToast('Entidade criada!', 'success');
    if (isEditMode) handleSelect(newId, 'entity');
  };

  const handleDeleteEntity = () => {
    if (!selectedId || selectedType !== 'entity') return;
    const nextRels = relationships.filter(r => r.from !== selectedId && r.to !== selectedId);
    const nextEntities = entities.filter(e => e.id !== selectedId);
    setRelationships(nextRels);
    setEntities(nextEntities);
    broadcastData(nextEntities, nextRels); // Broadcast

    setSelectedId(null);
    showToast('Entidade removida.', 'info');
  };

  const handleAddRelationship = () => {
    // Deprecated via UI but kept for safety
    if (entities.length < 2) return alert("Precisa de pelo menos 2 entidades.");
  };

  const handleDeleteRelationship = () => {
    if (!selectedId || selectedType !== 'relationship') return;
    const nextRels = relationships.filter(r => r.id !== selectedId);
    setRelationships(nextRels);
    broadcastData(entities, nextRels); // Broadcast
    setSelectedId(null);
    showToast('Relação removida.', 'info');
  };

  const handleImportData = (newEntities: Entity[], newRelationships: Relationship[]) => {
      setEntities(newEntities);
      setRelationships(newRelationships);
      broadcastData(newEntities, newRelationships); // Broadcast
      setIsSQLModalOpen(false);
      setScale(0.8);
      setPan({x: 0, y: 0});
      showToast('Diagrama importado com sucesso!', 'success');
  };

  const handleClearDiagram = () => {
    if (window.confirm("Tem certeza que deseja limpar todo o diagrama? Essa ação removerá todas as entidades e relações e não pode ser desfeita.")) {
      setEntities([]);
      setRelationships([]);
      broadcastData([], []); // Broadcast
      setSelectedId(null);
      setSelectedType(null);
      setScale(1);
      setPan({ x: 0, y: 0 });
      setIsEditMode(true);
      showToast('Diagrama limpo.', 'info');
    }
  };

  // --- LIVE MODE ACTIONS ---
  const handleLiveMode = () => {
      if (roomId) {
          navigator.clipboard.writeText(window.location.href);
          showToast('Você já está ao vivo! Link copiado.', 'success');
      } else {
          const newRoomId = Math.random().toString(36).substr(2, 6);
          const url = new URL(window.location.href);
          url.searchParams.set('room', newRoomId);
          window.history.pushState({}, '', url.toString());
          setRoomId(newRoomId);
          navigator.clipboard.writeText(url.toString());
          showToast('Modo Live Ativado! Link copiado para a área de transferência.', 'success');
      }
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
      showToast("Erro ao encontrar diagrama.", 'error');
      return;
    }
    showToast("Gerando imagem...", 'info');
    const canvas = document.createElement('canvas');
    canvas.width = 1600; 
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1600, 1200); 
      URL.revokeObjectURL(url);
      const jpgUrl = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = jpgUrl;
      link.download = `diagrama-er-my-own-model-${isDarkMode ? 'dark' : 'light'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Download iniciado!", 'success');
    };
    img.src = url;
  };

  // --- HELPER FOR REORDERING (With Broadcast) ---
  const moveAttribute = (entityId: string, attrIndex: number, direction: 'up' | 'down') => {
      const nextEntities = entities.map(ent => {
          if (ent.id !== entityId) return ent;
          const newAttrs = [...ent.attributes];
          if (direction === 'up') {
              if (attrIndex === 0) return ent;
              [newAttrs[attrIndex], newAttrs[attrIndex - 1]] = [newAttrs[attrIndex - 1], newAttrs[attrIndex]];
          } else {
              if (attrIndex === ent.attributes.length - 1) return ent;
              [newAttrs[attrIndex], newAttrs[attrIndex + 1]] = [newAttrs[attrIndex + 1], newAttrs[attrIndex]];
          }
          return { ...ent, attributes: newAttrs };
      });
      setEntities(nextEntities);
      broadcastData(nextEntities, relationships);
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedId) {
                if (selectedType === 'entity') handleDeleteEntity();
                if (selectedType === 'relationship') handleDeleteRelationship();
            }
        }
        if (e.key === 'Escape') {
            setSelectedId(null);
            setSelectedType(null);
            setConnectingSourceId(null);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedType, entities, relationships]); // deps updated for handlers


  // --- EDITOR RENDER (Update to use broadcast wrappers) ---
  const handleEntityTitleChange = (id: string, val: string) => {
      const next = entities.map(ent => ent.id === id ? {...ent, title: val.toUpperCase()} : ent);
      setEntities(next);
      broadcastData(next, relationships);
  }

  const handleEntityDescChange = (id: string, val: string) => {
      const next = entities.map(ent => ent.id === id ? {...ent, description: val} : ent);
      setEntities(next);
      broadcastData(next, relationships);
  }

  const handleEntityColorChange = (id: string, val: ColorScheme) => {
      const next = entities.map(ent => ent.id === id ? {...ent, colorScheme: val} : ent);
      setEntities(next);
      broadcastData(next, relationships);
  }
  
  const handleAttributeUpdate = (entId: string, newAttrs: Attribute[]) => {
      const next = entities.map(ent => ent.id === entId ? {...ent, attributes: newAttrs} : ent);
      setEntities(next);
      broadcastData(next, relationships);
  }

  const handleRelUpdate = (relId: string, updates: Partial<Relationship>) => {
      const next = relationships.map(r => r.id === relId ? {...r, ...updates} : r);
      setRelationships(next);
      broadcastData(entities, next);
  }

  const renderEditor = () => {
    if (!isEditMode) return null;

    if (!selectedId) {
      return (
        <div className={`text-center mt-10 px-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <div className="text-4xl mb-3">🛠️</div>
          <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Editor Vazio</p>
          <p className="text-sm mt-1">Selecione um item no diagrama para ver seus detalhes.</p>
          
          <div className="flex flex-col gap-2 mt-6">
            <button onClick={handleAddEntity} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg transition-transform hover:scale-[1.02]">
                + Nova Entidade
            </button>
          </div>
          <div className={`mt-8 text-xs text-left p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              <p className="font-bold mb-1">Dicas Rápidas:</p>
              <ul className="list-disc pl-4 space-y-1">
                  <li>Clique no ícone ⚡ em uma tabela para conectar com outra.</li>
                  <li>Use <kbd className={`px-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>Delete</kbd> para remover itens.</li>
                  <li>Use <kbd className={`px-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>Esc</kbd> para cancelar seleção.</li>
              </ul>
          </div>
        </div>
      );
    }

    if (selectedType === 'entity') {
      const entity = entities.find(e => e.id === selectedId);
      if (!entity) return null;

      const inputClass = `w-full rounded-lg border p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'border-gray-300'}`;
      const labelClass = `block text-xs font-bold uppercase tracking-wide mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`;

      return (
        <div className="space-y-5">
          <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-700' : ''}`}>
             <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Editar Entidade</h3>
             <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">✕</button>
          </div>
          <div>
            <label className={labelClass}>Nome da Tabela</label>
            <input 
              type="text" 
              value={entity.title} 
              onChange={(e) => handleEntityTitleChange(entity.id, e.target.value)}
              className={`${inputClass} font-mono uppercase`}
            />
          </div>
          <div>
            <label className={labelClass}>Explicação</label>
            <textarea 
              value={entity.description || ''} 
              rows={3}
              placeholder="Descreva a função desta tabela..."
              onChange={(e) => handleEntityDescChange(entity.id, e.target.value)}
              className={`${inputClass} text-sm`}
            />
          </div>
          <div>
            <label className={labelClass}>Cor do Tema</label>
            <div className="flex gap-2">
                {['blue', 'orange', 'green', 'pink'].map((c) => (
                    <button 
                        key={c}
                        onClick={() => handleEntityColorChange(entity.id, c as ColorScheme)}
                        className={`w-8 h-8 rounded-full border-2 ${entity.colorScheme === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c === 'blue' ? '#c7d2fe' : c === 'orange' ? '#fed7aa' : c === 'green' ? '#bbf7d0' : '#fbcfe8'}}
                    />
                ))}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-end mb-2">
                <label className={labelClass}>Atributos</label>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {entity.attributes.map((attr, idx) => (
                <div key={attr.id} className={`flex gap-1 items-center p-2 rounded-lg border shadow-sm group hover:border-blue-300 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
                  <div className="flex flex-col gap-0.5 mr-1">
                      <button onClick={() => moveAttribute(entity.id, idx, 'up')} className="text-gray-400 hover:text-blue-600 leading-none">▲</button>
                      <button onClick={() => moveAttribute(entity.id, idx, 'down')} className="text-gray-400 hover:text-blue-600 leading-none">▼</button>
                  </div>
                  <input 
                    className={`w-1/3 text-xs border p-1.5 rounded outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 focus:bg-white'}`}
                    value={attr.name} 
                    placeholder="Nome"
                    onChange={(e) => {
                       const newAttrs = [...entity.attributes];
                       newAttrs[idx].name = e.target.value;
                       handleAttributeUpdate(entity.id, newAttrs);
                    }}
                  />
                  <input 
                    className={`w-1/3 text-xs border p-1.5 rounded outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 focus:bg-white'}`}
                    value={attr.type} 
                    list={`types-${entity.id}`}
                    placeholder="Tipo"
                    onChange={(e) => {
                       const newAttrs = [...entity.attributes];
                       newAttrs[idx].type = e.target.value;
                       handleAttributeUpdate(entity.id, newAttrs);
                    }}
                  />
                  <datalist id={`types-${entity.id}`}>
                      {commonDataTypes.map(t => <option key={t} value={t} />)}
                  </datalist>

                  <div className="flex flex-col items-center px-1">
                    <input 
                        type="checkbox" 
                        className="accent-blue-600 h-4 w-4"
                        checked={attr.isKey} 
                        onChange={(e) => {
                            const newAttrs = [...entity.attributes];
                            newAttrs[idx].isKey = e.target.checked;
                            handleAttributeUpdate(entity.id, newAttrs);
                        }}
                    />
                    <span className="text-[8px] font-bold text-gray-500 mt-0.5">PK</span>
                  </div>
                  
                  <button 
                    onClick={() => {
                       const newAttrs = entity.attributes.filter(a => a.id !== attr.id);
                       handleAttributeUpdate(entity.id, newAttrs);
                    }}
                    className="text-gray-300 hover:text-red-500 p-1"
                  >✕</button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                const newAttr: Attribute = { id: generateId(), name: 'novo_campo', type: 'VARCHAR(100)', isKey: false };
                handleAttributeUpdate(entity.id, [...entity.attributes, newAttr]);
              }}
              className={`mt-3 w-full py-2 border-2 border-dashed rounded-lg font-medium transition-colors text-sm ${isDarkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-slate-500' : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400'}`}
            >
              + Adicionar Atributo
            </button>
          </div>
          
          <div className="pt-4 mt-auto">
             <button onClick={handleDeleteEntity} className={`w-full p-3 rounded-lg font-bold text-sm transition-colors border ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100'}`}>
                 Excluir Entidade
             </button>
          </div>
        </div>
      );
    }

    if (selectedType === 'relationship') {
      const rel = relationships.find(r => r.id === selectedId);
      if (!rel) return null;
      
      const inputClass = `w-full rounded-lg border p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-gray-300'}`;
      const labelClass = `block text-xs font-bold uppercase tracking-wide mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`;

      return (
        <div className="space-y-5">
           <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-700' : ''}`}>
             <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Editar Relação</h3>
             <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">✕</button>
          </div>
          
          {/* Visual Representation */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-xs font-bold truncate max-w-[80px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entities.find(e => e.id === rel.from)?.title}</span>
              <div className="h-px bg-slate-400 flex-1 mx-2 relative">
                  <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1 rounded ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{rel.label}</span>
              </div>
              <span className={`text-xs font-bold truncate max-w-[80px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entities.find(e => e.id === rel.to)?.title}</span>
          </div>

          <div>
            <label className={labelClass}>Rótulo (Verbo)</label>
            <input 
              type="text" 
              value={rel.label} 
              onChange={(e) => handleRelUpdate(rel.id, { label: e.target.value.toUpperCase() })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Explicação</label>
             <textarea 
              value={rel.description || ''} 
              rows={4}
              placeholder="Explique a conexão..."
              onChange={(e) => handleRelUpdate(rel.id, { description: e.target.value })}
              className={`${inputClass} text-sm`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className={labelClass}>Origem</label>
                <select 
                    value={rel.cardFrom[0] || 'one'}
                    onChange={(e) => handleRelUpdate(rel.id, { cardFrom: [e.target.value as CardinalityType] })}
                    className={`${inputClass} bg-white`}
                >
                    <option value="zero">Zero (0)</option>
                    <option value="one">Um (1)</option>
                    <option value="many">Muitos (N)</option>
                </select>
             </div>
             <div>
                <label className={labelClass}>Destino</label>
                <select 
                    value={rel.cardTo[0] || 'many'}
                    onChange={(e) => handleRelUpdate(rel.id, { cardTo: [e.target.value as CardinalityType] })}
                    className={`${inputClass} bg-white`}
                >
                    <option value="zero">Zero (0)</option>
                    <option value="one">Um (1)</option>
                    <option value="many">Muitos (N)</option>
                </select>
             </div>
          </div>
          <div className="pt-4">
             <button onClick={handleDeleteRelationship} className={`w-full p-3 rounded-lg font-bold text-sm transition-colors border ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100'}`}>
                 Excluir Relação
             </button>
          </div>
        </div>
      )
    }
  };

  // --- RENDERING LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
        <div className={`min-h-screen flex items-center justify-center px-4 font-sans ${isDarkMode ? 'bg-slate-900 bg-dot-grid-dark' : 'bg-slate-100 bg-dot-grid'}`}>
            <div className={`p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <div className="text-center mb-8 mt-4">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold mb-2">My own model</h1>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sistema protegido por <strong>Romário Galdino</strong>.
                        <br />
                        Insira o código de autorização.
                    </p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="password" 
                        className={`w-full border rounded-xl shadow-sm p-4 text-center tracking-widest text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500' : 'border-gray-300 focus:border-blue-500'}`}
                        placeholder="•••••••"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                    />
                    
                    {authError && (
                        <div className="text-center text-red-600 text-sm font-medium bg-red-50 p-2 rounded-lg">
                            {authError}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className={`w-full p-3 rounded-xl font-bold transition transform active:scale-95 shadow-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                    >
                        Desbloquear
                    </button>
                </form>
                
                <div className="mt-4 flex justify-center">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-xs opacity-50 hover:opacity-100">
                        {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 pointer-events-none">
        <div className="max-w-[1920px] mx-auto flex justify-between items-start">
          <div className="flex flex-col pointer-events-auto">
             <div className="flex items-center gap-2">
                 <span className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>My own model</span>
                 <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Beta</span>
                 {roomId && (
                     <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse flex items-center gap-1">
                         <span className="w-2 h-2 rounded-full bg-red-500 block"></span> Live
                     </span>
                 )}
             </div>
             <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Modelagem de Dados</p>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
             <button onClick={() => setIsSQLModalOpen(true)} className={`border shadow-sm p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title="Exportar/Importar SQL">
                💾 <span className="hidden sm:inline text-xs font-bold ml-1">SQL</span>
             </button>
             <button onClick={handleDownloadJPG} className={`border shadow-sm p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} title="Baixar Imagem">
                📷 <span className="hidden sm:inline text-xs font-bold ml-1">JPG</span>
             </button>
             <div className={`w-px mx-1 h-8 self-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
             <button onClick={handleClearDiagram} className={`border shadow-sm p-2 rounded-lg transition ${isDarkMode ? 'bg-slate-800 border-red-900/50 text-red-400 hover:bg-slate-700' : 'bg-white border-red-100 text-red-500 hover:bg-red-50'}`} title="Limpar Tudo">
                🗑️
             </button>
          </div>
        </div>
      </header>
      
      {/* MAIN CANVAS AREA */}
      <main className={`flex-1 flex overflow-hidden relative ${isDarkMode ? 'bg-dot-grid-dark' : 'bg-dot-grid'}`}>
        <div className={`flex-1 overflow-auto relative ${isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
            <div className="min-w-[100%] min-h-[100%] flex items-center justify-center p-0 relative">
                {entities.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
                        <div className={`backdrop-blur p-8 rounded-2xl shadow-xl text-center border pointer-events-auto ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-slate-100'}`}>
                            <div className="text-5xl mb-4">✨</div>
                            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Começar do Zero</h2>
                            <p className={`mt-2 mb-6 max-w-xs mx-auto leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Seu diagrama está limpo. Crie sua primeira entidade para iniciar o modelo.</p>
                            <button 
                                onClick={handleAddEntity} 
                                className="bg-blue-600 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-blue-700 font-bold flex items-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95"
                            >
                                Criar Nova Entidade
                            </button>
                        </div>
                    </div>
                )}
                
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
                        isEditMode={isEditMode}
                        connectingSourceId={connectingSourceId}
                        isDarkMode={isDarkMode}
                        remoteUsers={remoteUsers}
                        onMouseMoveBroadcast={broadcastCursor}
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
                        isEditMode={isEditMode}
                        connectingSourceId={connectingSourceId}
                        onConnectStart={handleConnectStart}
                        isDarkMode={isDarkMode}
                        remoteUsers={remoteUsers}
                        onMouseMoveBroadcast={broadcastCursor}
                    />
                )}
            </div>
        </div>

        {/* EDITOR SIDEBAR */}
        <div className={`absolute right-4 top-20 bottom-24 w-80 backdrop-blur-md shadow-2xl border rounded-2xl overflow-hidden flex flex-col transition-transform duration-300 z-20 ${isEditMode ? 'translate-x-0' : 'translate-x-[120%]'} ${isDarkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-white/50'}`}>
             <div className="p-5 overflow-y-auto h-full custom-scrollbar">
                {renderEditor()}
             </div>
        </div>
      </main>

      {/* FLOATING DOCK (BOTTOM TOOLBAR) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <div className={`backdrop-blur-md shadow-2xl border rounded-2xl p-2 flex items-center gap-4 ${isDarkMode ? 'bg-slate-800/90 border-slate-600' : 'bg-white/90 border-slate-200/60'}`}>
              {/* GROUP 1: VIEWS */}
              <div className={`flex p-1 rounded-xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <button onClick={() => setIsChenView(false)} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${!isChenView ? (isDarkMode ? 'bg-slate-700 text-white shadow' : 'bg-white shadow text-slate-800') : 'text-slate-500 hover:text-slate-800'}`}>Tabela</button>
                  <button onClick={() => setIsChenView(true)} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${isChenView ? (isDarkMode ? 'bg-slate-700 text-white shadow' : 'bg-white shadow text-slate-800') : 'text-slate-500 hover:text-slate-800'}`}>Chen</button>
              </div>

              <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}></div>

              {/* GROUP 2: NAVIGATION */}
              <div className="flex items-center gap-1">
                 <button onClick={() => setIsPanMode(!isPanMode)} className={`p-2 rounded-xl transition ${isPanMode ? 'bg-indigo-100 text-indigo-700' : (isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600')}`} title="Ferramenta de Mover (H)">
                    🖐️
                 </button>
                 <div className={`flex items-center rounded-xl border ml-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                     <button onClick={handleZoomOut} className={`w-8 h-8 flex items-center justify-center rounded-l-xl font-bold ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}>-</button>
                     <span className={`text-[10px] font-mono w-8 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{Math.round(scale * 100)}%</span>
                     <button onClick={handleZoomIn} className={`w-8 h-8 flex items-center justify-center rounded-r-xl font-bold ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}>+</button>
                 </div>
                 <button onClick={handleResetView} className={`p-2 text-xs hover:text-slate-800 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} title="Resetar Visualização">⟲</button>
              </div>

              <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}></div>

              {/* GROUP 3: ACTIONS */}
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditMode(!isEditMode)} 
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${isEditMode ? 'bg-slate-800 text-white shadow-lg' : (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                  >
                      {isEditMode ? '✏️ Editando' : '👁️ Visualizar'}
                  </button>
                  
                  {isEditMode && (
                      <button 
                        onClick={handleAddEntity}
                        className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-center font-bold text-xl transition transform active:scale-95"
                        title="Adicionar Entidade"
                      >
                          +
                      </button>
                  )}
              </div>

              <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}></div>

              {/* GROUP 4: LIVE */}
              <button 
                 onClick={handleLiveMode}
                 className={`p-2 rounded-xl transition flex items-center gap-1 ${roomId ? 'bg-red-100 text-red-600' : (isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400')}`}
                 title={roomId ? "Link Copiado" : "Iniciar Live Collaboration"}
               >
                   📡 {roomId && <span className="text-[10px] font-bold">ON</span>}
               </button>

               <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}></div>
              
              {/* GROUP 5: THEME & HELP */}
               <button 
                 onClick={() => setIsDarkMode(!isDarkMode)}
                 className={`p-2 rounded-xl transition ${isDarkMode ? 'bg-slate-700 text-yellow-300' : 'hover:bg-slate-100 text-slate-400'}`}
                 title="Alternar Tema"
               >
                   {isDarkMode ? '🌙' : '☀️'}
               </button>

               <button 
                 onClick={() => setShowExplanations(!showExplanations)}
                 className={`p-2 rounded-xl transition ${showExplanations ? 'bg-amber-100 text-amber-600' : (isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400')}`}
                 title="Modo Explicação"
               >
                   💡
               </button>
          </div>
      </div>

      {/* TOAST CONTAINER */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 w-full max-w-sm pointer-events-none items-center">
          {toasts.map(toast => (
              <div 
                key={toast.id} 
                className={`animate-slide-in px-4 py-2 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 pointer-events-auto
                    ${toast.type === 'success' ? (isDarkMode ? 'bg-green-900/50 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700') : 
                      toast.type === 'error' ? (isDarkMode ? 'bg-red-900/50 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700') : 
                      (isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-white border-slate-700')}`}
              >
                  <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
                  {toast.message}
              </div>
          ))}
      </div>

      {/* SQL MODAL */}
      {isSQLModalOpen && (
          <SQLModal 
            isOpen={isSQLModalOpen} 
            onClose={() => setIsSQLModalOpen(false)} 
            entities={entities} 
            relationships={relationships}
            onImport={handleImportData}
            isDarkMode={isDarkMode}
          />
      )}
    </div>
  );
};

export default App;