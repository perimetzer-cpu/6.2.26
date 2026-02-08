
import React, { useState, useEffect } from 'react';
import { SmartDocument, Signer, Contact } from '../types';
import { ICONS } from '../constants';

interface ShareModalProps {
  document: SmartDocument;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ document, onClose }) => {
  const [selectedSigner, setSelectedSigner] = useState<Signer | null>(document.signers[0] || null);
  const [method, setMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isLoading, setIsLoading] = useState(false);

  const getLink = (signerId: string) => {
    return `${window.location.origin}${window.location.pathname}?sign=${document.id}&signer=${signerId}`;
  };

  const handleSend = () => {
    if (!selectedSigner) return;
    setIsLoading(true);
    const link = getLink(selectedSigner.id);
    const text = `שלום ${selectedSigner.name}, מצורף קישור לחתימה על המסמך "${document.title}": ${link}`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/${selectedSigner.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.location.href = `mailto:${selectedSigner.email}?subject=${encodeURIComponent('בקשה לחתימה: ' + document.title)}&body=${encodeURIComponent(text)}`;
    }
    
    setTimeout(() => {
      setIsLoading(false);
      alert('הבקשה נשלחה!');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10 space-y-8 animate-slide-up border border-slate-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800">שיגור מסמך לחתימה</h2>
            <p className="text-slate-400 font-bold text-sm">בחר חותם ושיטת הפצה</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100">✕</button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">בחר חותם מהרשימה</label>
            <div className="grid grid-cols-1 gap-2">
              {document.signers.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setSelectedSigner(s)}
                  className={`p-5 border-2 rounded-[28px] flex items-center justify-between transition-all ${selectedSigner?.id === s.id ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}
                >
                  <div className="text-right">
                    <p className="font-black text-slate-800">{s.name || 'חותם ללא שם'}</p>
                    <p className="text-[10px] font-bold text-slate-400">{s.phone} | {s.email}</p>
                  </div>
                  {selectedSigner?.id === s.id && <div className="bg-blue-600 text-white rounded-full p-1"><ICONS.Check className="w-4 h-4" /></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setMethod('whatsapp')} className={`flex-1 py-4 rounded-3xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${method === 'whatsapp' ? 'bg-green-50 border-green-500 text-green-600 shadow-md' : 'border-slate-100 text-slate-400'}`}>
              <ICONS.Phone className="w-5 h-5" /> WhatsApp
            </button>
            <button onClick={() => setMethod('email')} className={`flex-1 py-4 rounded-3xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${method === 'email' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-md' : 'border-slate-100 text-slate-400'}`}>
              <ICONS.Mail className="w-5 h-5" /> Email
            </button>
          </div>
        </div>

        <button 
          onClick={handleSend}
          disabled={isLoading || !selectedSigner}
          className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
        >
          {isLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><ICONS.Share className="w-5 h-5" /> שגר עכשיו</>}
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
