
import React, { useState } from 'react';
import { SmartDocument, DocumentStatus } from '../types';
import { ICONS } from '../constants';

interface DashboardProps {
  documents: SmartDocument[];
  onEdit: (id: string) => void;
  onSign: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, onEdit, onSign, onDelete, onShare }) => {
  const [search, setSearch] = useState('');

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    doc.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const copyLink = (id: string) => {
    // Generate a simple link for demonstration. In real app, would use document specific signing link.
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
      [DocumentStatus.IN_PROGRESS]: 'ממתין לחתימה',
      [DocumentStatus.COMPLETED]: 'הושלם',
      [DocumentStatus.EXPIRED]: 'פג תוקף',
      [DocumentStatus.ESCALATED]: 'הסלמה',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800">לוח בקרה ראשי</h2>
          <p className="text-slate-400 font-bold">צפה בסטטוס המסמכים ונהל את תהליך החתימה</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סה"כ נשלחו</span>
            <span className="text-2xl font-black text-slate-800">{documents.length}</span>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ממתינים</span>
            <span className="text-2xl font-black text-blue-600">{documents.filter(d => d.status === DocumentStatus.IN_PROGRESS).length}</span>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">הושלמו</span>
            <span className="text-2xl font-black text-green-600">{documents.filter(d => d.status === DocumentStatus.COMPLETED).length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 p-2.5 rounded-2xl text-white">
                <ICONS.Home className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-black text-slate-800">מסמכים אחרונים</h3>
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
                <th className="px-8 py-5">שם המסמך</th>
                <th className="px-8 py-5 text-center">סטטוס</th>
                <th className="px-8 py-5">תאריך יצירה</th>
                <th className="px-8 py-5 text-left">פעולות מהירות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
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
                  <td className="px-8 py-6">
                    <span className="text-sm text-slate-500 font-medium">
                      {new Intl.DateTimeFormat('he-IL').format(new Date(doc.createdAt))}
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
                        onClick={() => onEdit(doc.id)} 
                        className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                        title="ערוך"
                      >
                        <ICONS.Edit className="w-4 h-4" />
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
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <ICONS.File className="w-16 h-16 opacity-20" />
                      <p className="text-lg font-bold">אין מסמכים להצגה</p>
                      <p className="text-sm">העלה מסמך חדש כדי להתחיל</p>
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

export default Dashboard;
