export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const downloadText = (filename: string, text: string) => {
  const element = document.createElement('a');
  const file = new Blob([text], {type: 'text/plain'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element); // Required for this to work in FireFox
  element.click();
  document.body.removeChild(element);
};

export const printTranslatedPdf = (title: string, segments: { original: string; translated: string; type: string }[], fontSizePercentage: number = 100) => {
  // Use a unique name to prevent caching issues
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site to download the PDF.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Translated</title>
        <style>
          @media print {
            @page { margin: 2cm; }
            body { -webkit-print-color-adjust: exact; }
          }
          body { 
            font-family: 'Times New Roman', serif; 
            padding: 40px; 
            line-height: 1.6; 
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            font-size: ${fontSizePercentage}%;
          }
          h1 { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .segment { margin-bottom: 24px; page-break-inside: avoid; }
          .original { 
            color: #666; 
            font-size: 0.9em; 
            margin-bottom: 8px; 
            background-color: #f9fafb;
            padding: 8px;
            border-left: 3px solid #e5e7eb;
            display: none; /* Hide original by default for clean reading, optional */
          }
          .translated { 
            color: #000; 
            text-align: justify;
          }
          .heading .translated { 
            font-weight: bold; 
            font-size: 1.4em; 
            margin-top: 30px; 
            color: #111;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            display: block;
          }
          .figure_caption { 
            font-style: italic; 
            background: #f0f9ff;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.9em;
            color: #0369a1;
          }
          .equation {
            font-family: 'Courier New', monospace;
            background: #f8fafc;
            padding: 10px;
            white-space: pre-wrap;
            border: 1px solid #e2e8f0;
            display: block;
            margin: 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 0.9em;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${segments.map(s => {
          // Simple Markdown Table to HTML conversion for PDF
          let content = s.translated;
          if (s.type === 'table' && content.includes('|')) {
             const rows = content.split('\n').filter(r => r.trim().startsWith('|'));
             if (rows.length > 0) {
                 const htmlRows = rows.map((r, i) => {
                     const cols = r.split('|').filter(c => c.trim() !== '').map(c => i === 0 ? `<th>${c.trim()}</th>` : `<td>${c.trim()}</td>`).join('');
                     return `<tr>${cols}</tr>`;
                 }).join('');
                 content = `<table>${htmlRows}</table>`;
             }
          }
          
          return `
          <div class="segment ${s.type}">
            <div class="translated">${content.replace(/\n/g, '<br/>')}</div>
          </div>
        `}).join('')}
        <script>
          setTimeout(() => {
            window.print();
            // Optional: window.close();
          }, 500);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};