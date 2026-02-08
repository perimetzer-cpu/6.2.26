
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { SmartDocument, DocumentStatus, FieldType, Contact, Signer, DocumentField } from './types';
import { ICONS } from './constants';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.10.38';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

// =============================================
// API HELPERS
// =============================================
const API = '/api';

async function apiUpload(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

async function apiSaveDoc(doc: SmartDocument) {
  await fetch(`${API}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) });
}

async function apiFetchDocs(): Promise<SmartDocument[]> {
  try {
    const res = await fetch(`${API}/documents`);
    if (!res.ok) return [];
    const docs = await res.json();
    return docs.map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) }));
  } catch { return []; }
}

async function apiFetchDoc(id: string): Promise<SmartDocument | null> {
  try {
    const res = await fetch(`${API}/documents/${id}`);
    if (!res.ok) return null;
    const d = await res.json();
    return { ...d, createdAt: new Date(d.createdAt) };
  } catch { return null; }
}

async function apiDeleteDoc(id: string) {
  await fetch(`${API}/documents/${id}`, { method: 'DELETE' });
}

async function apiSign(docId: string, data: any) {
  const res = await fetch(`${API}/sign/${docId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

async function apiSendEmail(data: { to: string; signerName: string; docTitle: string; signingLink: string }) {
  const res = await fetch(`${API}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

// =============================================
// UTILITY COMPONENTS
// =============================================

const Loader = ({ message = "טוען..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-4">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-500 font-bold animate-pulse">{message}</p>
  </div>
);

const Toast = ({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] ${colors[type]} text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-slide-up flex items-center gap-3`}>
      {type === 'success' && <ICONS.Check className="w-5 h-5" />}
      {type === 'error' && <ICONS.Alert className="w-5 h-5" />}
      {type === 'info' && <ICONS.Mail className="w-5 h-5" />}
      {message}
      <button onClick={onClose} className="mr-3 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
};

// =============================================
// SIGNATURE PAD
// =============================================

const SignaturePad = ({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e293b';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] || e.changedTouches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { setIsDrawing(false); lastPos.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const save = () => {
    if (!canvasRef.current || !hasContent) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl animate-slide-up border space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800">חתימה דיגיטלית</h3>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>

        <p className="text-sm text-slate-400 font-medium">חתמו באצבע או בעזרת העכבר בשטח הלבן למטה</p>

        <div className="relative border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair touch-none"
            style={{ height: '200px' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-200 font-bold text-lg">חתמו כאן</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={clearCanvas} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">
            נקה חתימה
          </button>
          <button
            onClick={save}
            disabled={!hasContent}
            className={`flex-1 py-4 font-bold rounded-2xl transition-all ${hasContent ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
          >
            אשר חתימה
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// PDF VIEWER
// =============================================

const PDFViewer = ({ fileUrl, currentPage = 1, onPageChange = (_p: number) => {}, children = null }: { fileUrl: any; currentPage?: number; onPageChange?: (p: number) => void; children?: any }) => {
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
        await page.render({ canvasContext: context, viewport }).promise;
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(canvas);
          canvas.className = "w-full shadow-lg rounded-lg";
          setLoading(false);
        }
      } catch (err) { console.error(err); if (isMounted) setLoading(false); }
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

// =============================================
// MAIN APP
// =============================================

const App = () => {
  const [view, setView] = useState<'home' | 'dashboard' | 'contacts' | 'editor' | 'signing' | 'share'>('home');
  const [documents, setDocuments] = useState<SmartDocument[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type });

  useEffect(() => {
    const init = async () => {
      // Check for signing mode first
      const params = new URLSearchParams(window.location.search);
      const signId = params.get('sign');

      if (signId) {
        // External signer - fetch document from server
        const doc = await apiFetchDoc(signId);
        if (doc) {
          setDocuments([doc]);
          setSelectedId(signId);
          setView('signing');
        }
        setIsLoading(false);
        return;
      }

      // Admin mode - load all documents
      const serverDocs = await apiFetchDocs();
      if (serverDocs.length > 0) {
        setDocuments(serverDocs);
      } else {
        // Fallback to localStorage
        const d = localStorage.getItem('signsmart_docs');
        if (d) setDocuments(JSON.parse(d).map((doc: any) => ({ ...doc, createdAt: new Date(doc.createdAt) })));
      }

      const c = localStorage.getItem('signsmart_contacts');
      if (c) setContacts(JSON.parse(c));

      setIsLoading(false);
    };
    init();
  }, []);

  // Sync to localStorage and server
  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('signsmart_docs', JSON.stringify(documents));
    localStorage.setItem('signsmart_contacts', JSON.stringify(contacts));
  }, [documents, contacts, isLoading]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const result = await apiUpload(file);
      const newDoc: SmartDocument = {
        id: Math.random().toString(36).substr(2, 9),
        title: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        fileUrl: result.fileUrl,
        status: DocumentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        signers: [{ id: 's1', name: '', email: '', phone: '', order: 1, hasSigned: false }],
        fields: [],
        signingOrder: 'SEQUENTIAL',
        remindersEnabled: true
      };
      await apiSaveDoc(newDoc);
      setDocuments([newDoc, ...documents]);
      setSelectedId(newDoc.id);
      setView('editor');
      showToast('הקובץ הועלה בהצלחה!');
    } catch (err) {
      showToast('שגיאה בהעלאת הקובץ', 'error');
    }
    setIsLoading(false);
  };

  const handleSaveDoc = async (d: SmartDocument) => {
    const updated = { ...d, status: DocumentStatus.IN_PROGRESS, updatedAt: new Date() };
    setDocuments(docs => docs.map(doc => doc.id === updated.id ? updated : doc));
    await apiSaveDoc(updated);
    setSelectedId(d.id);
    setView('share');
    showToast('המסמך נשמר בהצלחה!');
  };

  const handleDeleteDoc = async (id: string) => {
    setDocuments(docs => docs.filter(d => d.id !== id));
    await apiDeleteDoc(id);
    showToast('המסמך נמחק');
  };

  const currentDoc = documents.find(d => d.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header - Hide in signing mode */}
      {view !== 'signing' && (
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 h-20 flex items-center justify-between sticky top-0 z-50 px-6 md:px-12 shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('home'); setSelectedId(null); }}>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
              <ICONS.Logo className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">SignSmart</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">מערכת חתימה דיגיטלית</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button onClick={() => setView('home')} className={`p-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm ${view === 'home' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <ICONS.Home className="w-5 h-5" /> בית
            </button>
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl font-bold transition-all text-sm ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>מסמכים</button>
            <button onClick={() => setView('contacts')} className={`px-4 py-2 rounded-xl font-bold transition-all text-sm ${view === 'contacts' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>אנשי קשר</button>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <label className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold cursor-pointer shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex items-center gap-2 text-sm">
              <ICONS.Plus className="w-4 h-4" /> העלאת מסמך
              <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </label>
          </nav>
        </header>
      )}

      <main className="flex-grow container mx-auto px-4 md:px-12 py-10">
        {isLoading ? (
          <Loader message="טוען את המערכת..." />
        ) : (
          <>
            {view === 'home' && <HomeDashboard documents={documents} onEdit={(id) => { setSelectedId(id); setView('editor'); }} onDelete={handleDeleteDoc} onShare={(id) => { setSelectedId(id); setView('share'); }} onUpload={handleFileUpload} />}
            {view === 'dashboard' && <HomeDashboard documents={documents} onEdit={(id) => { setSelectedId(id); setView('editor'); }} onShare={(id) => { setSelectedId(id); setView('share'); }} onDelete={handleDeleteDoc} onUpload={handleFileUpload} />}
            {view === 'contacts' && <ContactsView contacts={contacts} setContacts={setContacts} />}
            {view === 'editor' && currentDoc && <EditorView document={currentDoc} contacts={contacts} onSave={handleSaveDoc} onCancel={() => setView('home')} />}
            {view === 'share' && currentDoc && <ShareCenter document={currentDoc} onClose={() => setView('home')} showToast={showToast} />}
            {view === 'signing' && currentDoc && <SignerProcess document={currentDoc} onComplete={() => { setDocuments(docs => docs.map(d => d.id === selectedId ? { ...d, status: DocumentStatus.COMPLETED } : d)); setView('home'); }} showToast={showToast} />}
          </>
        )}
      </main>
    </div>
  );
};

// =============================================
// HOME DASHBOARD
// =============================================

const HomeDashboard = ({ documents, onEdit, onDelete, onShare, onUpload }: any) => {
  const [search, setSearch] = useState('');
  const filtered = documents.filter((d: SmartDocument) => d.title.toLowerCase().includes(search.toLowerCase()));

  const copyLink = (id: string) => {
    const link = `${window.location.origin}${window.location.pathname}?sign=${id}`;
    navigator.clipboard.writeText(link);
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const styles: Record<string, string> = {
      [DocumentStatus.PENDING]: 'bg-slate-100 text-slate-600',
      [DocumentStatus.IN_PROGRESS]: 'bg-amber-50 text-amber-600 border border-amber-100',
      [DocumentStatus.COMPLETED]: 'bg-green-50 text-green-600 border border-green-100',
      [DocumentStatus.EXPIRED]: 'bg-red-50 text-red-600',
      [DocumentStatus.ESCALATED]: 'bg-orange-50 text-orange-600',
    };
    const labels: Record<string, string> = {
      [DocumentStatus.PENDING]: 'טיוטה',
      [DocumentStatus.IN_PROGRESS]: 'ממתין לחתימה',
      [DocumentStatus.COMPLETED]: 'נחתם',
      [DocumentStatus.EXPIRED]: 'פג תוקף',
      [DocumentStatus.ESCALATED]: 'דחוף',
    };
    return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[32px] border shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סה"כ מסמכים</p>
          <p className="text-4xl font-black text-slate-800">{documents.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">ממתינים לחתימה</p>
          <p className="text-4xl font-black text-amber-600">{documents.filter((d: SmartDocument) => d.status === DocumentStatus.IN_PROGRESS).length}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">הושלמו</p>
          <p className="text-4xl font-black text-green-600">{documents.filter((d: SmartDocument) => d.status === DocumentStatus.COMPLETED).length}</p>
        </div>
        <label className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[32px] shadow-lg shadow-blue-200 flex flex-col items-center gap-3 cursor-pointer hover:shadow-blue-300 transition-all text-white">
          <ICONS.Plus className="w-8 h-8" />
          <p className="font-black text-sm">העלאת מסמך חדש</p>
          <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
      </div>

      {/* Document Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white"><ICONS.Dashboard className="w-5 h-5" /></div>
            <h3 className="text-lg font-black text-slate-800">ניהול מסמכים וחתימות</h3>
          </div>
          <div className="relative w-full md:w-80">
            <input type="text" placeholder="חיפוש מסמך..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" />
            <svg className="absolute left-4 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">מסמך</th>
                <th className="px-8 py-5 text-center">סטטוס</th>
                <th className="px-8 py-5 text-center">חותמים</th>
                <th className="px-8 py-5">תאריך</th>
                <th className="px-8 py-5 text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc: SmartDocument) => (
                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><ICONS.File className="w-5 h-5" /></div>
                      <div>
                        <p className="font-bold text-slate-800">{doc.title}</p>
                        <p className="text-[10px] text-slate-400">{doc.fileName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">{getStatusBadge(doc.status)}</td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex justify-center -space-x-2 space-x-reverse">
                      {doc.signers.map((s) => (
                        <div key={s.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${s.hasSigned ? 'bg-green-500' : 'bg-slate-300'}`} title={s.name}>
                          {(s.name || '?')[0]}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className="text-sm text-slate-500 font-medium">{new Intl.DateTimeFormat('he-IL').format(doc.createdAt)}</span></td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(doc.id)} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="עריכה"><ICONS.Edit className="w-4 h-4" /></button>
                      <button onClick={() => { copyLink(doc.id); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="העתק לינק"><ICONS.Share className="w-4 h-4" /></button>
                      <button onClick={() => onShare(doc.id)} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all" title="שלח"><ICONS.Phone className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(doc.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="מחק"><ICONS.Trash className="w-4 h-4" /></button>
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
                      <p className="text-sm">התחילו על ידי העלאת מסמך PDF</p>
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

// =============================================
// EDITOR VIEW
// =============================================

const EditorView = ({ document: initialDoc, contacts, onSave, onCancel }: any) => {
  const [doc, setDoc] = useState<SmartDocument>(initialDoc);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'signers' | 'fields'>('signers');
  const [movingFieldId, setMovingFieldId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const addSigner = () => {
    const newSigner: Signer = { id: Math.random().toString(36).substr(2, 5), name: '', email: '', phone: '', order: doc.signers.length + 1, hasSigned: false };
    setDoc({ ...doc, signers: [...doc.signers, newSigner] });
  };

  const addField = (type: FieldType, label: string) => {
    const newField: DocumentField = { id: Math.random().toString(36).substr(2, 5), type, label, page: currentPage, x: 50, y: 50, required: true, signerId: doc.signers[0]?.id || '' };
    setDoc({ ...doc, fields: [...doc.fields, newField] });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!movingFieldId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top - 44) / (rect.height - 44)) * 100));
    setDoc(prev => ({ ...prev, fields: prev.fields.map(f => f.id === movingFieldId ? { ...f, x, y } : f) }));
  };

  const fieldOptions = [
    { type: FieldType.SIGNATURE, label: 'חתימה', icon: '✍️' },
    { type: FieldType.INITIALS, label: 'ראשי תיבות', icon: 'א"ב' },
    { type: FieldType.DATE, label: 'תאריך', icon: '📅' },
    { type: FieldType.ID_NUMBER, label: 'ת.ז.', icon: '🆔' },
    { type: FieldType.TEXT, label: 'טקסט חופשי', icon: '📝' },
    { type: FieldType.ADDRESS, label: 'כתובת', icon: '📍' },
  ];

  return (
    <div className="flex flex-col h-[82vh] bg-white rounded-[32px] shadow-2xl overflow-hidden border" onMouseMove={handleMouseMove} onMouseUp={() => setMovingFieldId(null)}>
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center bg-white">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-slate-400 font-bold hover:text-slate-800 transition-colors text-sm">← חזרה</button>
          <div className="h-6 w-px bg-slate-200"></div>
          <input
            type="text"
            value={doc.title}
            onChange={e => setDoc({ ...doc, title: e.target.value })}
            className="text-xl font-bold text-slate-800 bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors"
          />
        </div>
        <button onClick={() => onSave(doc)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all text-sm">
          סיום והפצה →
        </button>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-l flex flex-col bg-white">
          <div className="flex border-b">
            <button onClick={() => setActiveTab('signers')} className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'signers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400'}`}>חותמים</button>
            <button onClick={() => setActiveTab('fields')} className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'fields' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400'}`}>שדות חתימה</button>
          </div>

          <div className="flex-grow overflow-y-auto p-5 custom-scrollbar space-y-4">
            {activeTab === 'signers' ? (
              <div className="space-y-4">
                {doc.signers.map((signer, idx) => (
                  <div key={signer.id} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">חותם {idx + 1}</span>
                      {doc.signers.length > 1 && <button onClick={() => setDoc({ ...doc, signers: doc.signers.filter(s => s.id !== signer.id) })} className="text-slate-300 hover:text-red-500 text-xs">✕</button>}
                    </div>
                    <input type="text" placeholder="שם מלא *" value={signer.name}
                      onChange={e => setDoc({ ...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, name: e.target.value } : s) })}
                      className="w-full p-3 border rounded-xl text-xs outline-none focus:border-blue-400 font-bold bg-white" />
                    <input type="email" placeholder="אימייל" value={signer.email}
                      onChange={e => setDoc({ ...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, email: e.target.value } : s) })}
                      className="w-full p-3 border rounded-xl text-xs outline-none focus:border-blue-400 font-bold bg-white" dir="ltr" />
                    <input type="tel" placeholder="טלפון (לוואטסאפ)" value={signer.phone}
                      onChange={e => setDoc({ ...doc, signers: doc.signers.map(s => s.id === signer.id ? { ...s, phone: e.target.value } : s) })}
                      className="w-full p-3 border rounded-xl text-xs outline-none focus:border-blue-400 font-bold bg-white" dir="ltr" />
                  </div>
                ))}
                <button onClick={addSigner} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-400 hover:text-blue-600 transition-all">
                  + הוסף חותם נוסף
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">לחצו להוספת שדה לעמוד {currentPage}</p>
                {fieldOptions.map(opt => (
                  <button key={opt.type} onClick={() => addField(opt.type, opt.label)}
                    className="w-full p-4 border rounded-2xl text-right font-bold text-sm bg-white hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-3">
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
                {doc.fields.filter(f => f.page === currentPage).length > 0 && (
                  <div className="mt-6 pt-4 border-t space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">שדות בעמוד זה</p>
                    {doc.fields.filter(f => f.page === currentPage).map(f => (
                      <div key={f.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-xl text-xs">
                        <span className="font-bold text-blue-700">{f.label}</span>
                        <button onClick={() => setDoc({ ...doc, fields: doc.fields.filter(ff => ff.id !== f.id) })} className="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PDF Canvas */}
        <div className="flex-grow bg-slate-100 p-6 md:p-10 overflow-auto flex justify-center custom-scrollbar">
          <div ref={containerRef} className="w-[600px] relative h-fit">
            <PDFViewer fileUrl={doc.fileUrl} currentPage={currentPage} onPageChange={setCurrentPage}>
              {doc.fields.filter(f => f.page === currentPage).map(field => (
                <div key={field.id} onMouseDown={e => { e.stopPropagation(); setMovingFieldId(field.id); }}
                  style={{ left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute p-3 bg-white border-2 border-blue-500 rounded-xl shadow-lg pointer-events-auto cursor-move z-20 flex items-center gap-2 select-none hover:shadow-xl transition-shadow ${movingFieldId === field.id ? 'scale-110 opacity-70 ring-4 ring-blue-200' : ''}`}>
                  <div className="text-[10px] font-black text-blue-800">{field.label}</div>
                  <select className="text-[8px] bg-slate-50 border rounded p-1 outline-none font-bold" value={field.signerId}
                    onChange={e => setDoc({ ...doc, fields: doc.fields.map(f => f.id === field.id ? { ...f, signerId: e.target.value } : f) })}>
                    {doc.signers.map(s => <option key={s.id} value={s.id}>{s.name || `חותם ${s.order}`}</option>)}
                  </select>
                  <button onClick={() => setDoc({ ...doc, fields: doc.fields.filter(f => f.id !== field.id) })} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================
// SHARE CENTER
// =============================================

const ShareCenter = ({ document: doc, onClose, showToast }: { document: SmartDocument; onClose: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null);

  const getLink = (signerId: string) => {
    const base = window.location.href.split('?')[0];
    return `${base}?sign=${doc.id}&signer=${signerId}`;
  };

  const sendWhatsApp = (signer: Signer) => {
    setSendingId(signer.id);
    const link = getLink(signer.id);
    const text = `שלום ${signer.name},\n\nנא לחתום על המסמך "${doc.title}".\nהחתימה מתבצעת אונליין ולוקחת פחות מדקה.\n\nקישור לחתימה:\n${link}`;
    window.open(`https://wa.me/${signer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    setTimeout(() => setSendingId(null), 1000);
  };

  const sendEmail = async (signer: Signer) => {
    if (!signer.email) {
      showToast('נא להזין כתובת אימייל לחותם זה', 'error');
      return;
    }
    setEmailSendingId(signer.id);
    try {
      const result = await apiSendEmail({
        to: signer.email,
        signerName: signer.name,
        docTitle: doc.title,
        signingLink: getLink(signer.id)
      });
      if (result.success) {
        showToast(`אימייל נשלח בהצלחה ל-${signer.email}`, 'success');
      } else {
        showToast('שגיאה בשליחת האימייל', 'error');
      }
    } catch {
      showToast('שגיאה בשליחת האימייל', 'error');
    }
    setEmailSendingId(null);
  };

  const copyLink = (signer: Signer) => {
    navigator.clipboard.writeText(getLink(signer.id));
    showToast('הקישור הועתק ללוח!', 'info');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[32px] p-10 shadow-2xl animate-slide-up border">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">מרכז הפצה וחתימות</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">שלח לינק חתימה בדואל, וואטסאפ או העתק קישור</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all">✕</button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl text-white"><ICONS.File className="w-5 h-5" /></div>
          <div>
            <p className="font-bold text-blue-800">{doc.title}</p>
            <p className="text-xs text-blue-500">{doc.fileName} | {doc.signers.length} חותמים</p>
          </div>
        </div>

        <div className="overflow-hidden border rounded-2xl">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">חותם</th>
                <th className="px-6 py-4">סטטוס</th>
                <th className="px-6 py-4">שליחה</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {doc.signers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-700">{s.name || 'ללא שם'}</p>
                    <p className="text-[10px] text-slate-400">{s.email && `${s.email} | `}{s.phone}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${s.hasSigned ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {s.hasSigned ? 'חתם' : 'ממתין'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2">
                      {/* WhatsApp */}
                      <button disabled={!s.phone || sendingId === s.id} onClick={() => sendWhatsApp(s)}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all flex items-center gap-1.5 font-bold text-[11px] disabled:opacity-40">
                        {sendingId === s.id ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <ICONS.Phone className="w-4 h-4" />}
                        וואטסאפ
                      </button>
                      {/* Email */}
                      <button disabled={emailSendingId === s.id} onClick={() => sendEmail(s)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5 font-bold text-[11px] disabled:opacity-40">
                        {emailSendingId === s.id ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <ICONS.Mail className="w-4 h-4" />}
                        דוא"ל
                      </button>
                      {/* Copy Link */}
                      <button onClick={() => copyLink(s)} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all" title="העתק קישור">
                        <ICONS.Share className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-center">
          <button onClick={onClose} className="px-12 py-4 bg-slate-800 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-900 transition-all">
            סיום וסגירה
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// CONTACTS VIEW
// =============================================

const ContactsView = ({ contacts, setContacts }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newC, setNewC] = useState({ firstName: '', lastName: '', phone: '', email: '' });

  const handleAdd = () => {
    if (!newC.firstName || !newC.phone) return;
    setContacts([...contacts, { ...newC, id: Math.random().toString(36).substr(2, 9) }]);
    setNewC({ firstName: '', lastName: '', phone: '', email: '' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">אנשי קשר</h2>
          <p className="text-slate-400 font-medium">ניהול אנשי קשר לשליחה מהירה</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl flex items-center gap-2 text-sm">
          <ICONS.Plus className="w-5 h-5" /> הוסף איש קשר
        </button>
      </div>

      <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
            <tr><th className="px-8 py-6">שם מלא</th><th className="px-8 py-6">טלפון</th><th className="px-8 py-6">אימייל</th><th className="px-8 py-6 text-left">פעולות</th></tr>
          </thead>
          <tbody className="divide-y">
            {contacts.map((c: Contact) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 font-bold text-slate-700">{c.firstName} {c.lastName}</td>
                <td className="px-8 py-6 text-slate-500">{c.phone}</td>
                <td className="px-8 py-6 text-slate-400 text-sm">{c.email || '—'}</td>
                <td className="px-8 py-6 text-left">
                  <button onClick={() => setContacts(contacts.filter((con: Contact) => con.id !== c.id))} className="text-red-300 hover:text-red-500 transition-colors"><ICONS.Trash className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={4} className="py-16 text-center text-slate-300 font-bold">אין אנשי קשר שמורים</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-10 space-y-5 shadow-2xl border animate-slide-up">
            <h3 className="text-xl font-black text-slate-800">איש קשר חדש</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="שם פרטי *" value={newC.firstName} onChange={e => setNewC({ ...newC, firstName: e.target.value })} className="p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
              <input placeholder="שם משפחה" value={newC.lastName} onChange={e => setNewC({ ...newC, lastName: e.target.value })} className="p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
            </div>
            <input placeholder="טלפון *" value={newC.phone} onChange={e => setNewC({ ...newC, phone: e.target.value })} className="w-full p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" dir="ltr" />
            <input placeholder="אימייל (אופציונלי)" value={newC.email} onChange={e => setNewC({ ...newC, email: e.target.value })} className="w-full p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" dir="ltr" />
            <div className="flex gap-4 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">ביטול</button>
              <button onClick={handleAdd} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all">שמור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================
// SIGNER PROCESS (Client-facing signing page)
// =============================================

const SignerProcess = ({ document: doc, onComplete, showToast }: { document: SmartDocument; onComplete: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, any>>({});
  const [signatureDataUrls, setSignatureDataUrls] = useState<Record<string, string>>({});
  const [showSignPad, setShowSignPad] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fields = doc.fields;
  const currentField = fields[step];

  const handleSignature = (dataUrl: string) => {
    if (!currentField) return;
    setSignatureDataUrls(prev => ({ ...prev, [currentField.id]: dataUrl }));
    setValues(prev => ({ ...prev, [currentField.id]: 'SIGNED' }));
    setShowSignPad(false);
    if (step < fields.length - 1) setStep(step + 1);
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      const signatures = fields
        .filter(f => f.type === FieldType.SIGNATURE && signatureDataUrls[f.id])
        .map(f => ({
          fieldId: f.id,
          dataUrl: signatureDataUrls[f.id],
          x: f.x,
          y: f.y,
          page: f.page
        }));

      const signerName = doc.signers[0]?.name || 'לקוח';
      const signerEmail = doc.signers[0]?.email || '';

      const result = await apiSign(doc.id, {
        signatures,
        signerName,
        signerEmail,
        fieldValues: values
      });

      if (result.success) {
        showToast('המסמך נחתם בהצלחה! עותק נשלח למשרד.', 'success');
      }
    } catch (err) {
      console.error('Signing error:', err);
      showToast('שגיאה בתהליך החתימה', 'error');
    }
    setIsFinishing(false);
    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-slide-up">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
          <ICONS.Check className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-800">החתימה הושלמה בהצלחה!</h2>
          <p className="text-slate-500 text-lg">המסמך "<strong>{doc.title}</strong>" נחתם ונשלח למשרד.</p>
          <p className="text-slate-400 text-sm">עותק חתום נשלח לדוא"ל: peri@bettylaw.co.il</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6 inline-block">
          <p className="text-green-700 font-bold text-sm">המסמך החתום ישלח אליכם בדוא"ל לאישור.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up max-w-5xl mx-auto">
      {isFinishing && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center">
          <Loader message="מעבד חתימה ושולח למשרד..." />
        </div>
      )}

      {showSignPad && (
        <SignaturePad
          onSave={handleSignature}
          onCancel={() => setShowSignPad(false)}
        />
      )}

      {/* Header */}
      <div className="bg-white p-8 rounded-[32px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
            <ICONS.Logo className="w-8 h-8" />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-800">חתימה על: {doc.title}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">נא למלא את כל השדות המסומנים</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">שלב {step + 1} / {fields.length}</span>
          <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full" style={{ width: `${((step + 1) / Math.max(fields.length, 1)) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* PDF Area */}
        <div className="flex-grow bg-slate-200/30 p-6 rounded-[32px] border shadow-inner flex justify-center overflow-auto min-h-[65vh]">
          <div className="w-full max-w-[620px] relative">
            <PDFViewer fileUrl={doc.fileUrl} currentPage={currentPage} onPageChange={setCurrentPage}>
              {fields.filter(f => f.page === currentPage).map((f, i) => {
                const globalIdx = fields.indexOf(f);
                return (
                  <div
                    key={f.id}
                    style={{ left: `${f.x}%`, top: `${f.y}%`, transform: 'translate(-50%, -50%)' }}
                    className={`absolute p-4 rounded-2xl border-2 transition-all shadow-xl font-bold text-xs pointer-events-auto cursor-pointer
                      ${step === globalIdx ? 'bg-blue-600 text-white scale-110 z-30 ring-8 ring-blue-100 animate-pulse' :
                        values[f.id] ? 'bg-green-100 border-green-500 text-green-700' :
                        'bg-white/95 border-blue-400 text-blue-600'}`}
                    onClick={() => setStep(globalIdx)}
                  >
                    {values[f.id] ? (
                      signatureDataUrls[f.id] ? (
                        <img src={signatureDataUrls[f.id]} alt="חתימה" className="h-8 w-auto" />
                      ) : `✓ ${f.label}`
                    ) : f.label}
                  </div>
                );
              })}
            </PDFViewer>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[32px] border shadow-sm space-y-6">
            <h3 className="font-black text-slate-800">פעולה נדרשת</h3>
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
              <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">שדה נוכחי</label>
              <p className="font-black text-blue-900 text-lg">{currentField?.label || 'לא נבחר'}</p>
            </div>

            <div className="space-y-4">
              {currentField?.type === FieldType.SIGNATURE || currentField?.type === FieldType.INITIALS ? (
                <button
                  onClick={() => setShowSignPad(true)}
                  className={`w-full py-5 font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2
                    ${signatureDataUrls[currentField.id]
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
                >
                  <ICONS.Edit className="w-5 h-5" />
                  {signatureDataUrls[currentField.id] ? 'חתימה מוכנה - לחץ לשנות' : 'לחץ לחתום כאן'}
                </button>
              ) : currentField?.type === FieldType.DATE ? (
                <input
                  type="date"
                  className="w-full p-5 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-600 font-bold transition-all"
                  value={values[currentField.id] || ''}
                  onChange={(e) => { setValues({ ...values, [currentField.id]: e.target.value }); if (step < fields.length - 1) setTimeout(() => setStep(step + 1), 300); }}
                />
              ) : (
                <input
                  type="text"
                  placeholder={`הזן ${currentField?.label || ''}...`}
                  className="w-full p-5 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-600 font-bold transition-all"
                  value={values[currentField?.id] || ''}
                  onChange={(e) => setValues({ ...values, [currentField.id]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && step < fields.length - 1) setStep(step + 1); }}
                />
              )}

              <div className="flex gap-3">
                <button disabled={step === 0} onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold hover:bg-slate-200 disabled:opacity-30 transition-all">הקודם</button>
                <button disabled={step >= fields.length - 1} onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all disabled:opacity-30">הבא</button>
              </div>
            </div>
          </div>

          {/* Finish Button */}
          <button
            disabled={Object.keys(values).length < fields.length}
            onClick={handleFinish}
            className={`w-full py-6 font-black rounded-[32px] shadow-2xl transition-all active:scale-95 text-xl
              ${Object.keys(values).length < fields.length
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-200 shadow-lg'}`}
          >
            {Object.keys(values).length < fields.length
              ? `נותרו ${fields.length - Object.keys(values).length} שדות`
              : 'סיום וחתימה סופית'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// MOUNT
// =============================================

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
