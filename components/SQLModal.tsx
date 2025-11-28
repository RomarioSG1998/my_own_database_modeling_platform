
import React, { useState, useEffect } from 'react';
import { Entity, Relationship, Attribute } from '../App';

interface SQLModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  relationships: Relationship[];
  onImport: (entities: Entity[], relationships: Relationship[]) => void;
}

const SQLModal: React.FC<SQLModalProps> = ({ isOpen, onClose, entities, relationships, onImport }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [sqlContent, setSqlContent] = useState('');

  // --- EXPORT LOGIC ---
  const generateSQL = () => {
    let sql = `-- Gerado pelo Cofry ER Diagram Viewer\n-- ${new Date().toLocaleString()}\n\n`;

    // 1. Create Tables
    entities.forEach(ent => {
        sql += `CREATE TABLE ${ent.title.toUpperCase()} (\n`;
        const pk = ent.attributes.find(a => a.isKey);
        
        ent.attributes.forEach((attr, idx) => {
            const isLast = idx === ent.attributes.length - 1;
            // Basic type mapping or use raw
            let type = attr.type.toUpperCase();
            if (type === 'INT') type = 'INTEGER';
            
            sql += `    ${attr.name} ${type}`;
            if (attr.isKey) sql += ` PRIMARY KEY`;
            if (!isLast) sql += `,\n`;
            else sql += `\n`;
        });
        sql += `);\n\n`;
    });

    // 2. Foreign Keys (Relationships)
    sql += `-- Relações (Foreign Keys)\n`;
    relationships.forEach(rel => {
        const entFrom = entities.find(e => e.id === rel.from);
        const entTo = entities.find(e => e.id === rel.to);
        
        if (entFrom && entTo) {
            // Find PK of 'From' entity to reference
            const pkFrom = entFrom.attributes.find(a => a.isKey)?.name || 'ID';
            
            // Logic: 
            // 1:N -> FK goes on the N side (To)
            // 1:1 -> FK usually on To side (or weak side)
            // N:N -> Junction table (omitted here for simplicity, modeled as comment)
            
            const isManyTo = rel.cardTo.includes('many');
            const isManyFrom = rel.cardFrom.includes('many');

            if (isManyTo && !isManyFrom) {
                // Classic 1:N
                sql += `ALTER TABLE ${entTo.title.toUpperCase()} ADD CONSTRAINT FK_${entTo.title}_${entFrom.title}\n`;
                sql += `    FOREIGN KEY (ID_${entFrom.title}) REFERENCES ${entFrom.title.toUpperCase()}(${pkFrom});\n\n`;
            } else if (!isManyTo && isManyFrom) {
                // Reverse 1:N
                sql += `ALTER TABLE ${entFrom.title.toUpperCase()} ADD CONSTRAINT FK_${entFrom.title}_${entTo.title}\n`;
                sql += `    FOREIGN KEY (ID_${entTo.title}) REFERENCES ${entTo.title.toUpperCase()}(${pkFrom});\n\n`;
            } else if (isManyTo && isManyFrom) {
                 sql += `-- RELAÇÃO N:N ENTRE ${entFrom.title} E ${entTo.title} REQUER TABELA PIVÔ (NÃO GERADA AUTOMATICAMENTE)\n\n`;
            } else {
                 // 1:1
                 sql += `ALTER TABLE ${entTo.title.toUpperCase()} ADD CONSTRAINT FK_${entTo.title}_${entFrom.title}\n`;
                 sql += `    FOREIGN KEY (ID_${entFrom.title}) REFERENCES ${entFrom.title.toUpperCase()}(${pkFrom});\n\n`;
            }
        }
    });

    return sql;
  };

  useEffect(() => {
      if (activeTab === 'export') {
          setSqlContent(generateSQL());
      } else {
          setSqlContent('');
      }
  }, [activeTab]);


  // --- IMPORT LOGIC ---
  const handleImport = () => {
      try {
          const newEntities: Entity[] = [];
          const newRelationships: Relationship[] = [];
          
          // Helper to clean SQL
          const cleanSQL = sqlContent
            .replace(/--.*$/gm, '') // Remove single line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .trim();

          // Regex to find CREATE TABLE blocks
          // Matches: CREATE TABLE Name ( content );
          const tableRegex = /CREATE\s+TABLE\s+["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gim;
          
          let match;
          let tableCount = 0;
          const tableNameToId: Record<string, string> = {};

          // Pass 1: Create Entities
          while ((match = tableRegex.exec(cleanSQL)) !== null) {
              const tableName = match[1];
              const body = match[2];
              const id = `ENT_${Math.random().toString(36).substr(2, 6)}`;
              tableNameToId[tableName.toUpperCase()] = id;

              // Parse Attributes
              const attributes: Attribute[] = [];
              // Split by comma, but careful about commas in parens e.g. DECIMAL(10,2)
              // Simple split approach for now
              const lines = body.split(',').map(l => l.trim()).filter(l => l.length > 0);
              
              lines.forEach((line, idx) => {
                 // Check if it's a constraint line (PRIMARY KEY at end, FOREIGN KEY)
                 if (line.toUpperCase().startsWith('FOREIGN KEY') || line.toUpperCase().startsWith('CONSTRAINT')) return;
                 if (line.toUpperCase().startsWith('PRIMARY KEY') && line.includes('(')) return; // Table level PK

                 // Naive attribute parser: Name Type ...
                 const parts = line.split(/\s+/);
                 if (parts.length < 2) return;
                 
                 const name = parts[0].replace(/["`]/g, '');
                 const type = parts.slice(1).join(' ').replace(/PRIMARY KEY/i, '').trim(); // Remove PK keyword from type
                 const isKey = line.toUpperCase().includes('PRIMARY KEY');

                 attributes.push({
                     id: `ATTR_${Math.random().toString(36).substr(2, 6)}`,
                     name,
                     type: type.split(' ')[0], // Just grab first word of type for cleanliness
                     isKey
                 });
              });
              
              // Auto Layout Grid
              const col = tableCount % 4;
              const row = Math.floor(tableCount / 4);

              newEntities.push({
                  id,
                  title: tableName.toUpperCase(),
                  colorScheme: 'blue',
                  x: 100 + (col * 350),
                  y: 100 + (row * 300),
                  attributes,
                  description: 'Tabela importada via SQL.'
              });
              tableCount++;
          }

          // Pass 2: Extract Relationships from ALTER TABLE or Inline FKs (Simple heuristic)
          // Look for: ALTER TABLE Table ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES Target
          const alterRegex = /ALTER\s+TABLE\s+["`]?(\w+)["`]?\s+ADD\s+CONSTRAINT.*?FOREIGN\s+KEY.*?REFERENCES\s+["`]?(\w+)["`]?/gim;
          
          let relMatch;
          while ((relMatch = alterRegex.exec(cleanSQL)) !== null) {
               const tableSource = relMatch[1].toUpperCase();
               const tableTarget = relMatch[2].toUpperCase();
               
               const idFrom = tableNameToId[tableTarget]; // The referenced table is the "One" side (usually)
               const idTo = tableNameToId[tableSource];   // The table with FK is the "Many" side
               
               if (idFrom && idTo) {
                   newRelationships.push({
                       id: `REL_${Math.random().toString(36).substr(2, 6)}`,
                       from: idFrom,
                       to: idTo,
                       cardFrom: ['one'],
                       cardTo: ['many'],
                       label: 'REF',
                       description: 'Importada do SQL'
                   });
               }
          }

          if (newEntities.length === 0) {
              alert("Nenhuma tabela encontrada no SQL fornecido.");
              return;
          }

          onImport(newEntities, newRelationships);

      } catch (e) {
          console.error(e);
          alert("Erro ao importar SQL. Verifique a sintaxe.");
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex border-b">
            <button 
                onClick={() => setActiveTab('export')}
                className={`flex-1 p-4 font-bold text-center transition ${activeTab === 'export' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
                Exportar SQL (Gerar)
            </button>
            <button 
                onClick={() => setActiveTab('import')}
                className={`flex-1 p-4 font-bold text-center transition ${activeTab === 'import' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
                Importar SQL (Ler)
            </button>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0">
             <p className="text-sm text-gray-500 mb-2">
                 {activeTab === 'export' 
                    ? 'Copie este código para criar seu banco de dados.' 
                    : 'Cole comandos CREATE TABLE para gerar o diagrama.'}
             </p>
             <textarea 
                className="w-full flex-1 p-3 font-mono text-sm bg-gray-50 border rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                value={sqlContent}
                onChange={(e) => setSqlContent(e.target.value)}
                readOnly={activeTab === 'export'}
                placeholder={activeTab === 'import' ? 'CREATE TABLE Exemplo ( ... );' : ''}
             />
        </div>

        <div className="p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
             <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
             
             <div className="flex gap-2">
                {activeTab === 'export' ? (
                    <>
                         <button 
                            onClick={() => navigator.clipboard.writeText(sqlContent)}
                            className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-medium"
                         >
                            Copiar
                         </button>
                         <button 
                            onClick={() => {
                                const blob = new Blob([sqlContent], {type: 'text/sql'});
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'database_cofry.sql';
                                a.click();
                            }}
                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded font-medium shadow"
                         >
                            Baixar .SQL
                         </button>
                    </>
                ) : (
                    <button 
                        onClick={handleImport}
                        className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded font-bold shadow"
                    >
                        Processar e Importar
                    </button>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};

export default SQLModal;
