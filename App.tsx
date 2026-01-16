
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

// --- INITIAL DATA (EDUCATIONAL ENGAGEMENT PLATFORM) ---
const initialEntities: Entity[] = [
  { 
    id: 'USERS', title: 'USERS', colorScheme: 'blue', x: 500, y: 250,
    description: 'Tabela central de usuários do sistema. Armazena tanto alunos quanto professores.',
    attributes: [
      { id: 'u1', name: 'id', type: 'SERIAL', isKey: true },
      { id: 'u2', name: 'name', type: 'VARCHAR', isKey: false },
      { id: 'u3', name: 'email', type: 'VARCHAR', isKey: false },
      { id: 'u4', name: 'hashed_password', type: 'VARCHAR', isKey: false },
      { id: 'u5', name: 'role', type: 'VARCHAR', isKey: false },
      { id: 'u6', name: 'ip_address', type: 'VARCHAR', isKey: false },
      { id: 'u7', name: 'created_at', type: 'TIMESTAMPTZ', isKey: false },
      { id: 'u8', name: 'classroom_id', type: 'INTEGER', isKey: false },
      { id: 'u9', name: 'avatar_url', type: 'VARCHAR', isKey: false }
    ]
  },
  { 
    id: 'CLASSROOMS', title: 'CLASSROOMS', colorScheme: 'orange', x: 100, y: 250,
    description: 'Turmas ou Salas de Aula. Cada sala é administrada por um professor.',
    attributes: [
      { id: 'c1', name: 'id', type: 'SERIAL', isKey: true },
      { id: 'c2', name: 'name', type: 'VARCHAR', isKey: false },
      { id: 'c3', name: 'is_active', type: 'BOOLEAN', isKey: false },
      { id: 'c4', name: 'invite_code', type: 'VARCHAR', isKey: false },
      { id: 'c5', name: 'professor_id', type: 'INTEGER', isKey: false }
    ]
  },
  { 
    id: 'ENGAGEMENT_LOGS', title: 'ENGAGEMENT_LOGS', colorScheme: 'green', x: 900, y: 250,
    description: 'Registros detalhados de engajamento. Captura a pontuação de atenção e estado do aluno.',
    attributes: [
      { id: 'eg1', name: 'id', type: 'SERIAL', isKey: true },
      { id: 'eg2', name: 'student_id', type: 'INTEGER', isKey: false },
      { id: 'eg3', name: 'session_id', type: 'INTEGER', isKey: false },
      { id: 'eg4', name: 'timestamp', type: 'TIMESTAMPTZ', isKey: false },
      { id: 'eg5', name: 'state', type: 'VARCHAR', isKey: false },
      { id: 'eg6', name: 'attention_score', type: 'DOUBLE', isKey: false },
      { id: 'eg7', name: 'metrics', type: 'JSON', isKey: false }
    ]
  },
  { 
    id: 'SESSION_LOGS', title: 'SESSION_LOGS', colorScheme: 'pink', x: 100, y: 550,
    description: 'Histórico de sessões iniciadas em cada sala.',
    attributes: [
      { id: 's1', name: 'id', type: 'SERIAL', isKey: true },
      { id: 's2', name: 'classroom_id', type: 'INTEGER', isKey: false },
      { id: 's3', name: 'started_at', type: 'TIMESTAMPTZ', isKey: false },
      { id: 's4', name: 'ended_at', type: 'TIMESTAMPTZ', isKey: false }
    ]
  },
  { 
    id: 'SYSTEM_CONFIG', title: 'SYSTEM_CONFIG', colorScheme: 'blue', x: 900, y: 50,
    description: 'Parâmetros globais do sistema de monitoramento.',
    attributes: [
      { id: 'sc1', name: 'key', type: 'VARCHAR', isKey: true },
      { id: 'sc2', name: 'value', type: 'VARCHAR', isKey: false },
      { id: 'sc3', name: 'description', type: 'VARCHAR', isKey: false }
    ]
  }
];

