
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  onCancel: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected, onCancel }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-800">טעינת מסמך חדש</h2>
        <p className="text-slate-500">בחר קובץ PDF או Word כדי להתחיל בתהליך החתימה</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-4 border-dashed rounded-[40px] p-16 transition-all duration-300 flex flex-col items-center justify-center gap-6 group ${
          isDragging 
          ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <div className={`p-6 rounded-3xl transition-all duration-500 ${isDragging ? 'bg-blue-600 text-white rotate-12' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50'}`}>
          <ICONS.File className="w-16 h-16" />
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-slate-700">גרור ושחרר קובץ כאן</p>
          <p className="text-slate-400 font-medium">או לחץ כדי לבחור קובץ מהמחשב</p>
        </div>

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div> PDF
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div> Word
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 font-bold transition-colors"
        >
          חזרה ללוח הבקרה
        </button>
      </div>
    </div>
  );
};

export default FileUploader;
