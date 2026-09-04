
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { SmartDocument, DocumentStatus, FieldType, Contact, Signer, DocumentField } from './types';
import { ICONS } from './constants';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.10.38';
import { generateSmartReminder, summarizeDocument } from './services/geminiService';

// Setup PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

// --- UI Components ---

const Loader = ({ message = "טוען..." }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-4">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-500 font-bold animate-pulse">{message}</p>
  </div>
);

const PDFViewer = ({ fileUrl, currentPage = 1, onPageChange = () => {}, children = null }: { fileUrl: any; currentPage?: number; onPageChange?: (p: number) => void; children?: any }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const renderPDF = async () => {
      if (!fileUrl) return;
      setLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf: any = await loadingTask.promise;
        if (isMounted) setNumPages(pdf.numPages);
        
        const page: any = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await (page as any).render({ canvasContext: context, viewport }).promise;
        
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(canvas);
          canvas.className = "w-full shadow-lg rounded-lg";
          setLoading(false);
        }
      } catch (err) { console.error(err); setLoading(false); }
    };
    renderPDF();
    return () => { isMounted = false; };
  }, [fileUrl, currentPage]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50 rounded-xl font-bold text-blue-600">טוען עמוד {currentPage}...</div>}
      
      <div className="w-full flex justify-between items-center mb-4 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg z-20">
        <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className="p-1 hover:bg-slate-700 rounded-lg disabled:opacity-30 transition-colors">
          <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <span className="text-xs font-bold">עמוד {currentPage} מתוך {numPages}</span>
        <button disabled={currentPage >= numPages} onClick={() => onPageChange(currentPage + 1)} className="p-1 hover:bg-slate-700 rounded-lg disabled:opacity-30 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div ref={containerRef} className="relative z-0 w-full overflow-hidden bg-white border rounded-lg shadow-sm"></div>
      {!loading && <div className="absolute inset-0 z-10 pointer-events-none mt-[44px]">{children}</div>}
    </div>
  );
};

// --- Main App Logic ---