const initialRelationships: Relationship[] = [
  { id: 'rel_prof', from: 'USERS', to: 'CLASSROOMS', cardFrom: ['one'], cardTo: ['many'], label: 'MINISTRA', description: 'Um professor (USER) ministra várias salas de aula.' },
  { id: 'rel_stud', from: 'CLASSROOMS', to: 'USERS', cardFrom: ['one'], cardTo: ['many'], label: 'MATRICULA', description: 'Uma sala de aula possui diversos alunos matriculados.' },
  { id: 'rel_logs', from: 'USERS', to: 'ENGAGEMENT_LOGS', cardFrom: ['one'], cardTo: ['many'], label: 'GERA', description: 'Cada aluno gera logs de engajamento contínuos.' },
  { id: 'rel_sess', from: 'CLASSROOMS', to: 'SESSION_LOGS', cardFrom: ['one'], cardTo: ['many'], label: 'CONTÉM', description: 'Uma sala de aula agrupa múltiplas sessões de log.' }
];

const commonDataTypes = [
    'INT', 'BIGINT', 'SERIAL', 'VARCHAR(255)', 'TEXT', 
    'BOOLEAN', 'TIMESTAMPTZ', 'DATE', 'DECIMAL(10,2)', 
    'DOUBLE', 'FLOAT', 'JSON', 'UUID'
];

const STORAGE_KEY = 'my_own_model_v4'; // Bumping version to load fresh educational schema
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

