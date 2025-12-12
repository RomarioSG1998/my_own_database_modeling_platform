import React, { useState, useEffect } from 'react';
import { Entity, Relationship, Attribute } from '../App';

interface SQLModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  relationships: Relationship[];
  onImport: (entities: Entity[], relationships: Relationship[]) => void;
  isDarkMode: boolean;
}

const SQLModal: React.FC<SQLModalProps> = ({ isOpen, onClose, entities, relationships, onImport, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [sqlContent, setSqlContent] = useState('');

  // --- EXPORT LOGIC ---
  const generateSQL = () => {
    let sql = `-- Gerado pelo My own model\n-- ${new Date().toLocaleString()}\n\n`;

    // 1. Create Tables
    entities.forEach(ent => {
        sql += `CREATE TABLE ${ent.title.toUpperCase()} (\n`;
        
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
          // Matches: CREATE TABLE [IF NOT EXISTS] Name ( content );
          const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gim;
          
          let match;
          let tableCount = 0;
          const tableNameToId: Record<string, string> = {};
          const pendingInlineRels: { from: string; to: string }[] = [];

          // Helper for splitting by comma but ignoring parens (for DECIMAL(10,2))
          const smartSplit = (str: string, delimiter: string) => {
                const result = [];
                let current = '';
                let depth = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str[i];
                    if (char === '(') depth++;
                    if (char === ')') depth--;
                    
                    if (char === delimiter && depth === 0) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                if (current) result.push(current.trim());
                return result;
          };

          // Pass 1: Create Entities
          while ((match = tableRegex.exec(cleanSQL)) !== null) {
              const tableName = match[1];
              const body = match[2];
              const id = `ENT_${Math.random().toString(36).substr(2, 6)}`;
              tableNameToId[tableName.toUpperCase()] = id;

              // Parse Attributes using smart split
              const lines = smartSplit(body, ',').filter(l => l.length > 0);
              const attributes: Attribute[] = [];
              
              lines.forEach((line) => {
                 const upperLine = line.toUpperCase();
                 
                 // 1. Check for Table-Level CONSTRAINT with FOREIGN KEY
                 if (upperLine.startsWith('CONSTRAINT') || (upperLine.includes('FOREIGN KEY') && upperLine.includes('REFERENCES'))) {
                     const refMatch = line.match(/REFERENCES\s+["`]?(\w+)["`]?/i);
                     if (refMatch) {
                         pendingInlineRels.push({ from: tableName.toUpperCase(), to: refMatch[1].toUpperCase() });
                     }
                     return; 
                 }
                 
                 // 2. Check for Other Constraints to skip
                 if (upperLine.startsWith('INDEX') || upperLine.startsWith('UNIQUE') || (upperLine.startsWith('PRIMARY KEY') && line.includes('('))) return;

                 // 3. Attribute Parsing
                 const parts = line.split(/\s+/);
                 if (parts.length < 2) return;
                 
                 const name = parts[0].replace(/["`]/g, '');
                 
                 // 4. Check for Inline Column FOREIGN KEY (col type REFERENCES table(col))
                 // This catches: "liga_id INTEGER REFERENCES tb_liga(liga_id)"
                 const refMatch = line.match(/REFERENCES\s+["`]?(\w+)["`]?/i);
                 if (refMatch) {
                      pendingInlineRels.push({ from: tableName.toUpperCase(), to: refMatch[1].toUpperCase() });
                 }

                 // Clean up type
                 // Remove PRIMARY KEY, REFERENCES..., NOT NULL, etc
                 let type = parts.slice(1).join(' ');
                 type = type.replace(/PRIMARY\s+KEY/i, '')
                            .replace(/REFERENCES\s+["`]?\w+["`]?(\(.*\))?/i, '')
                            .replace(/NOT\s+NULL/i, '')
                            .replace(/NULL/i, '')
                            .replace(/DEFAULT\s+.*$/i, '')
                            .trim();

                 const isKey = upperLine.includes('PRIMARY KEY');

                 attributes.push({
                     id: `ATTR_${Math.random().toString(36).substr(2, 6)}`,
                     name,
                     type: type.split(' ')[0], // Keep it simple (e.g., VARCHAR)
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

          // Process Pending Inline Relationships (Caught inside CREATE TABLE)
          pendingInlineRels.forEach(rel => {
              // 'from' is the table containing the FK (Child/Many side)
              // 'to' is the referenced table (Parent/One side)
              const idChild = tableNameToId[rel.from]; 
              const idParent = tableNameToId[rel.to]; 

              if (idChild && idParent) {
                   newRelationships.push({
                       id: `REL_${Math.random().toString(36).substr(2, 6)}`,
                       from: idParent,
                       to: idChild,
                       cardFrom: ['one'],
                       cardTo: ['many'],
                       label: 'REF',
                       description: 'Importada (FK)'
                   });
              }
          });

          // Pass 2: Extract Relationships from ALTER TABLE
          // Regex updated to use [\s\S] to match newlines in multi-line statements
          const alterRegex = /ALTER\s+TABLE\s+["`]?(\w+)["`]?\s+ADD\s+CONSTRAINT[\s\S]*?FOREIGN\s+KEY[\s\S]*?REFERENCES\s+["`]?(\w+)["`]?/gim;
          
          let relMatch;
          while ((relMatch = alterRegex.exec(cleanSQL)) !== null) {
               const tableChild = relMatch[1].toUpperCase(); // Table with FK
               const tableParent = relMatch[2].toUpperCase(); // Referenced Table
               
               const idParent = tableNameToId[tableParent];
               const idChild = tableNameToId[tableChild];
               
               if (idParent && idChild) {
                   newRelationships.push({
                       id: `REL_${Math.random().toString(36).substr(2, 6)}`,
                       from: idParent,
                       to: idChild,
                       cardFrom: ['one'],
                       cardTo: ['many'],
                       label: 'REF',
                       description: 'Importada (ALTER TABLE)'
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
      <div className={`rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className={`flex border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button 
                onClick={() => setActiveTab('export')}
                className={`flex-1 p-4 font-bold text-center transition ${activeTab === 'export' ? 'border-b-2 border-blue-600 text-blue-600' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}`}
            >
                Exportar SQL (Gerar)
            </button>
            <button 
                onClick={() => setActiveTab('import')}
                className={`flex-1 p-4 font-bold text-center transition ${activeTab === 'import' ? 'border-b-2 border-purple-600 text-purple-600' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}`}
            >
                Importar SQL (Ler)
            </button>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0">
             <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                 {activeTab === 'export' 
                    ? 'Copie este código para criar seu banco de dados.' 
                    : 'Cole comandos CREATE TABLE ou ALTER TABLE para gerar o diagrama.'}
             </p>
             <textarea 
                className={`w-full flex-1 p-3 font-mono text-sm border rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
                value={sqlContent}
                onChange={(e) => setSqlContent(e.target.value)}
                readOnly={activeTab === 'export'}
                placeholder={activeTab === 'import' ? 'CREATE TABLE Exemplo ( ... );' : ''}
             />
        </div>

        <div className={`p-4 border-t flex justify-between items-center rounded-b-lg ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
             <button onClick={onClose} className={`px-4 py-2 rounded ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-200'}`}>Cancelar</button>
             
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
                                a.download = 'database_my_own_model.sql';
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