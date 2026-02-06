
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SmartDocument, FieldType, DocumentField, Signer, DocumentStatus } from '../types';
import { ICONS } from '../constants';
import PDFViewer from './PDFViewer';

interface DocumentEditorProps {
  document: SmartDocument;
  onSave: (doc: SmartDocument) => void;
  onCancel: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document: initialDoc, onSave, onCancel }) => {
  const [doc, setDoc] = useState<SmartDocument>(initialDoc);
  const [activeTab, setActiveTab] = useState<'signers' | 'fields' | 'settings'>('signers');
  const [movingFieldId, setMovingFieldId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const addSigner = () => {
    const newSigner: Signer = {
      id: Math.random().toString(36).substr(2, 5),
      name: '', email: '', phone: '',
      order: doc.signers.length + 1,
      hasSigned: false
    };
    setDoc({ ...doc, signers: [...doc.signers, newSigner] });
  };

  const addField = (x: number, y: number, type: FieldType) => {
    if (doc.signers.length === 0) {
      alert('נא להוסיף לפחות חותם אחד לפני הוספת שדות');
      setActiveTab('signers');
      return;
    }
    const newField: DocumentField = {
      id: Math.random().toString(36).substr(2, 5),
      type, label: getLabel(type),
      page: currentPage, x, y, required: true,
      signerId: doc.signers[0].id
    };
    setDoc({ ...doc, fields: [...doc.fields, newField] });
  };

  const getLabel = (type: FieldType) => {
    switch(type) {
      case FieldType.SIGNATURE: return 'חתימה';
      case FieldType.INITIALS: return 'ראשי תיבות';
      case FieldType.DATE: return 'תאריך';
      case FieldType.ID_NUMBER: return 'ת.ז.';
      default: return 'שדה';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!movingFieldId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - 44) / (rect.height - 44)) * 100));
    setDoc(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === movingFieldId ? { ...f, x, y } : f)
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-slide-up" onMouseMove={handleMouseMove} onMouseUp={() => setMovingFieldId(null)}>
      {/* Editor Header */}
      <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="text-slate-400 font-black hover:text-slate-800 transition-colors uppercase text-xs tracking-widest">ביטול</button>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <input 
              type="text" 
              value={doc.title}
              onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              className="text-xl font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-100 rounded-lg px-2 text-slate-800"
            />
          </div>
        </div>
        <button onClick={() => onSave(doc)} className="bg-blue-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">שמור ושגר מסמך</button>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Editor Sidebar */}
        <div className="w-80 bg-white border-l flex flex-col shadow-sm">
          <div className="flex border-b">
            {['signers', 'fields'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab === 'signers' ? 'חותמים' : 'שדות חתימה'}
              </button>
            ))}
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {activeTab === 'signers' && (
              <div className="space-y-4">
                {doc.signers.map((signer, i) => (
                  <div key={signer.id} className="p-5 border border-slate-100 rounded-3xl bg-slate-50/50 space-y-4 group">
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-600 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black">{i+1}</span>
                      <button onClick={() => setDoc({...doc, signers: doc.signers.filter(s => s.id !== signer.id)})} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                    </div>
                    <input 
                      type="text" placeholder="שם מלא" value={signer.name}
                      onChange={(e) => setDoc({...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, name: e.target.value } : s)})}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <input 
                      type="text" placeholder="טלפון/מייל" value={signer.phone}
                      onChange={(e) => setDoc({...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, phone: e.target.value } : s)})}
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
                <button onClick={addSigner} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-xs hover:border-blue-400 hover:text-blue-600 transition-all uppercase tracking-widest">+ הוסף חותם נוסף</button>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">לחץ להוספה בעמוד {currentPage}</p>
                {[FieldType.SIGNATURE, FieldType.INITIALS, FieldType.DATE, FieldType.ID_NUMBER].map(type => (
                  <button 
                    key={type} 
                    onClick={() => addField(50, 50, type)}
                    className="w-full p-4 border border-slate-100 rounded-2xl text-right font-black text-sm bg-white hover:border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-between"
                  >
                    <span>{getLabel(type)}</span>
                    <span className="text-blue-600 text-xl">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor Main Canvas */}
        <div className="flex-grow bg-slate-100 p-10 overflow-auto flex justify-center custom-scrollbar shadow-inner">
           <div ref={containerRef} className="w-[620px] relative h-fit bg-white shadow-2xl rounded-lg">
              <PDFViewer fileUrl={doc.fileUrl} currentPage={currentPage} onPageChange={setCurrentPage}>
                {doc.fields.filter(f => f.page === currentPage).map(field => (
                  <div 
                    key={field.id} 
                    onMouseDown={e => { e.stopPropagation(); setMovingFieldId(field.id); }} 
                    style={{ left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)' }}
                    className={`absolute p-3 bg-white/95 border-2 border-blue-600 rounded-2xl flex items-center gap-3 shadow-xl z-20 pointer-events-auto cursor-move select-none transition-transform ${movingFieldId === field.id ? 'scale-110 opacity-70' : 'hover:scale-105'}`}
                  >
                    <div className="flex flex-col text-right">
                       <select 
                        className="text-[8px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded outline-none mb-1 border-none"
                        value={field.signerId}
                        onChange={e => setDoc({...doc, fields: doc.fields.map(f => f.id === field.id ? { ...f, signerId: e.target.value } : f)})}
                       >
                          {doc.signers.map(s => <option key={s.id} value={s.id}>{s.name || 'בחר חותם'}</option>)}
                       </select>
                       <div className="text-[10px] font-black text-slate-800">{field.label}</div>
                    </div>
                    <button onClick={() => setDoc({ ...doc, fields: doc.fields.filter(f => f.id !== field.id) })} className="text-[10px] text-red-400 hover:bg-red-50 p-1 rounded-full">✕</button>
                  </div>
                ))}
              </PDFViewer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
