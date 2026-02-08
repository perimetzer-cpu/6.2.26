
import React, { useState, useRef } from 'react';
import { SmartDocument, FieldType, DocumentField } from '../types';
import { ICONS } from '../constants';
import PDFViewer from './PDFViewer';

interface SignerInterfaceProps {
  document: SmartDocument;
  onComplete: () => void;
}

const SignerInterface: React.FC<SignerInterfaceProps> = ({ document: doc, onComplete }) => {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSignModal, setShowSignModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fields = doc.fields;
  const currentField = fields[step];

  const handleNext = () => {
    if (step < fields.length - 1) {
      setStep(step + 1);
      // Auto scroll to next field could be added here
    } else {
      onComplete();
    }
  };

  const handleFieldClick = (index: number) => {
    setStep(index);
    if (fields[index].type === FieldType.SIGNATURE) {
      setShowSignModal(true);
    }
  };

  const saveSignature = () => {
    // In a real app, we'd export the canvas to dataUrl
    setValues({...values, [currentField.id]: 'SIGNED'});
    setShowSignModal(false);
    handleNext();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <ICONS.Logo className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{doc.title}</h2>
            <p className="text-xs text-slate-400">נא למלא את כל השדות המסומנים</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
            {Math.round(((Object.keys(values).length) / fields.length) * 100)}% הושלם
          </span>
          <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-700" 
              style={{ width: `${(Object.keys(values).length / fields.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Document Viewing Area */}
        <div className="flex-grow bg-slate-100 rounded-3xl p-8 border shadow-inner flex justify-center">
          <div className="w-full max-w-[620px] relative">
            {doc.fileUrl && (
              <PDFViewer fileUrl={doc.fileUrl}>
                {fields.map((field, idx) => (
                  <button
                    key={field.id}
                    onClick={() => handleFieldClick(idx)}
                    style={{ left: `${field.x}%`, top: `${field.y}%`, transform: 'translate(-50%, -50%)' }}
                    className={`absolute p-3 rounded-xl border-2 transition-all pointer-events-auto flex items-center gap-2 shadow-lg ${
                      values[field.id] 
                      ? 'bg-green-50 border-green-500 text-green-600' 
                      : step === idx 
                        ? 'bg-blue-600 border-blue-400 text-white scale-110 z-30 ring-4 ring-blue-100' 
                        : 'bg-white/90 border-blue-600 text-blue-600 animate-pulse'
                    }`}
                  >
                    {values[field.id] ? <ICONS.Check className="w-4 h-4" /> : <ICONS.Edit className="w-4 h-4" />}
                    <span className="text-[10px] font-bold whitespace-nowrap">{values[field.id] ? 'מולא' : field.label}</span>
                  </button>
                ))}
              </PDFViewer>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">הנחיות לחתימה</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              לחץ על השדות הכחולים המהבהבים על גבי המסמך כדי למלא את המידע הנדרש. בסיום, לחץ על הכפתור "סיים ושגר".
            </p>
            
            <div className="h-px bg-slate-100"></div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">שדה נוכחי</label>
              <div className="p-4 bg-slate-50 rounded-2xl border border-blue-100">
                <p className="text-sm font-bold text-blue-600">{currentField?.label}</p>
                <p className="text-[10px] text-slate-400 mt-1">נא להשלים שלב זה</p>
              </div>
            </div>

            {currentField?.type !== FieldType.SIGNATURE && (
              <div className="space-y-3">
                 <input 
                  type="text" 
                  value={values[currentField?.id] || ''}
                  onChange={(e) => setValues({...values, [currentField.id]: e.target.value})}
                  placeholder={`הזן ${currentField?.label}...`}
                  className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm focus:border-blue-500 outline-none transition-all"
                />
                <button 
                  onClick={handleNext}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all active:scale-95"
                >
                  המשך לשדה הבא
                </button>
              </div>
            )}
          </div>

          <button 
            disabled={Object.keys(values).length < fields.length}
            onClick={onComplete}
            className={`w-full py-5 font-extrabold rounded-3xl shadow-xl transition-all active:scale-[0.98] ${
              Object.keys(values).length < fields.length 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
            }`}
          >
            {Object.keys(values).length < fields.length ? 'נא למלא את כל השדות' : 'סיים ושגר מסמך'}
          </button>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">חתימה אלקטרונית</h3>
              <p className="text-sm text-slate-400 font-medium">חתום בתוך המסגרת באמצעות העכבר או האצבע</p>
            </div>

            <div className="border-4 border-dashed border-slate-100 rounded-3xl p-2 bg-slate-50 relative">
              <canvas 
                ref={canvasRef} 
                width={500} height={250} 
                className="w-full h-56 bg-white rounded-2xl shadow-inner cursor-crosshair"
                onMouseDown={(e) => {
                   const ctx = canvasRef.current?.getContext('2d');
                   if (!ctx) return;
                   ctx.beginPath();
                   ctx.lineWidth = 3;
                   ctx.lineCap = 'round';
                   ctx.strokeStyle = '#1e3a8a';
                   const rect = canvasRef.current!.getBoundingClientRect();
                   ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                   
                   const draw = (moveEvent: MouseEvent) => {
                      ctx.lineTo(moveEvent.clientX - rect.left, moveEvent.clientY - rect.top);
                      ctx.stroke();
                   };
                   
                   window.addEventListener('mousemove', draw);
                   window.addEventListener('mouseup', () => window.removeEventListener('mousemove', draw), { once: true });
                }}
              />
              <button 
                onClick={() => {
                  const ctx = canvasRef.current?.getContext('2d');
                  ctx?.clearRect(0, 0, 500, 250);
                }} 
                className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 hover:text-red-500 bg-white/80 px-2 py-1 rounded-full transition-colors"
              >נקה חתימה</button>
            </div>

            <div className="flex gap-4">
               <button 
                onClick={() => setShowSignModal(false)}
                className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all"
              >ביטול</button>
              <button 
                onClick={saveSignature}
                className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
              >אשר וחתום</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignerInterface;
