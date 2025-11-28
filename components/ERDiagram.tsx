import React, { useState, MouseEvent, useRef } from 'react';
import { Entity, Relationship, Attribute, ColorScheme, CardinalityType } from '../App';

interface Point { x: number; y: number; }

interface ERDiagramProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntityUpdate: (id: string, x: number, y: number) => void;
  onSelect: (id: string, type: 'entity' | 'relationship') => void;
  zoomScale: number;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  isPanMode: boolean;
  showExplanations: boolean;
  isEditMode: boolean;
  connectingSourceId: string | null;
  onConnectStart: (id: string) => void;
  isDarkMode: boolean;
}

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

// --- COLOR CONFIG ---
const getColors = (scheme: ColorScheme, isDark: boolean) => {
    if (isDark) {
        const darkColors: Record<ColorScheme, { head: string, body: string, border: string, textHead: string, textBody: string }> = {
          blue: { head: '#1e3a8a', body: '#1e293b', border: '#3b82f6', textHead: '#dbeafe', textBody: '#cbd5e1' },
          orange: { head: '#7c2d12', body: '#2a160c', border: '#f97316', textHead: '#ffedd5', textBody: '#cbd5e1' },
          green: { head: '#14532d', body: '#052e16', border: '#22c55e', textHead: '#dcfce7', textBody: '#cbd5e1' },
          pink: { head: '#831843', body: '#3a0818', border: '#ec4899', textHead: '#fce7f3', textBody: '#cbd5e1' },
        };
        return darkColors[scheme];
    } else {
        const lightColors: Record<ColorScheme, { head: string, body: string, border: string, textHead: string, textBody: string }> = {
          blue: { head: '#c7d2fe', body: '#e0e7ff', border: '#a5b4fc', textHead: '#312e81', textBody: '#1e1b4b' },
          orange: { head: '#fed7aa', body: '#ffedd5', border: '#fdba74', textHead: '#7c2d12', textBody: '#431407' },
          green: { head: '#bbf7d0', body: '#dcfce7', border: '#86efac', textHead: '#14532d', textBody: '#052e16' },
          pink: { head: '#fbcfe8', body: '#fce7f3', border: '#f9a8d4', textHead: '#831843', textBody: '#500724' },
        };
        return lightColors[scheme];
    }
}

// --- SUB COMPONENTS ---

const Tooltip: React.FC<{ x: number; y: number; title: string; text: string }> = ({ x, y, title, text }) => {
    const width = 280;
    
    return (
        <foreignObject x={x + 15} y={y + 15} width={width} height="300" style={{ pointerEvents: 'none', overflow: 'visible' }}>
            <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-600">
                <h4 className="font-bold text-yellow-400 text-sm mb-1">{title}</h4>
                <p className="text-xs leading-relaxed opacity-90">{text}</p>
            </div>
        </foreignObject>
    )
}

