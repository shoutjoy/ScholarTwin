
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is set
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ExternalPdfViewerProps {
  pdfUrl: string; // Blob URL
  onClose: () => void;
  scrollPercentage: number; // 0 to 1
}

const ExternalPdfViewer: React.FC<ExternalPdfViewerProps> = ({ pdfUrl, onClose, scrollPercentage }) => {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const externalWindowRef = useRef<Window | null>(null);

  // 1. Open Window on Mount
  useEffect(() => {
    const width = 1000;
    const height = window.screen.availHeight * 0.9;
    const left = window.screen.availWidth - width - 20; 
    
    const newWindow = window.open(
      '', 
      'ScholarTwinPDFViewer', 
      `width=${width},height=${height},left=${left},top=50,resizable=yes,scrollbars=yes`
    );

    if (newWindow) {
      externalWindowRef.current = newWindow;
      
      // Basic Setup
      newWindow.document.title = "PDF Preview (Synced)";
      newWindow.document.body.style.margin = "0";
      newWindow.document.body.style.backgroundColor = "#525659"; // Acrobat Reader dark gray style
      newWindow.document.body.style.overflowY = "auto"; 
      
      // Reset body content to ensure clean state on reload
      newWindow.document.body.innerHTML = '';

      // Create Container
      const container = newWindow.document.createElement('div');
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.padding = "20px";
      container.style.gap = "10px";
      container.id = "pdf-root";
      newWindow.document.body.appendChild(container);
      
      setContainerEl(container);

      // Handle Close
      newWindow.onbeforeunload = () => {
        onClose();
        return null; // Some browsers need this
      };

      // Add Styles
      const style = newWindow.document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #333; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: #aaa; }
        body { font-family: sans-serif; }
        canvas { box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
      `;
      newWindow.document.head.appendChild(style);
    } else {
        alert("Pop-up blocked. Please allow pop-ups to see the detached PDF view.");
        onClose();
    }

    return () => {
      // Optional: Close window on unmount? 
      // Usually better to keep it open if user navigates, but here we sync lifecycle.
      if (externalWindowRef.current) {
        externalWindowRef.current.close();
      }
    };
  }, []); // Run once on mount

  // 2. Sync Scroll
  useEffect(() => {
    if (externalWindowRef.current && scrollPercentage >= 0) {
      const win = externalWindowRef.current;
      const docHeight = win.document.body.scrollHeight;
      const winHeight = win.innerHeight;
      
      // Calculate scroll position
      const scrollTo = (docHeight - winHeight) * scrollPercentage;
      
      win.scrollTo({
          top: scrollTo,
          behavior: 'auto' // Use auto for instant sync to avoid laggy feeling
      });
    }
  }, [scrollPercentage]);

  // Render PDF contents into the portal
  if (!containerEl) return null;

  return ReactDOM.createPortal(
    <PdfRenderer pdfUrl={pdfUrl} />,
    containerEl
  );
};

// Internal component to render pages inside the portal
const PdfRenderer: React.FC<{ pdfUrl: string }> = ({ pdfUrl }) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState(0);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

    // 1. Load Document
    useEffect(() => {
        const loadPdf = async () => {
            try {
                // FIX: Add disableFontFace to prevent font rendering issues across windows
                const loadingTask = pdfjs.getDocument({
                    url: pdfUrl,
                    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
                    disableFontFace: true // CRITICAL FIX for "Garbled text in new window"
                });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                // Reset refs array size
                canvasRefs.current = new Array(pdf.numPages).fill(null);
            } catch (error) {
                console.error("Error rendering PDF in popup:", error);
            }
        };
        loadPdf();
    }, [pdfUrl]);

    // 2. Render Pages
    useEffect(() => {
        if (!pdfDoc || numPages === 0) return;

        const renderPages = async () => {
            for (let i = 1; i <= numPages; i++) {
                const canvas = canvasRefs.current[i-1];
                if (canvas) {
                    if (canvas.getAttribute('data-rendered') === 'true') continue;

                    const page = await pdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        canvas.style.width = "100%";
                        canvas.style.maxWidth = "100%";
                        canvas.style.height = "auto";
                        
                        await page.render({
                            canvasContext: context,
                            viewport: viewport
                        }).promise;
                        
                        canvas.setAttribute('data-rendered', 'true');
                    }
                }
            }
        };
        renderPages();
    }, [pdfDoc, numPages]);

    return (
        <>
            {Array.from({ length: numPages }, (_, i) => (
                <div key={i} style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', marginBottom: '10px' }}>
                     <canvas 
                        ref={(el) => { canvasRefs.current[i] = el; }} 
                     />
                </div>
            ))}
            {numPages === 0 && <div style={{color: 'white', marginTop: '20px'}}>Loading PDF...</div>}
        </>
    );
}

export default ExternalPdfViewer;
