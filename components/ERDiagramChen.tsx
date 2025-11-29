import React, { useState, MouseEvent, useRef } from 'react';
import { Entity, Relationship, RemoteUser } from '../App';

interface ERDiagramChenProps {
    entities: Entity[];
    relationships: Relationship[];
    onSelect: (id: string, type: 'entity' | 'relationship') => void;
    onEntityUpdate: (id: string, x: number, y: number) => void;
    zoomScale: number;
    pan: { x: number; y: number };
    setPan: (pan: { x: number; y: number }) => void;
    isPanMode: boolean;
    showExplanations: boolean;
    isEditMode: boolean;
    connectingSourceId: string | null;
    isDarkMode: boolean;
    remoteUsers: Record<string, RemoteUser>;
    onMouseMoveBroadcast: (x: number, y: number) => void;
}

interface Point { x: number; y: number; }

// --- HELPER FUNCTIONS ---
const distanceSq = (p1: Point, p2: Point) => Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);

const findClosestAnchors = (anchors1: Point[], anchors2: Point[]): [Point, Point] => {
  let minDistance = Infinity;
  let closestPair: [Point, Point] = [anchors1[0], anchors2[0]];
  for (const p1 of anchors1) {
    for (const p2 of anchors2) {
      const d = distanceSq(p1, p2);
      if (d < minDistance) {
        minDistance = d;
        closestPair = [p1, p2];
      }
    }
  }
  return closestPair;
};

// --- COMPONENTS ---
const Tooltip: React.FC<{ x: number; y: number; title: string; text: string }> = ({ x, y, title, text }) => {
    const width = 280;
    
    return (
        <foreignObject x={x + 15} y={y + 15} width={width} height="300" style={{ pointerEvents: 'none', overflow: 'visible', zIndex: 9999 }}>
            <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-600">
                <h4 className="font-bold text-yellow-400 text-sm mb-1">{title}</h4>
                <p className="text-xs leading-relaxed opacity-90">{text}</p>
            </div>
        </foreignObject>
    )
}

const RemoteCursor: React.FC<{ user: RemoteUser }> = ({ user }) => (
    <g transform={`translate(${user.x}, ${user.y})`} style={{ transition: 'transform 0.1s linear' }}>
        <path d="M0 0 L10 10 L6 11 L9 16 L7 17 L4 12 L0 16 Z" fill={user.color} stroke="white" strokeWidth="1"/>
        <text x="12" y="15" fontSize="10" fill="white" fontWeight="bold" className="select-none" style={{textShadow: '0px 1px 2px rgba(0,0,0,0.5)'}}>
            <tspan fill={user.color} opacity="0.8">■ </tspan>
            {user.name}
        </text>
    </g>
);

const EntityNode: React.FC<{ 
    x: number; 
    y: number; 
    title: string; 
    onClick: () => void;
    onMouseDown: (e: MouseEvent) => void;
    onMouseEnter: (e: MouseEvent) => void;
    onMouseLeave: () => void;
    isPanMode: boolean;
    isDarkMode: boolean;
}> = ({ x, y, title, onClick, onMouseDown, onMouseEnter, onMouseLeave, isPanMode, isDarkMode }) => (
  <g 
    transform={`translate(${x}, ${y})`} 
    onClick={(e) => { e.stopPropagation(); onClick(); }} 
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`${isPanMode ? 'cursor-grab' : 'cursor-grab active:cursor-grabbing'} hover:opacity-80`}
  >
    <rect x="-70" y="-25" width="140" height="50" fill={isDarkMode ? '#1e293b' : '#e0e7ff'} stroke={isDarkMode ? '#3b82f6' : '#a5b4fc'} strokeWidth="2" rx="4" />
    <text y="5" textAnchor="middle" fontWeight="bold" fill={isDarkMode ? '#e0e7ff' : '#312e81'} fontSize="14" className="select-none">{title}</text>
  </g>
);

const AttributeNode: React.FC<{ x: number; y: number; name: string; isKey: boolean; isDarkMode: boolean }> = ({ x, y, name, isKey, isDarkMode }) => (
  <g transform={`translate(${x}, ${y})`}>
    <ellipse cx="0" cy="0" rx="60" ry="20" fill={isDarkMode ? '#334155' : '#f3f4f6'} stroke={isDarkMode ? '#94a3b8' : '#9ca3af'} strokeWidth="1.5" />
    <text y="4" textAnchor="middle" fontSize="11" fill={isDarkMode ? '#f8fafc' : '#1f2937'} style={{ textDecoration: isKey ? 'underline' : 'none' }} className="select-none">{name}</text>
  </g>
);