const TableEntity: React.FC<{ 
  entity: Entity;
  onMouseDown: (e: MouseEvent) => void;
  onClick: (e: MouseEvent) => void;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: () => void;
  isPanMode: boolean;
  isEditMode: boolean;
  onConnectStart: (e: MouseEvent) => void;
  isConnecting: boolean;
  isDarkMode: boolean;
}> = ({ entity, onMouseDown, onClick, onMouseEnter, onMouseLeave, isPanMode, isEditMode, onConnectStart, isConnecting, isDarkMode }) => {
  const { x, y, title, attributes, colorScheme } = entity;
  const rowHeight = 22; const headerHeight = 28; const width = 250;
  const totalHeight = headerHeight + attributes.length * rowHeight;
  const colWidths = { type: 80, name: 130, key: 40 };
  const c = getColors(colorScheme, isDarkMode);

  const cursorClass = isPanMode ? 'cursor-grab' : (isConnecting ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing');

  return (
    <g 
        transform={`translate(${x}, ${y})`} 
        onMouseDown={onMouseDown} 
        onClick={onClick} 
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`select-none ${cursorClass} hover:opacity-90 transition-opacity`}
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" /><feOffset dx="2" dy="2" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width={width} height={totalHeight} fill={c.body} stroke={c.border} strokeWidth={isConnecting ? 3 : 1} strokeDasharray={isConnecting ? "5,5" : "0"} filter="url(#shadow)" />
      <rect x="0" y="0" width={width} height={headerHeight} fill={c.head} />
      <text x={width / 2} y={headerHeight / 2 + 5} textAnchor="middle" fontWeight="bold" fill={c.textHead} fontSize="14">{title}</text>
      
      {/* Link Handle for Drag-to-Connect */}
      {isEditMode && !isConnecting && (
          <g 
            transform={`translate(${width - 25}, 4)`} 
            onClick={(e) => { e.stopPropagation(); onConnectStart(e); }}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
              <circle cx="10" cy="10" r="8" fill={isDarkMode ? c.body : 'white'} stroke={c.textHead} strokeWidth="1" />
              <text x="10" y="14" textAnchor="middle" fontSize="12">⚡</text>
          </g>
      )}

      {attributes.map((attr, i) => (
        <g key={attr.id} transform={`translate(0, ${headerHeight + i * rowHeight})`}>
          <line x1="0" y1={rowHeight} x2={width} y2={rowHeight} stroke={c.border} />
          <text x="5" y="16" fontSize="12" fill={c.textBody} opacity="0.8">{attr.type}</text>
          <text x={colWidths.type + 5} y="16" fontSize="12" fill={c.textBody}>{attr.name}</text>
          {attr.isKey && (<text x={colWidths.type + colWidths.name + 5} y="16" fontSize="11" fontWeight="bold" fill={c.textHead}>PK</text>)}
        </g>
      ))}
      <rect x="0" y="0" width={width} height={totalHeight} fill="none" stroke={c.border} strokeWidth="1.5" />
      <line x1={colWidths.type} y1={headerHeight} x2={colWidths.type} y2={totalHeight} stroke={c.border} />
      <line x1={colWidths.type + colWidths.name} y1={headerHeight} x2={colWidths.type + colWidths.name} y2={totalHeight} stroke={c.border} />
    </g>
  );
};

const Cardinality = ({ types, point, fromPoint, strokeColor }: { types: CardinalityType[], point: Point, fromPoint: Point, strokeColor: string }) => {
    const angle = Math.atan2(point.y - fromPoint.y, point.x - fromPoint.x);
    const degrees = angle * 180 / Math.PI;
    const transform = `translate(${point.x}, ${point.y}) rotate(${degrees})`;

    let offset = 2;
    const symbolElements = [];

    if (types.includes('zero')) {
        symbolElements.push(<circle key="zero" cx={-offset - 4} cy="0" r="4" fill="white" stroke={strokeColor} strokeWidth="1.5"/>);
        offset += 10;
    }
    if (types.includes('one')) {
        symbolElements.push(<line key="one" x1={-offset} y1="-7" x2={-offset} y2="7" stroke={strokeColor} strokeWidth="1.5" />);
        offset += 4;
    }
    if (types.includes('many')) {
        symbolElements.push(
            <g key="many">
                <line x1={-offset} y1="0" x2={-offset-8} y2="-7" stroke={strokeColor} strokeWidth="1.5" />
                <line x1={-offset} y1="0" x2={-offset-8} y2="7" stroke={strokeColor} strokeWidth="1.5" />
            </g>
        );
    }
    return <g transform={transform}>{symbolElements}</g>;
};

const ConnectingLine: React.FC<{
    from: Point, 
    to: Point, 
    onClick: (e: MouseEvent) => void,
    onMouseEnter: (e: MouseEvent) => void,
    onMouseLeave: () => void,
    strokeColor: string
}> = ({ from, to, onClick, onMouseEnter, onMouseLeave, strokeColor }) => (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} className="cursor-pointer group">
        {/* Invisible wider line for easier hover */}
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="15" />
        {/* Visible line */}
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={strokeColor} strokeWidth="2" fill="none" className="group-hover:stroke-blue-500 transition-colors" />
    </g>
);

