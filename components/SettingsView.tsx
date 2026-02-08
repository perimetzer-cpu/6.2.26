
import React, { useState } from 'react';
import { ICONS } from '../constants';

const SettingsView: React.FC = () => {
  const [officeName, setOfficeName] = useState('משרד עורכי דין - כהן ושות\'');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold text-slate-800">הגדרות מערכת ומיתוג</h2>
        <p className="text-slate-500">נהל את זהות המשרד שלך ואת תהליכי האוטומציה.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <ICONS.Logo className="w-5 h-5" />
              </div>
              מיתוג אישי
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">שם המשרד (יופיע בראש המסמכים)</label>
                <input 
                  type="text" 
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">צבע מותג ראשי</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-none"
                    />
                    <span className="text-xs font-mono text-slate-400">{primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">לוגו המשרד</label>
                  <button className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 transition-all">
                    העלה לוגו (PNG/JPG)
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <ICONS.Alert className="w-5 h-5" />
              </div>
              אוטומציה והתראות
            </h3>
            
            <div className="space-y-4">
              {[
                { label: 'שלח תזכורת אוטומטית לאחר 24 שעות', checked: true },
                { label: 'שלח תזכורת אוטומטית לאחר 48 שעות', checked: true },
                { label: 'שלח תזכורת אוטומטית לאחר 72 שעות', checked: true },
                { label: 'בצע הסלמה לעורך הדין אם לא נחתם תוך 4 ימים', checked: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <input type="checkbox" defaultChecked={item.checked} className="w-5 h-5 accent-blue-600" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl shadow-blue-200 space-y-6">
            <h4 className="font-bold">תצוגה מקדימה למובייל</h4>
            <div className="w-full aspect-[9/16] bg-white rounded-2xl shadow-inner p-4 overflow-hidden relative border-4 border-slate-800">
               <div className="h-6 w-1/2 bg-slate-100 rounded mx-auto mb-4"></div>
               <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <ICONS.Logo className="w-6 h-6 text-white" />
               </div>
               <p className="text-[10px] text-center text-slate-400 mb-6">{officeName}</p>
               <div className="space-y-2">
                 <div className="h-2 w-full bg-slate-50 rounded"></div>
                 <div className="h-2 w-full bg-slate-50 rounded"></div>
                 <div className="h-2 w-3/4 bg-slate-50 rounded"></div>
               </div>
               <div className="absolute bottom-4 left-4 right-4 h-10 rounded-xl" style={{ backgroundColor: primaryColor }}></div>
            </div>
          </div>
          <button className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all">
            שמור שינויים
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