const RelationshipNode: React.FC<{ 
    x: number; 
    y: number; 
    label: string; 
    onClick: () => void;
    onMouseEnter: (e: MouseEvent) => void;
    onMouseLeave: () => void;
    isDarkMode: boolean;
}> = ({ x, y, label, onClick, onMouseEnter, onMouseLeave, isDarkMode }) => (
  <g 
    transform={`translate(${x}, ${y})`} 
    onClick={(e) => { e.stopPropagation(); onClick(); }} 
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className="cursor-pointer hover:opacity-80"
  >
    <path d="M 0 -35 L 60 0 L 0 35 L -60 0 Z" fill={isDarkMode ? '#450a0a' : '#fecaca'} stroke={isDarkMode ? '#ef4444' : '#f87171'} strokeWidth="2" />
    <text y="4" textAnchor="middle" fontWeight="bold" fill={isDarkMode ? '#fca5a5' : '#7f1d1d'} fontSize="11" className="select-none">{label}</text>
  </g>
);

const ConnectingLine: React.FC<{ x1: number; y1: number; x2: number; y2: number; isDarkMode: boolean }> = ({ x1, y1, x2, y2, isDarkMode }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isDarkMode ? '#64748b' : '#6b7280'} strokeWidth="1.5" />
);

// --- MAIN COMPONENT ---
const ERDiagramChen: React.FC<ERDiagramChenProps> = ({ entities, relationships, onSelect, onEntityUpdate, zoomScale, pan, setPan, isPanMode, showExplanations, isDarkMode, remoteUsers, onMouseMoveBroadcast }) => {
    const [draggedItem, setDraggedItem] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<{ x: number, y: number } | null>(null);
    const [hoveredTip, setHoveredTip] = useState<{ x: number, y: number, title: string, text: string } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const contentRef = useRef<SVGGElement>(null);

    const getSVGPoint = (e: MouseEvent) => {
        const contentGroup = contentRef.current;
        if (!contentGroup || !svgRef.current) return { x: 0, y: 0 };
        const point = svgRef.current.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const ctm = contentGroup.getScreenCTM();
        if (ctm) return point.matrixTransform(ctm.inverse());
        return point;
    };

    const relNodes = relationships.map((rel): (Relationship & { x: number, y: number, fromE: Entity, toE: Entity }) | null => {
        const fromE = entities.find(e => e.id === rel.from);
        const toE = entities.find(e => e.id === rel.to);
        if (!fromE || !toE) return null;

        const x = (fromE.x + toE.x) / 2;
        const y = (fromE.y + toE.y) / 2;
        return { ...rel, x, y, fromE, toE };
    }).filter((r): r is (Relationship & { x: number, y: number, fromE: Entity, toE: Entity }) => r !== null);

    const RADIUS_X = 130;
    const RADIUS_Y = 100;

    const handleMouseDownEntity = (e: MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (isPanMode) {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }
        const point = getSVGPoint(e);
        const entity = entities.find(ent => ent.id === id);
        if (entity) {
             setDraggedItem({ id, offsetX: point.x - entity.x, offsetY: point.y - entity.y });
        }
    };

    const handleMouseDownBg = (e: MouseEvent) => {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        
        const pt = getSVGPoint(e);
        onMouseMoveBroadcast(pt.x, pt.y);

        if (draggedItem && !isPanMode) {
            onEntityUpdate(draggedItem.id, pt.x - draggedItem.offsetX, pt.y - draggedItem.offsetY);
            return;
        }
        if (isPanning && panStart) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setPan({ x: pan.x + dx, y: pan.y + dy });
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setDraggedItem(null);
        setIsPanning(false);
        setPanStart(null);
    };

    // Explanation Logic
    const handleEntityHover = (e: MouseEvent, entity: Entity) => {
        if (!showExplanations) return;
        const pt = getSVGPoint(e);
        const text = entity.description 
            ? entity.description 
            : `Esta tabela guarda dados sobre ${entity.title}.`;
        setHoveredTip({ x: pt.x, y: pt.y, title: entity.title, text });
    };

    const handleRelHover = (e: MouseEvent, rel: Relationship & { fromE: Entity, toE: Entity }) => {
        if (!showExplanations) return;
        const pt = getSVGPoint(e);
        let text = "";
        if (rel.description) {
             text = rel.description;
        } else {
             // Friendly logic
            const isManyFrom = rel.cardFrom.includes('many');
            const isManyTo = rel.cardTo.includes('many');
            
            if (!isManyFrom && isManyTo) {
                 text = `Um(a) ${rel.fromE.title} pode ter múltiplos(as) ${rel.toE.title} associados(as).`;
            } else if (isManyFrom && !isManyTo) {
                // N:1
                 text = `Vários(as) ${rel.fromE.title} se conectam a um(a) único(a) ${rel.toE.title}.`;
            } else {
                text = `A relação ${rel.label} conecta ${rel.fromE.title} e ${rel.toE.title}.`;
            }
        }
        setHoveredTip({ x: pt.x, y: pt.y, title: `Relação: ${rel.label}`, text });
    }

  return (
    <svg 
        ref={svgRef}
        id="er-diagram-svg" 
        width="2000" 
        height="1500" 
        className={`min-w-[2000px] p-4 font-sans shadow-sm ${isDarkMode ? 'bg-transparent' : 'bg-slate-50 border border-slate-200'} ${isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDownBg}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <g ref={contentRef} transform={`translate(${pan.x}, ${pan.y}) scale(${zoomScale})`} transform-origin="0 0">
        
        {/* LINES */}
        {relNodes.map(rel => {
            const fromAnchors = [
                {x: rel.fromE.x, y: rel.fromE.y - 25}, {x: rel.fromE.x, y: rel.fromE.y + 25},
                {x: rel.fromE.x - 70, y: rel.fromE.y}, {x: rel.fromE.x + 70, y: rel.fromE.y}
            ];
            const [p1, p2] = findClosestAnchors(fromAnchors, [{x: rel.x, y: rel.y - 35}, {x: rel.x, y: rel.y + 35}, {x: rel.x - 60, y: rel.y}, {x: rel.x + 60, y: rel.y}]);
            
            const toAnchors = [
                {x: rel.toE.x, y: rel.toE.y - 25}, {x: rel.toE.x, y: rel.toE.y + 25},
                {x: rel.toE.x - 70, y: rel.toE.y}, {x: rel.toE.x + 70, y: rel.toE.y}
            ];
            const [p3, p4] = findClosestAnchors(toAnchors, [{x: rel.x, y: rel.y - 35}, {x: rel.x, y: rel.y + 35}, {x: rel.x - 60, y: rel.y}, {x: rel.x + 60, y: rel.y}]);

            return (
                <React.Fragment key={rel.id}>
                    <ConnectingLine x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} isDarkMode={isDarkMode} />
                    <ConnectingLine x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} isDarkMode={isDarkMode} />
                </React.Fragment>
            )
        })}

        {entities.map(ent => {
            return ent.attributes.map((attr, i) => {
                const angle = (i / ent.attributes.length) * 2 * Math.PI - Math.PI / 2;
                const attrX = ent.x + Math.cos(angle) * RADIUS_X;
                const attrY = ent.y + Math.sin(angle) * RADIUS_Y;
                
                const entAnchors = [
                    {x: ent.x, y: ent.y - 25}, {x: ent.x, y: ent.y + 25},
                    {x: ent.x - 70, y: ent.y}, {x: ent.x + 70, y: ent.y}
                ];
                const [p1, p2] = findClosestAnchors(entAnchors, [{x: attrX, y: attrY}]);
                return <ConnectingLine key={`line-${ent.id}-${attr.id}`} x1={p1.x} y1={p1.y} x2={attrX} y2={attrY} isDarkMode={isDarkMode} />;
            });
        })}

        {/* NODES */}
        {relNodes.map(rel => (
            <RelationshipNode 
                key={rel.id} 
                x={rel.x} 
                y={rel.y} 
                label={rel.label} 
                onClick={() => onSelect(rel.id, 'relationship')} 
                onMouseEnter={(e) => handleRelHover(e, rel)}
                onMouseLeave={() => setHoveredTip(null)}
                isDarkMode={isDarkMode}
            />
        ))}

        {entities.map(ent => (
            <EntityNode 
                key={ent.id} 
                x={ent.x} 
                y={ent.y} 
                title={ent.title} 
                onClick={() => onSelect(ent.id, 'entity')}
                onMouseDown={(e) => handleMouseDownEntity(e, ent.id)}
                onMouseEnter={(e) => handleEntityHover(e, ent)}
                onMouseLeave={() => setHoveredTip(null)}
                isPanMode={isPanMode}
                isDarkMode={isDarkMode}
            />
        ))}

        {entities.map(ent => {
             return ent.attributes.map((attr, i) => {
                const angle = (i / ent.attributes.length) * 2 * Math.PI - Math.PI / 2;
                const attrX = ent.x + Math.cos(angle) * RADIUS_X;
                const attrY = ent.y + Math.sin(angle) * RADIUS_Y;
                return <AttributeNode key={attr.id} x={attrX} y={attrY} name={attr.name} isKey={attr.isKey} isDarkMode={isDarkMode} />
             });
        })}

        {/* REMOTE CURSORS */}
        {Object.values(remoteUsers).map(user => (
            <RemoteCursor key={user.id} user={user} />
        ))}

        {/* TOOLTIP */}
        {showExplanations && hoveredTip && (
             <Tooltip x={hoveredTip.x} y={hoveredTip.y} title={hoveredTip.title} text={hoveredTip.text} />
        )}
      </g>
    </svg>
  );
};

export default ERDiagramChen;