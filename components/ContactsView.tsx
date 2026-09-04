
import React, { useState, useRef } from 'react';
import { Contact, SmartDocument } from '../types';
import { ICONS } from '../constants';

interface ContactsViewProps {
  contacts: Contact[];
  documents: SmartDocument[];
  onAddContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onSendToContact: (contact: Contact, docId: string) => void;
  onUploadNewForContact: (contact: Contact, file: File) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ 
  contacts, 
  documents, 
  onAddContact, 
  onDeleteContact, 
  onSendToContact,
  onUploadNewForContact
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    onAddContact({
      id: Math.random().toString(36).substr(2, 9),
      ...newContact
    });
    setNewContact({ firstName: '', lastName: '', email: '', phone: '' });
    setShowAddModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && showDocPicker) {
      onUploadNewForContact(showDocPicker, e.target.files[0]);
      setShowDocPicker(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">אנשי קשר</h2>
          <p className="text-sm text-slate-500">נהל את רשימת הלקוחות והחברים הקבועה שלך</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <ICONS.Plus className="w-5 h-5" /> איש קשר חדש
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
            <tr>
              <th className="px-6 py-4">שם מלא</th>
              <th className="px-6 py-4">אימייל (רשות)</th>
              <th className="px-6 py-4">טלפון</th>
              <th className="px-6 py-4">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map(contact => (
              <tr key={contact.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-5 font-bold text-slate-700">{contact.firstName} {contact.lastName}</td>
                <td className="px-6 py-5 text-sm text-slate-400">{contact.email || '—'}</td>
                <td className="px-6 py-5 text-sm text-slate-500">{contact.phone}</td>
                <td className="px-6 py-5">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowDocPicker(contact)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
                    >
                      <ICONS.Mail className="w-4 h-4" /> שלח מסמך
                    </button>
                    <button 
                      onClick={() => onDeleteContact(contact.id)}
                      className="p-2 text-red-300 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <ICONS.Trash className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-300 font-bold">אין אנשי קשר שמורים במערכת</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Contact */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white w-full max-w-md rounded-[40px] p-8 space-y-4 shadow-2xl animate-slide-up border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-2">הוספת איש קשר חדש</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">שם פרטי</label>
                <input required placeholder="ישראל" className="w-full p-3 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" value={newContact.firstName} onChange={e => setNewContact({...newContact, firstName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">שם משפחה</label>
                <input required placeholder="ישראלי" className="w-full p-3 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" value={newContact.lastName} onChange={e => setNewContact({...newContact, lastName: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">כתובת אימייל (אופציונלי)</label>
              <input type="email" placeholder="example@mail.com" className="w-full p-3 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">מספר טלפון</label>
              <input required placeholder="050-0000000" className="w-full p-3 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all">ביטול</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-50">שמור איש קשר</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Select Document to Send */}
      {showDocPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-8 space-y-6 shadow-2xl animate-slide-up border border-slate-100">
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">בחר מסמך לשליחה</h3>
              <p className="text-sm text-slate-400 mt-1">שולח אל: {showDocPicker.firstName} {showDocPicker.lastName}</p>
            </div>

            {/* Quick Upload Section */}
            <div className="p-4 border-2 border-dashed border-blue-200 rounded-3xl bg-blue-50/30 text-center group hover:border-blue-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                  <ICONS.Plus className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-blue-900">טען מסמך חדש לשליחה מיידית</p>
                <p className="text-[10px] text-blue-400">PDF או Word</p>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">או בחר מהמסמכים הקיימים:</p>
              {documents.map(doc => (
                <button 
                  key={doc.id}
                  onClick={() => {
                    onSendToContact(showDocPicker, doc.id);
                    setShowDocPicker(null);
                  }}
                  className="w-full p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-all text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 rounded-lg transition-colors"><ICONS.File className="w-5 h-5" /></div>
                    <span className="font-bold text-slate-700 text-sm">{doc.title}</span>
                  </div>
                  <ICONS.Plus className="w-4 h-4 text-slate-200 group-hover:text-blue-400" />
                </button>
              ))}
              {documents.length === 0 && (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400">אין מסמכים קיימים</p>
                </div>
              )}
            </div>
            
            <button onClick={() => setShowDocPicker(null)} className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">סגור</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