const App = () => {
  const [view, setView] = useState<'home' | 'dashboard' | 'contacts' | 'editor' | 'signing' | 'share'>('home');
  const [documents, setDocuments] = useState<SmartDocument[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialization
  useEffect(() => {
    const d = localStorage.getItem('signsmart_docs');
    const c = localStorage.getItem('signsmart_contacts');
    if (d) setDocuments(JSON.parse(d).map(doc => ({ ...doc, createdAt: new Date(doc.createdAt) })));
    if (c) setContacts(JSON.parse(c));
    else setContacts([{ id: 'c1', firstName: 'ישראל', lastName: 'ישראלי', phone: '0501234567', email: 'israel@example.com' }]);

    const params = new URLSearchParams(window.location.search);
    const signId = params.get('sign');
    if (signId) { setSelectedId(signId); setView('signing'); }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('signsmart_docs', JSON.stringify(documents));
      localStorage.setItem('signsmart_contacts', JSON.stringify(contacts));
    }
  }, [documents, contacts, isLoading]);

  const handleFileUpload = (file: File) => {
    setIsLoading(true);
    const url = URL.createObjectURL(file);
    const newDoc: SmartDocument = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name.split('.')[0],
      fileName: file.name,
      fileUrl: url,
      status: DocumentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      signers: [{ id: 's1', name: 'חותם 1', email: '', phone: '', order: 1, hasSigned: false }],
      fields: [],
      signingOrder: 'SEQUENTIAL',
      remindersEnabled: true
    };
    setDocuments([newDoc, ...documents]);
    setSelectedId(newDoc.id);
    setView('editor');
    setIsLoading(false);
  };

  const currentDoc = documents.find(d => d.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Header - Only show if not in signing mode */}
      {view !== 'signing' && (
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 h-20 flex items-center justify-between sticky top-0 z-50 px-12 shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('home'); setSelectedId(null); }}>
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100"><ICONS.Logo className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">SignSmart</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">מערכת חתימה חכמה</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button onClick={() => setView('home')} className={`p-2 rounded-xl font-bold transition-all flex items-center gap-2 ${view === 'home' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <ICONS.Home className="w-5 h-5" /> בית
            </button>
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl font-bold transition-all ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>מסמכים</button>
            <button onClick={() => setView('contacts')} className={`px-4 py-2 rounded-xl font-bold transition-all ${view === 'contacts' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>אנשי קשר</button>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <label className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold cursor-pointer shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <ICONS.Plus className="w-4 h-4" /> העלאת מסמך
              <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </label>
          </nav>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-12 py-10">
        {isLoading ? (
          <Loader message="טוען נתונים מהמערכת..." />
        ) : (
          <>
            {view === 'home' && (
              <HomeDashboard 
                documents={documents} 
                onEdit={(id) => { setSelectedId(id); setView('editor'); }}
                onDelete={(id) => setDocuments(docs => docs.filter(d => d.id !== id))}
                onShare={(id) => { setSelectedId(id); setView('share'); }}
              />
            )}
            {/* Fix: Changed DashboardView to HomeDashboard as DashboardView was not defined and HomeDashboard is the appropriate component for this view. */}
            {view === 'dashboard' && <HomeDashboard documents={documents} onEdit={(id) => { setSelectedId(id); setView('editor'); }} onShare={(id) => { setSelectedId(id); setView('share'); }} onDelete={(id) => setDocuments(docs => docs.filter(d => d.id !== id))} />}
            {view === 'contacts' && <ContactsView contacts={contacts} setContacts={setContacts} />}
            {view === 'editor' && currentDoc && <EditorView document={currentDoc} contacts={contacts} onSave={(d) => { setDocuments(docs => docs.map(doc => doc.id === d.id ? { ...d, status: DocumentStatus.IN_PROGRESS } : doc)); setView('share'); }} onCancel={() => setView('home')} />}
            {view === 'share' && currentDoc && <ShareCenter document={currentDoc} onClose={() => setView('home')} />}
            {view === 'signing' && currentDoc && <SignerProcess document={currentDoc} onComplete={() => { 
                setDocuments(docs => docs.map(d => d.id === selectedId ? { ...d, status: DocumentStatus.COMPLETED, signers: d.signers.map(s => ({...s, hasSigned: true})) } : d)); 
                setView('home'); 
              }} 
            />}
          </>
        )}
      </main>
    </div>
  );
};

// --- Home Dashboard Component ---

const HomeDashboard = ({ documents, onEdit, onDelete, onShare }) => {
  const [search, setSearch] = useState('');
  const filtered = documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const copyLink = (id) => {
    const link = `${window.location.origin}${window.location.pathname}?sign=${id}`;
    navigator.clipboard.writeText(link);
    alert('קישור החתימה הועתק ללוח!');
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const styles = {
      [DocumentStatus.PENDING]: 'bg-slate-100 text-slate-600',
      [DocumentStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-600 border border-blue-100',
      [DocumentStatus.COMPLETED]: 'bg-green-50 text-green-600 border border-green-100',
      [DocumentStatus.EXPIRED]: 'bg-red-50 text-red-600',
      [DocumentStatus.ESCALATED]: 'bg-amber-50 text-amber-600',
    };
    const labels = {
      [DocumentStatus.PENDING]: 'טיוטה',
      [DocumentStatus.IN_PROGRESS]: 'ממתין',
      [DocumentStatus.COMPLETED]: 'נחתם',
      [DocumentStatus.EXPIRED]: 'פג תוקף',
      [DocumentStatus.ESCALATED]: 'דחוף',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סה"כ מסמכים</p>
          <p className="text-4xl font-black text-slate-800">{documents.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ממתינים לחתימה</p>
          <p className="text-4xl font-black text-blue-600">{documents.filter(d => d.status === DocumentStatus.IN_PROGRESS).length}</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">הושלמו</p>
          <p className="text-4xl font-black text-green-600">{documents.filter(d => d.status === DocumentStatus.COMPLETED).length}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 p-2.5 rounded-2xl text-white">
                <ICONS.Home className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-black text-slate-800">ניהול סבבי חתימה</h3>
          </div>
          
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="חיפוש מסמך..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
            />
            <svg className="absolute left-4 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">מסמך ופרטים</th>
                <th className="px-8 py-5 text-center">סטטוס</th>
                <th className="px-8 py-5 text-center">חותמים</th>
                <th className="px-8 py-5">תאריך</th>
                <th className="px-8 py-5 text-left">פעולות מהירות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <ICONS.File className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{doc.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{doc.fileName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {getStatusBadge(doc.status)}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex justify-center -space-x-2 space-x-reverse">
                      {doc.signers.map((s, i) => (
                        <div key={s.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${s.hasSigned ? 'bg-green-500' : 'bg-slate-300'}`} title={s.name}>
                          {s.name[0]}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm text-slate-500 font-medium">
                      {new Intl.DateTimeFormat('he-IL').format(doc.createdAt)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => copyLink(doc.id)} 
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="העתק לינק חתימה"
                      >
                        <ICONS.Share className="w-4 h-4 rotate-180" />
                      </button>
                      <button 
                        onClick={() => onShare(doc.id)} 
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="שלח הפצה"
                      >
                        <ICONS.Phone className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(doc.id)} 
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        title="מחק"
                      >
                        <ICONS.Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <ICONS.File className="w-16 h-16 opacity-20" />
                      <p className="text-lg font-bold">אין מסמכים להצגה</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Editor View ---

