
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.10.38';

// Initialize the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  onLoadSuccess?: (numPages: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  children?: React.ReactNode;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, onLoadSuccess, currentPage = 1, onPageChange, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const renderPDF = async () => {
      if (!fileUrl) return;
      setLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        
        if (isMounted) {
          setNumPages(pdf.numPages);
          if (onLoadSuccess) onLoadSuccess(pdf.numPages);
        }

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(canvas);
          canvas.className = "w-full h-auto shadow-lg rounded-sm";
          setLoading(false);
        }
      } catch (err) {
        console.error("PDF Render Error:", err);
        if (isMounted) {
          setError("לא ניתן היה לטעון את הקובץ. וודא שמדובר בקובץ PDF תקין.");
          setLoading(false);
        }
      }
    };

    renderPDF();
    return () => { isMounted = false; };
  }, [fileUrl, currentPage]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-blue-600 animate-pulse">טוען עמוד {currentPage}...</p>
        </div>
      )}
      
      {error && (
        <div className="p-8 text-center bg-red-50 rounded-2xl border-2 border-red-100 max-w-md">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold">נסה שוב</button>
        </div>
      )}

      <div className="w-full flex justify-between items-center mb-4 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg z-20">
        <button 
          disabled={currentPage <= 1} 
          onClick={() => onPageChange?.(currentPage - 1)}
          className="p-1 hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <span className="text-xs font-bold">עמוד {currentPage} מתוך {numPages}</span>
        <button 
          disabled={currentPage >= numPages} 
          onClick={() => onPageChange?.(currentPage + 1)}
          className="p-1 hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div ref={containerRef} className="relative z-0 w-full overflow-hidden rounded-sm border shadow-md bg-white">
        {/* PDF Canvas will be injected here */}
      </div>
      
      {/* Overlay for fields */}
      {!loading && !error && (
        <div className="absolute inset-0 z-10 pointer-events-none mt-[44px]">
          {children}
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