const App: React.FC = () => {
  const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return fallback;
        const parsed = JSON.parse(stored);
        return parsed[key] !== undefined ? parsed[key] : fallback;
    } catch (e) {
        return fallback;
    }
  };

  const [currentUser] = useState(() => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `User ${Math.floor(Math.random() * 1000)}`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));
  const [roomId, setRoomId] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, RemoteUser>>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const ignoreNextBroadcast = useRef(false);

  const [isAuthenticated, setIsAuthenticated] = useState(() => loadFromStorage<boolean>('isAuthenticated', false));
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');

  const [isChenView, setIsChenView] = useState(() => loadFromStorage<boolean>('isChenView', false));
  const [isEditMode, setIsEditMode] = useState(() => loadFromStorage<boolean>('isEditMode', false));
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSQLModalOpen, setIsSQLModalOpen] = useState(false);
  const [showExplanations, setShowExplanations] = useState(() => loadFromStorage<boolean>('showExplanations', true)); 
  const [isDarkMode, setIsDarkMode] = useState(() => loadFromStorage<boolean>('isDarkMode', false));
  const [scale, setScale] = useState(() => loadFromStorage<number>('scale', 0.9));
  const [pan, setPan] = useState(() => loadFromStorage<{x:number, y:number}>('pan', { x: 50, y: 50 }));
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [entities, setEntities] = useState<Entity[]>(() => loadFromStorage<Entity[]>('entities', initialEntities));
  const [relationships, setRelationships] = useState<Relationship[]>(() => loadFromStorage<Relationship[]>('relationships', initialRelationships));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'entity' | 'relationship' | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomId(room);
  }, []);

  useEffect(() => {
      if (!roomId) return;
      let channel: BroadcastChannel | null = null;
      try {
        const channelName = `er-diagram-room-${roomId}`;
        channel = new BroadcastChannel(channelName);
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
            const { type, payload, user } = event.data;
            if (user.id === currentUser.id) return;
            if (type === 'DATA_UPDATE') {
                ignoreNextBroadcast.current = true;
                setEntities(payload.entities);
                setRelationships(payload.relationships);
                setTimeout(() => { ignoreNextBroadcast.current = false; }, 100);
            } else if (type === 'CURSOR_MOVE') {
                setRemoteUsers(prev => ({ ...prev, [user.id]: { ...user, x: payload.x, y: payload.y, lastActive: Date.now() } }));
            } else if (type === 'SYNC_REQUEST') {
                channel.postMessage({ type: 'DATA_UPDATE', payload: { entities, relationships }, user: currentUser });
            }
        };
        channel.postMessage({ type: 'SYNC_REQUEST', user: currentUser });
      } catch (e) { console.error(e); }
      return () => { if (channel) channel.close(); };
  }, [roomId, entities, relationships, currentUser]);

  useEffect(() => {
      const timer = setTimeout(() => {
          try {
              const stateToSave = { isAuthenticated, isChenView, isEditMode, showExplanations, isDarkMode, scale, pan, entities, relationships };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
          } catch (e) {}
      }, 500);
      return () => clearTimeout(timer);
  }, [isAuthenticated, isChenView, isEditMode, showExplanations, isDarkMode, scale, pan, entities, relationships]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === 'vilmika') {
        setIsAuthenticated(true);
        setAuthError('');
    } else {
        setAuthError('Código de acesso incorreto.');
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 3000);
  };

  const broadcastData = useCallback((newEntities: Entity[], newRelationships: Relationship[]) => {
      if (!broadcastChannelRef.current || ignoreNextBroadcast.current) return;
      broadcastChannelRef.current.postMessage({ type: 'DATA_UPDATE', payload: { entities: newEntities, relationships: newRelationships }, user: currentUser });
  }, [currentUser]);

  const broadcastCursor = useCallback((x: number, y: number) => {
      if (!broadcastChannelRef.current) return;
      broadcastChannelRef.current.postMessage({ type: 'CURSOR_MOVE', payload: { x, y }, user: currentUser });
  }, [currentUser]);

  const handleSelect = (id: string, type: 'entity' | 'relationship') => {
    if (isEditMode) {
        if (connectingSourceId && type === 'entity') {
            if (connectingSourceId === id) { setConnectingSourceId(null); return; }
            const newId = `REL_${generateId()}`;
            const newRel: Relationship = { id: newId, from: connectingSourceId, to: id, cardFrom: ['one'], cardTo: ['many'], label: 'NOVA_REL' };
            const nextRels = [...relationships, newRel];
            setRelationships(nextRels);
            broadcastData(entities, nextRels);
            setConnectingSourceId(null);
            setSelectedId(newId);
            setSelectedType('relationship');
            showToast('Relação criada!', 'success');
            return;
        }
        setSelectedId(id);
        setSelectedType(type);
    }
  };

  const handleConnectStart = (id: string) => {
      setConnectingSourceId(id);
      showToast('Selecione outra tabela para conectar.', 'info');
  };

  const handleUpdateEntityPos = (id: string, x: number, y: number) => {
    const nextEntities = entities.map(e => e.id === id ? { ...e, x, y } : e);
    setEntities(nextEntities);
    broadcastData(nextEntities, relationships);
  };

  const handleAddEntity = () => {
    const newId = `ENT_${generateId()}`;
    const newEntity: Entity = {
      id: newId, title: 'NOVA_TABELA', colorScheme: 'blue',
      x: (window.innerWidth / 2 - pan.x) / scale - 125,
      y: (window.innerHeight / 2 - pan.y) / scale - 50,
      attributes: [{ id: generateId(), name: 'id', type: 'SERIAL', isKey: true }],
      description: 'Nova entidade criada. Edite os detalhes no painel lateral.'
    };
    const nextEntities = [...entities, newEntity];
    setEntities(nextEntities);
    broadcastData(nextEntities, relationships);
    showToast('Entidade criada!', 'success');
    if (isEditMode) handleSelect(newId, 'entity');
  };

  const handleDeleteEntity = () => {
    if (!selectedId || selectedType !== 'entity') return;
    const nextRels = relationships.filter(r => r.from !== selectedId && r.to !== selectedId);
    const nextEntities = entities.filter(e => e.id !== selectedId);
    setRelationships(nextRels);
    setEntities(nextEntities);
    broadcastData(nextEntities, nextRels);
    setSelectedId(null);
    showToast('Entidade removida.', 'info');
  };

  const handleDeleteRelationship = () => {
    if (!selectedId || selectedType !== 'relationship') return;
    const nextRels = relationships.filter(r => r.id !== selectedId);
    setRelationships(nextRels);
    broadcastData(entities, nextRels);
    setSelectedId(null);
    showToast('Relação removida.', 'info');
  };

  const handleImportData = (newEntities: Entity[], newRelationships: Relationship[]) => {
      setEntities(newEntities);
      setRelationships(newRelationships);
      broadcastData(newEntities, newRelationships);
      setIsSQLModalOpen(false);
      setScale(0.8);
      setPan({x: 50, y: 50});
      showToast('Diagrama importado!', 'success');
  };

  const handleLiveMode = () => {
      if (roomId) {
          navigator.clipboard.writeText(window.location.href);
          showToast('Link da sala copiado!', 'success');
      } else {
          const newRoomId = Math.random().toString(36).substr(2, 6);
          const url = new URL(window.location.href);
          url.searchParams.set('room', newRoomId);
          window.history.pushState({}, '', url.toString());
          setRoomId(newRoomId);
          navigator.clipboard.writeText(url.toString());
          showToast('Modo Live Ativado! Link copiado.', 'success');
      }
  };

  const renderEditor = () => {
    if (!isEditMode) return null;
    if (!selectedId) return (
        <div className="text-center mt-12 px-6">
            <div className="text-5xl mb-4">✨</div>
            <h3 className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Modo de Edição</h3>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Selecione uma tabela ou relação no diagrama para modificar seus atributos e conexões.</p>
            <button onClick={handleAddEntity} className="mt-8 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">+ Nova Tabela</button>
        </div>
    );

    const inputClass = `w-full rounded-xl border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-200'}`;
    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`;

    if (selectedType === 'entity') {
      const entity = entities.find(e => e.id === selectedId);
      if (!entity) return null;
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-2">
              <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Editar Tabela</h3>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div>
            <label className={labelClass}>Nome</label>
            <input type="text" value={entity.title} onChange={(e) => setEntities(entities.map(ent => ent.id === entity.id ? {...ent, title: e.target.value.toUpperCase()} : ent))} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Descrição</label>
            <textarea value={entity.description || ''} onChange={(e) => setEntities(entities.map(ent => ent.id === entity.id ? {...ent, description: e.target.value} : ent))} className={`${inputClass} text-sm`} rows={3} />
          </div>
          <div>
             <label className={labelClass}>Atributos</label>
             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {entity.attributes.map((attr, idx) => (
                    <div key={attr.id} className={`flex gap-2 items-center p-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <input className="w-1/2 text-xs p-1 bg-transparent outline-none" value={attr.name} onChange={(e) => {
                            const next = [...entity.attributes]; next[idx].name = e.target.value;
                            setEntities(entities.map(ent => ent.id === entity.id ? {...ent, attributes: next} : ent));
                        }} />
                        <input className="w-1/3 text-xs p-1 bg-transparent opacity-60" value={attr.type} list="types" onChange={(e) => {
                            const next = [...entity.attributes]; next[idx].type = e.target.value;
                            setEntities(entities.map(ent => ent.id === entity.id ? {...ent, attributes: next} : ent));
                        }} />
                        <input type="checkbox" checked={attr.isKey} onChange={(e) => {
                            const next = [...entity.attributes]; next[idx].isKey = e.target.checked;
                            setEntities(entities.map(ent => ent.id === entity.id ? {...ent, attributes: next} : ent));
                        }} className="accent-blue-600" />
                        <button onClick={() => {
                            const next = entity.attributes.filter(a => a.id !== attr.id);
                            setEntities(entities.map(ent => ent.id === entity.id ? {...ent, attributes: next} : ent));
                        }} className="text-red-400 ml-auto">✕</button>
                    </div>
                ))}
             </div>
             <button onClick={() => {
                 const next = [...entity.attributes, { id: generateId(), name: 'novo_campo', type: 'VARCHAR(255)', isKey: false }];
                 setEntities(entities.map(ent => ent.id === entity.id ? {...ent, attributes: next} : ent));
             }} className="mt-3 w-full border-2 border-dashed border-slate-300 py-2 rounded-xl text-xs font-bold text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all">+ Adicionar Campo</button>
          </div>
          <button onClick={handleDeleteEntity} className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold hover:bg-red-100">Excluir Tabela</button>
          <datalist id="types">{commonDataTypes.map(t => <option key={t} value={t} />)}</datalist>
        </div>
      );
    }
    return null;
  };

  if (!isAuthenticated) return (
    <div className={`h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-900 bg-dot-grid-dark' : 'bg-slate-50 bg-dot-grid'}`}>
        <div className={`p-10 rounded-3xl shadow-2xl max-w-sm w-full ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
            <div className="text-center mb-8">
                <div className="text-6xl mb-6">🔒</div>
                <h1 className="text-2xl font-black mb-2">My own model</h1>
                <p className="text-slate-400 text-sm">Insira o código de acesso para visualizar o diagrama.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)} className={`w-full p-4 rounded-2xl border text-center text-lg tracking-widest ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`} placeholder="••••••" />
                {authError && <p className="text-red-500 text-center text-xs font-bold">{authError}</p>}
                <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">Desbloquear</button>
            </form>
        </div>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <header className="absolute top-0 left-0 right-0 z-30 p-6 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                My own model <span className="bg-blue-600 text-[10px] text-white px-1.5 py-0.5 rounded uppercase">Beta</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Educational Platform Schema</p>
        </div>
        <div className="flex gap-2 pointer-events-auto">
            <button onClick={() => setIsSQLModalOpen(true)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform">💾</button>
            <button onClick={handleLiveMode} className={`p-3 rounded-2xl shadow-sm border transition-all hover:scale-105 ${roomId ? 'bg-red-500 text-white border-red-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>📡</button>
        </div>
      </header>

      <main className={`flex-1 relative flex overflow-hidden ${isDarkMode ? 'bg-dot-grid-dark' : 'bg-dot-grid'}`}>
        <div className="flex-1 overflow-auto relative">
           <div className="min-w-full min-h-full flex items-center justify-center">
                {isChenView ? (
                    <ERDiagramChen entities={entities} relationships={relationships} onSelect={handleSelect} onEntityUpdate={handleUpdateEntityPos} zoomScale={scale} pan={pan} setPan={setPan} isPanMode={isPanMode} showExplanations={showExplanations} isEditMode={isEditMode} connectingSourceId={connectingSourceId} isDarkMode={isDarkMode} remoteUsers={remoteUsers} onMouseMoveBroadcast={broadcastCursor} />
                ) : (
                    <ERDiagram entities={entities} relationships={relationships} onEntityUpdate={handleUpdateEntityPos} onSelect={handleSelect} zoomScale={scale} pan={pan} setPan={setPan} isPanMode={isPanMode} showExplanations={showExplanations} isEditMode={isEditMode} connectingSourceId={connectingSourceId} onConnectStart={handleConnectStart} isDarkMode={isDarkMode} remoteUsers={remoteUsers} onMouseMoveBroadcast={broadcastCursor} />
                )}
           </div>
        </div>

        {isEditMode && (
            <div className={`absolute right-6 top-24 bottom-24 w-80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 overflow-y-auto custom-scrollbar z-20 ${isDarkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
                {renderEditor()}
            </div>
        )}
      </main>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-2 shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1">
              <button onClick={() => setIsChenView(false)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${!isChenView ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600' : 'text-slate-400'}`}>TABELAS</button>
              <button onClick={() => setIsChenView(true)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isChenView ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600' : 'text-slate-400'}`}>CHEN</button>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button onClick={() => setIsEditMode(!isEditMode)} className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
              {isEditMode ? 'EDITANDO' : 'VISUALIZAR'}
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="p-2 text-lg hover:text-blue-500">－</button>
          <span className="text-[10px] font-black w-8 text-center text-slate-400">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-2 text-lg hover:text-blue-500">＋</button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 grayscale hover:grayscale-0">{isDarkMode ? '🌙' : '☀️'}</button>
          <button onClick={() => setShowExplanations(!showExplanations)} className={`p-2 transition-all ${showExplanations ? 'grayscale-0' : 'grayscale'}`}>💡</button>
      </div>

      <SQLModal isOpen={isSQLModalOpen} onClose={() => setIsSQLModalOpen(false)} entities={entities} relationships={relationships} onImport={handleImportData} isDarkMode={isDarkMode} />
      
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 items-center">
          {toasts.map(t => (
              <div key={t.id} className="animate-slide-in px-5 py-2.5 bg-slate-800 text-white text-xs font-black rounded-full shadow-2xl flex items-center gap-2">
                  <span className={t.type === 'success' ? 'text-green-400' : 'text-blue-400'}>●</span> {t.message}
              </div>
          ))}
      </div>
    </div>
  );
};

export default App;