const EditorView = ({ document: initialDoc, contacts, onSave, onCancel }) => {
  const [doc, setDoc] = useState(initialDoc);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'signers' | 'fields'>('signers');
  const [movingFieldId, setMovingFieldId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const addSigner = () => {
    const newSigner: Signer = { id: Math.random().toString(36).substr(2, 5), name: '', email: '', phone: '', order: doc.signers.length + 1, hasSigned: false };
    setDoc({ ...doc, signers: [...doc.signers, newSigner] });
  };

  const addField = (x: number, y: number, type: FieldType) => {
    const newField: DocumentField = { id: Math.random().toString(36).substr(2, 5), type, label: type, page: currentPage, x, y, required: true, signerId: doc.signers[0]?.id || '' };
    setDoc({ ...doc, fields: [...doc.fields, newField] });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!movingFieldId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - 44) / (rect.height - 44)) * 100));
    setDoc(prev => ({ ...prev, fields: prev.fields.map(f => f.id === movingFieldId ? { ...f, x, y } : f) }));
  };

  return (
    <div className="flex flex-col h-[80vh] bg-white rounded-[40px] shadow-2xl overflow-hidden border" onMouseMove={handleMouseMove} onMouseUp={() => setMovingFieldId(null)}>
      {/* Editor Header */}
      <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-slate-400 font-bold hover:text-slate-800 transition-colors">ביטול</button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h2 className="text-xl font-bold text-slate-800">{doc.title}</h2>
        </div>
        <button onClick={() => onSave(doc)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">סיום והפצה</button>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Editor Sidebar */}
        <div className="w-80 border-l flex flex-col bg-white">
          <div className="flex border-b">
            <button onClick={() => setActiveTab('signers')} className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'signers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>חותמים</button>
            <button onClick={() => setActiveTab('fields')} className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'fields' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>שדות</button>
          </div>

          <div className="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-4">
            {activeTab === 'signers' ? (
              <div className="space-y-4">
                {doc.signers.map((signer, idx) => (
                  <div key={signer.id} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">חותם {idx + 1}</span>
                      <button onClick={() => setDoc({ ...doc, signers: doc.signers.filter(s => s.id !== signer.id) })} className="text-slate-300 hover:text-red-500">✕</button>
                    </div>
                    <input type="text" placeholder="שם מלא" value={signer.name} onChange={e => setDoc({ ...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, name: e.target.value } : s) })} className="w-full p-2 border rounded-xl text-xs outline-none focus:border-blue-300 font-bold" />
                    <input type="text" placeholder="טלפון / אימייל" value={signer.phone} onChange={e => setDoc({ ...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, phone: e.target.value } : s) })} className="w-full p-2 border rounded-xl text-xs outline-none focus:border-blue-300 font-bold" />
                  </div>
                ))}
                <button onClick={addSigner} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-400 hover:text-blue-600 transition-all">+ הוסף חותם נוסף</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">לחץ להוספת שדה לעמוד {currentPage}</p>
                {['חתימה', 'ראשי תיבות', 'תאריך', 'ת.ז.', 'כתובת'].map(type => (
                  <button key={type} onClick={() => addField(50, 50, type as any)} className="w-full p-4 border rounded-2xl text-right font-bold text-sm bg-white hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm">
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor Main Canvas */}
        <div className="flex-grow bg-slate-100 p-10 overflow-auto flex justify-center custom-scrollbar">
           <div ref={containerRef} className="w-[600px] relative h-fit bg-white shadow-xl">
              <PDFViewer fileUrl={doc.fileUrl} currentPage={currentPage} onPageChange={setCurrentPage}>
                {doc.fields.filter(f => f.page === currentPage).map(field => (
                  <div key={field.id} onMouseDown={e => { e.stopPropagation(); setMovingFieldId(field.id); }} style={{ left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)' }}
                    className={`absolute p-3 bg-white border-2 border-blue-600 rounded-xl shadow-xl pointer-events-auto cursor-move z-20 flex items-center gap-2 select-none ${movingFieldId === field.id ? 'scale-110 opacity-70' : ''}`}>
                    <div className="text-[10px] font-black text-blue-900">{field.label}</div>
                    <select className="text-[8px] bg-slate-50 border rounded p-1 outline-none font-bold" value={field.signerId} onChange={e => setDoc({...doc, fields: doc.fields.map(f => f.id === field.id ? { ...f, signerId: e.target.value } : f)})}>
                      {doc.signers.map(s => <option key={s.id} value={s.id}>{s.name || 'חותם'}</option>)}
                    </select>
                    <button onClick={() => setDoc({ ...doc, fields: doc.fields.filter(f => f.id !== field.id) })} className="text-[10px] text-red-400 ml-1">✕</button>
                  </div>
                ))}
              </PDFViewer>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Share Center ---

const ShareCenter = ({ document: doc, onClose }) => {
  const [loadingSignerId, setLoadingSignerId] = useState<string | null>(null);

  const getLink = (signerId: string) => {
    const base = window.location.href.split('?')[0];
    return `${base}?sign=${doc.id}&signer=${signerId}`;
  };

  const sendWhatsApp = async (signer: Signer) => {
    setLoadingSignerId(signer.id);
    const reminder = await generateSmartReminder(doc.title, signer.name);
    const link = getLink(signer.id);
    const text = `${reminder}\n\nקישור לחתימה מהירה:\n${link}`;
    window.open(`https://wa.me/${signer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    setLoadingSignerId(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl animate-slide-up border">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">מרכז הפצה וחתימות</h2>
            <p className="text-slate-400 text-sm font-medium">שלח קישור אישי לכל חותם ובצע מעקב בזמן אמת</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all">✕</button>
        </div>

        <div className="overflow-hidden border rounded-3xl">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <tr><th className="px-6 py-4">חותם</th><th className="px-6 py-4">סטטוס</th><th className="px-6 py-4">פעולות שליחה</th></tr>
            </thead>
            <tbody className="divide-y">
              {doc.signers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-5 font-bold text-slate-700">{s.name} <br/><span className="text-[10px] text-slate-400 font-normal">{s.phone}</span></td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${s.hasSigned ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {s.hasSigned ? 'חתם' : 'ממתין'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2">
                      <button 
                        disabled={loadingSignerId === s.id}
                        onClick={() => sendWhatsApp(s)} 
                        className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all flex items-center gap-2 font-bold text-xs"
                      >
                        {loadingSignerId === s.id ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <ICONS.Phone className="w-4 h-4" />}
                        שלח וואטסאפ
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(getLink(s.id)); alert('הקישור הועתק'); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all" title="העתק קישור"><ICONS.Share className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-center">
          <button onClick={onClose} className="px-12 py-4 bg-slate-800 text-white font-bold rounded-3xl shadow-xl hover:bg-slate-900 transition-all">סיים וסגור</button>
        </div>
      </div>
    </div>
  );
};

// --- Contacts View ---

const ContactsView = ({ contacts, setContacts }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newC, setNewC] = useState({ firstName: '', lastName: '', phone: '', email: '' });

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">ספר כתובות</h2>
          <p className="text-slate-400 font-medium">אנשי קשר שמורים לשליחה מהירה</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
          <ICONS.Plus className="w-5 h-5" /> הוסף איש קשר
        </button>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
            <tr><th className="px-8 py-6">שם מלא</th><th className="px-8 py-6">טלפון</th><th className="px-8 py-6">אימייל</th><th className="px-8 py-6">פעולות</th></tr>
          </thead>
          <tbody className="divide-y">
            {contacts.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 font-bold text-slate-700">{c.firstName} {c.lastName}</td>
                <td className="px-8 py-6 text-slate-500">{c.phone}</td>
                <td className="px-8 py-6 text-slate-400 text-sm">{c.email || '—'}</td>
                <td className="px-8 py-6 text-left">
                  <button onClick={() => setContacts(contacts.filter(con => con.id !== c.id))} className="text-red-300 hover:text-red-500 transition-colors"><ICONS.Trash className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-md rounded-[40px] p-10 space-y-4 shadow-2xl border animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800">איש קשר חדש</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="שם פרטי" value={newC.firstName} onChange={e => setNewC({...newC, firstName: e.target.value})} className="p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              <input placeholder="שם משפחה" value={newC.lastName} onChange={e => setNewC({...newC, lastName: e.target.value})} className="p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
            </div>
            <input placeholder="טלפון" value={newC.phone} onChange={e => setNewC({...newC, phone: e.target.value})} className="w-full p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
            <input placeholder="אימייל (אופציונלי)" value={newC.email} onChange={e => setNewC({...newC, email: e.target.value})} className="w-full p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
            <div className="flex gap-4 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-4 font-bold text-slate-400">ביטול</button>
              <button onClick={() => { setContacts([...contacts, { ...newC, id: Math.random().toString(36).substr(2,9) }]); setShowAdd(false); }} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg">שמור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Signer Process ---

const SignerProcess = ({ document: doc, onComplete }) => {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const fields = doc.fields;
  const currentField = fields[step];

  const handleFinish = async () => {
    setIsFinishing(true);
    // קריאה לפונקציה ב-Code.gs לשליחת מייל עדכון למנהל המערכת
    // Fix: Casting window to any to access global 'google' object from Apps Script environment
    const win = window as any;
    if (win.google?.script?.run) {
        win.google.script.run
            .withSuccessHandler(() => {
                setIsFinishing(false);
                setIsCompleted(true);
            })
            .withFailureHandler((err) => {
                console.error("Failed to send notification", err);
                setIsFinishing(false);
                setIsCompleted(true); // עדיין נשלים את התהליך עבור הלקוח
            })
            .sendSignedDocumentNotification(doc.title, doc.signers[0]?.name || "לקוח לא ידוע");
    } else {
        // Fallback למקרה של סביבה מקומית
        await new Promise(r => setTimeout(r, 1500));
        setIsFinishing(false);
        setIsCompleted(true);
    }
  };

  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-slide-up">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <ICONS.Check className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-800">החתימה הושלמה בהצלחה!</h2>
          <p className="text-slate-500 text-lg">המסמך "<strong>{doc.title}</strong>" נחתם ונשלח חזרה למשרד כהן ושות'.</p>
          <p className="text-slate-400 text-sm italic">עותק יישלח אליך למייל ברגע שיאושר על ידי עורך הדין.</p>
        </div>
        <button onClick={onComplete} className="bg-slate-800 text-white px-10 py-4 rounded-3xl font-bold shadow-xl hover:bg-slate-900 transition-all">סגור ממשק</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up max-w-5xl mx-auto">
      {isFinishing && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center">
          <Loader message="מעדכן את המשרד ושולח עותק חתום..." />
        </div>
      )}

      {/* Signer Header */}
      <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5">
           <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><ICONS.Logo className="w-8 h-8" /></div>
           <div className="text-right">
             <h2 className="text-xl font-black text-slate-800">חתימה על מסמך: {doc.title}</h2>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">נא למלא את כל השדות המסומנים בכחול</p>
           </div>
        </div>
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">שלב {step + 1} מתוך {fields.length}</span>
              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((step + 1) / fields.length) * 100}%` }}></div>
              </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Document Area */}
        <div className="flex-grow bg-slate-200/50 p-6 rounded-[40px] border shadow-inner flex justify-center overflow-auto min-h-[70vh]">
          <div className="w-full max-w-[620px] relative">
             <PDFViewer fileUrl={doc.fileUrl} currentPage={currentPage} onPageChange={setCurrentPage}>
                {fields.filter(f => f.page === currentPage).map((f, i) => (
                  <div 
                    key={f.id} 
                    style={{ left: `${f.x}%`, top: `${f.y}%`, transform: 'translate(-50%, -50%)' }}
                    className={`absolute p-4 rounded-2xl border-2 transition-all shadow-xl font-bold text-xs pointer-events-auto cursor-pointer ${step === i ? 'bg-blue-600 text-white scale-110 z-30 ring-8 ring-blue-100' : values[f.id] ? 'bg-green-100 border-green-500 text-green-600' : 'bg-white/95 border-blue-600 text-blue-600 animate-pulse'}`}
                    onClick={() => setStep(i)}
                  >
                    {values[f.id] ? '✓ ' + f.label : f.label}
                  </div>
                ))}
             </PDFViewer>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
           <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
              <h3 className="font-black text-slate-800">פעולה נדרשת</h3>
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-2">
                <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">שדה נוכחי</label>
                <p className="font-black text-blue-900 text-lg">{currentField?.label}</p>
              </div>
              
              <div className="space-y-4">
                 {currentField?.type === FieldType.SIGNATURE ? (
                    <button onClick={() => { setValues({...values, [currentField.id]: 'SIGNED'}); if(step < fields.length-1) setStep(step+1); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <ICONS.Edit className="w-5 h-5" /> חתום כאן
                    </button>
                 ) : (
                    <input 
                      type="text" 
                      placeholder={`הזן ${currentField?.label}...`}
                      className="w-full p-5 border-2 border-slate-100 bg-slate-50 rounded-3xl outline-none focus:bg-white focus:border-blue-600 font-bold transition-all"
                      onChange={(e) => setValues({...values, [currentField.id]: e.target.value})}
                    />
                 )}
                 <div className="flex gap-3">
                   <button disabled={step === 0} onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold hover:bg-slate-200 disabled:opacity-30">הקודם</button>
                   <button disabled={step === fields.length - 1} onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900">הבא</button>
                 </div>
              </div>
           </div>

           <button 
              disabled={Object.keys(values).length < fields.length}
              onClick={handleFinish}
              className={`w-full py-6 font-black rounded-[40px] shadow-2xl transition-all active:scale-95 text-xl ${Object.keys(values).length < fields.length ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-100'}`}
           >
              {Object.keys(values).length < fields.length ? 'נא למלא את כל השדות' : 'סיום וחתימה סופית'}
           </button>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