const ERDiagram: React.FC<ERDiagramProps> = ({ entities, relationships, onEntityUpdate, onSelect, zoomScale, pan, setPan, isPanMode, showExplanations, isEditMode, connectingSourceId, onConnectStart, isDarkMode }) => {
    const [draggedItem, setDraggedItem] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<{ x: number, y: number } | null>(null);
    const [hoveredTip, setHoveredTip] = useState<{ x: number, y: number, title: string, text: string } | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    
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

    const handleMouseDownEntity = (e: MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();

        // If in connecting mode, clicking an entity (other than source) completes connection
        if (connectingSourceId) {
            onSelect(id, 'entity'); // This triggers logic in App.tsx to link entities
            return;
        }

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
        
        // Track mouse for connection line
        if (connectingSourceId) {
            setMousePos(getSVGPoint(e));
        }

        if (draggedItem && !isPanMode && !connectingSourceId) {
            const point = getSVGPoint(e);
            onEntityUpdate(draggedItem.id, point.x - draggedItem.offsetX, point.y - draggedItem.offsetY);
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

    const handleEntityHover = (e: MouseEvent, entity: Entity) => {
        if (!showExplanations) return;
        const pt = getSVGPoint(e);
        const text = entity.description 
            ? entity.description 
            : `Tabela responsável por armazenar informações de ${entity.title.toLowerCase()}.`;
        
        setHoveredTip({ x: pt.x, y: pt.y, title: entity.title, text });
    };

    const handleRelHover = (e: MouseEvent, rel: Relationship) => {
        if (!showExplanations) return;
        const pt = getSVGPoint(e);
        const entFrom = entities.find(en => en.id === rel.from);
        const entTo = entities.find(en => en.id === rel.to);
        if (!entFrom || !entTo) return;

        let text = "";
        if (rel.description) {
            text = rel.description;
        } else {
            const isManyFrom = rel.cardFrom.includes('many');
            const isManyTo = rel.cardTo.includes('many');
            
            if (!isManyFrom && isManyTo) {
                 text = `Entenda: Um(a) único(a) ${entFrom.title} pode ter vários(as) ${entTo.title}, mas cada ${entTo.title} pertence a apenas um ${entFrom.title}.`;
            } else if (isManyFrom && !isManyTo) {
                 text = `Entenda: Vários(as) ${entFrom.title} podem estar ligados a um(a) único(a) ${entTo.title}.`;
            } else if (isManyFrom && isManyTo) {
                text = `Entenda: ${entFrom.title} e ${entTo.title} se relacionam livremente. Um pode ter vários do outro.`;
            } else {
                text = `Entenda: Cada ${entFrom.title} tem exatamente um(a) ${entTo.title}.`;
            }
        }
        setHoveredTip({ x: pt.x, y: pt.y, title: `Relação: ${rel.label}`, text });
    };

    const getEntityDimensions = (entity: Entity) => {
        const height = 28 + entity.attributes.length * 22;
        return { width: 250, height };
    };

    const getAnchors = (entity: Entity): Point[] => {
        const { x, y } = entity;
        const { width, height } = getEntityDimensions(entity);
        return [
            { x: x + width / 2, y },
            { x: x + width / 2, y: y + height },
            { x, y: y + height / 2 },
            { x: x + width, y: y + height / 2 },
        ];
    };
    
    const processedConnections = relationships.map(rel => {
        const fromEntity = entities.find(e => e.id === rel.from);
        const toEntity = entities.find(e => e.id === rel.to);
        if (!fromEntity || !toEntity) return null;
        const [start, end] = findClosestAnchors(getAnchors(fromEntity), getAnchors(toEntity));
        return { ...rel, start, end };
    }).filter(x => x !== null) as (Relationship & { start: Point, end: Point })[];

    // Temp line for connection
    let connectionLine = null;
    if (connectingSourceId) {
        const sourceEnt = entities.find(e => e.id === connectingSourceId);
        if (sourceEnt) {
             const startPoint = { x: sourceEnt.x + 125, y: sourceEnt.y + 14 }; 
             connectionLine = (
                 <line 
                    x1={startPoint.x} y1={startPoint.y} 
                    x2={mousePos.x} y2={mousePos.y} 
                    stroke="#2563eb" strokeWidth="2" strokeDasharray="5,5" 
                    pointerEvents="none"
                 />
             );
        }
    }

  const baseLineColor = isDarkMode ? '#94a3b8' : '#4b5563'; // Slate-400 vs Slate-600

  return (
    <svg 
        ref={svgRef} 
        id="er-diagram-svg" 
        width="1600" 
        height="1200" 
        className={`min-w-[1600px] font-sans shadow-sm ${isDarkMode ? 'bg-transparent' : 'bg-slate-50 border border-slate-200'} ${isPanMode ? 'cursor-grab active:cursor-grabbing' : (connectingSourceId ? 'cursor-crosshair' : 'cursor-default')}`}
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
        onMouseDown={handleMouseDownBg}
    >
      <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={baseLineColor} />
          </marker>
      </defs>

      <g ref={contentRef} transform={`translate(${pan.x}, ${pan.y}) scale(${zoomScale})`} transform-origin="0 0">
          <g>
            {processedConnections.map((conn) => (
              <React.Fragment key={conn.id}>
                <ConnectingLine 
                    from={conn.start} 
                    to={conn.end} 
                    onClick={(e) => { e.stopPropagation(); onSelect(conn.id, 'relationship'); }}
                    onMouseEnter={(e) => handleRelHover(e, conn)}
                    onMouseLeave={() => setHoveredTip(null)}
                    strokeColor={baseLineColor}
                />
                {conn.cardFrom.length > 0 && <Cardinality types={conn.cardFrom} point={conn.start} fromPoint={conn.end} strokeColor={baseLineColor} />}
                {conn.cardTo.length > 0 && <Cardinality types={conn.cardTo} point={conn.end} fromPoint={conn.start} strokeColor={baseLineColor} />}
                {conn.label && (
                    <text 
                        x={(conn.start.x + conn.end.x) / 2} 
                        y={(conn.start.y + conn.end.y) / 2 - 10} 
                        textAnchor="middle" 
                        fill={isDarkMode ? '#cbd5e1' : '#666'} 
                        fontSize="11"
                        className="select-none px-1"
                        style={{pointerEvents: 'none'}} 
                    >{conn.label}</text>
                )}
              </React.Fragment>
            ))}
            
            {connectionLine}
          </g>

          {entities.map((entity) => (
            <TableEntity 
                key={entity.id} 
                entity={entity} 
                onMouseDown={(e) => handleMouseDownEntity(e, entity.id)}
                onClick={(e) => { e.stopPropagation(); onSelect(entity.id, 'entity'); }}
                onMouseEnter={(e) => handleEntityHover(e, entity)}
                onMouseLeave={() => setHoveredTip(null)}
                isPanMode={isPanMode}
                isEditMode={isEditMode}
                onConnectStart={(e) => { onConnectStart(entity.id) }}
                isConnecting={!!connectingSourceId && connectingSourceId !== entity.id}
                isDarkMode={isDarkMode}
            />
          ))}

          {/* TOOLTIP LAYER */}
          {showExplanations && hoveredTip && (
              <Tooltip x={hoveredTip.x} y={hoveredTip.y} title={hoveredTip.title} text={hoveredTip.text} />
          )}
      </g>
    </svg>
  );
};

export default ERDiagram;