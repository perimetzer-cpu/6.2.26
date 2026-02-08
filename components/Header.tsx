
import React from 'react';
import { ICONS } from '../constants';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'contacts' | 'archive' | 'settings') => void;
  onCreateClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onCreateClick }) => {
  const navItems = [
    { id: 'dashboard', label: 'בית', icon: <ICONS.Home className="w-5 h-5" /> },
    { id: 'contacts', label: 'אנשי קשר', icon: <ICONS.Phone className="w-5 h-5" /> },
    { id: 'archive', label: 'מסמכים', icon: <ICONS.File className="w-5 h-5" /> },
    { id: 'settings', label: 'הגדרות', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onViewChange('dashboard')}
        >
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl shadow-blue-200 transition-transform group-hover:scale-105">
            <ICONS.Logo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">SignSmart</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">חתימה חכמה ברגע</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => onViewChange(item.id as any)} 
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                currentView === item.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={onCreateClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <ICONS.Plus className="w-4 h-4" />
            מסמך חדש
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
