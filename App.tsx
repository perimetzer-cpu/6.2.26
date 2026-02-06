
import React, { useState, useEffect } from 'react';
import { SmartDocument, DocumentStatus, FieldType, Contact } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DocumentEditor from './components/DocumentEditor';
import SignerInterface from './components/SignerInterface';
import ShareModal from './components/ShareModal';
import SettingsView from './components/SettingsView';
import FileUploader from './components/FileUploader';
import ContactsView from './components/ContactsView';

type AppView = 'dashboard' | 'editor' | 'signing' | 'archive' | 'settings' | 'uploader' | 'contacts';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [documents, setDocuments] = useState<SmartDocument[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedDocs = localStorage.getItem('signsmart_docs');
    const savedContacts = localStorage.getItem('signsmart_contacts');

    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs).map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) })));
    }
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('sign')) {
      setSelectedId(params.get('sign'));
      setView('signing');
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('signsmart_docs', JSON.stringify(documents));
      localStorage.setItem('signsmart_contacts', JSON.stringify(contacts));
    }
  }, [documents, contacts, isLoading]);

  const handleDocumentSave = (updated: SmartDocument) => {
    // שמירת אנשי קשר חדשים מתוך רשימת החותמים
    const newContacts: Contact[] = [];
    updated.signers.forEach(s => {
      if (!contacts.find(c => c.phone === s.phone)) {
        newContacts.push({
          id: Math.random().toString(36).substr(2, 9),
          firstName: s.name.split(' ')[0],
          lastName: s.name.split(' ').slice(1).join(' '),
          email: s.email,
          phone: s.phone
        });
      }
    });
    
    if (newContacts.length > 0) setContacts([...contacts, ...newContacts]);
    
    setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
    setView('dashboard');
    setShowShareModal(true);
  };

  // Derive currentDoc from selectedId and documents list
  const currentDoc = documents.find(d => d.id === selectedId);

  return (
    <div className="min-h-screen bg-[#FBFBFE] flex flex-col font-sans" dir="rtl">
      <Header 
        currentView={view === 'archive' || view === 'settings' || view === 'contacts' ? view : 'dashboard'} 
        onViewChange={setView} 
        onCreateClick={() => setView('uploader')} 
      />
      
      <main className="flex-grow container mx-auto px-10 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-blue-600 animate-pulse text-lg">טוען את המערכת...</p>
          </div>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard documents={documents} onEdit={(id) => { setSelectedId(id); setView('editor'); }} onSign={(id) => { setSelectedId(id); setView('signing'); }} onDelete={(id) => setDocuments(docs => docs.filter(d => d.id !== id))} onShare={(id) => { setSelectedId(id); setShowShareModal(true); }} />}
            {view === 'contacts' && <ContactsView contacts={contacts} documents={documents} onAddContact={c => setContacts([...contacts, c])} onDeleteContact={id => setContacts(contacts.filter(c => c.id !== id))} onSendToContact={(c, id) => { setSelectedId(id); setShowShareModal(true); }} onUploadNewForContact={(c, f) => { /* logic */ }} />}
            {view === 'uploader' && <FileUploader onFileSelected={(f) => { 
                const newDoc: SmartDocument = {
                  id: Math.random().toString(36).substr(2, 9),
                  title: f.name.split('.')[0],
                  fileName: f.name,
                  fileUrl: URL.createObjectURL(f),
                  status: DocumentStatus.PENDING,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  signers: [],
                  fields: [],
                  signingOrder: 'SEQUENTIAL',
                  remindersEnabled: true
                };
                setDocuments([newDoc, ...documents]);
                setSelectedId(newDoc.id);
                setView('editor');
            }} onCancel={() => setView('dashboard')} />}
            {view === 'editor' && currentDoc && <DocumentEditor document={currentDoc} onSave={handleDocumentSave} onCancel={() => setView('dashboard')} />}
            {view === 'signing' && currentDoc && <SignerInterface document={currentDoc} onComplete={() => setView('dashboard')} />}
          </>
        )}
      </main>

      {showShareModal && currentDoc && <ShareModal document={currentDoc} onClose={() => setShowShareModal(false)} />}
    </div>
  );
};

export default App;
