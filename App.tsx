
import React, { useState, useEffect } from 'react';
import { TranslationTone, PaperSegment, VocabularyItem, ConclusionSummary, PaperMetadata, User } from './types';
import { fileToBase64, downloadText, printTranslatedPdf } from './services/fileHelper';
import { analyzePdf, extractVocabulary, generateConclusion, findReferenceDetails } from './services/geminiService';
import { authService } from './services/authService';
import FileUpload from './components/FileUpload';
import TwinView from './components/TwinView';
import ToolsPanel from './components/ToolsPanel';
import AuthModal from './components/AuthModal';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // App State
  const [segments, setSegments] = useState<PaperSegment[]>([]);
  const [metadata, setMetadata] = useState<PaperMetadata | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  const [tone, setTone] = useState<TranslationTone>(TranslationTone.ACADEMIC);
  const [pageRange, setPageRange] = useState<string>('');
  const [currentActiveRange, setCurrentActiveRange] = useState<string>(''); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [conclusion, setConclusion] = useState<ConclusionSummary | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);

  // Init Auth
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [selectedFile]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setShowAdmin(false);
    handleRemoveFile();
  };

  // --- Core App Logic (Same as before) ---
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSegments([]); 
    setMetadata(null);
    setVocabulary([]);
    setConclusion(null);
    setPageRange('');
    setCurrentActiveRange('');
  };

  const executeTranslation = async (range: string | undefined) => {
    if (!selectedFile) return;
    try {
      setIsProcessing(true);
      setSegments([]); 
      
      const base64 = await fileToBase64(selectedFile);
      const result = await analyzePdf(base64, tone, range);
      setSegments(result.segments);
      if (!metadata) {
          setMetadata(result.metadata);
      }
      setCurrentActiveRange(range || 'All');
      if (range) setPageRange(range);
    } catch (error) {
      console.error(error);
      alert("Failed to process PDF. Check API Key or try a smaller file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async (isFull: boolean) => {
    if (!selectedFile) return;
    if (!isFull && !pageRange.trim()) {
      alert("Please enter a page number (e.g., '1' or '1-3')");
      return;
    }
    const rangeToSend = isFull ? undefined : pageRange;
    await executeTranslation(rangeToSend);
  };

  const handlePageNavigation = (direction: 'next' | 'prev') => {
    if (!currentActiveRange || currentActiveRange === 'All') return;
    const parts = currentActiveRange.split('-').map(p => parseInt(p.trim()));
    const start = parts[0];
    const end = parts.length > 1 ? parts[1] : start;
    if (isNaN(start) || isNaN(end)) return;

    const span = end - start + 1;
    let newStart, newEnd;

    if (direction === 'next') {
      newStart = end + 1;
      newEnd = newStart + span - 1;
    } else {
      newEnd = start - 1;
      newStart = newEnd - span + 1;
      if (newEnd < 1) return; 
    }
    const newRange = newStart === newEnd ? `${newStart}` : `${newStart}-${newEnd}`;
    executeTranslation(newRange);
  };

  const handleResetTranslation = () => {
    setSegments([]); 
    setCurrentActiveRange('');
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSegments([]);
  };

  const handleGenerateVocab = async () => {
    if (segments.length === 0) return;
    setIsProcessing(true);
    try {
      const vocab = await extractVocabulary(segments);
      setVocabulary(vocab);
    } catch (e) {
      console.error(e);
      alert("Failed to generate vocabulary");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateConclusion = async () => {
    if (segments.length === 0) return;
    setIsProcessing(true);
    try {
      const summary = await generateConclusion(segments);
      setConclusion(summary);
    } catch (e) {
      console.error(e);
      alert("Failed to generate conclusion");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTxt = (type: 'english' | 'korean' | 'twin') => {
    if (segments.length === 0) return;
    let content = "";
    if (type === 'english') {
      content = segments.map(s => s.original).join('\n\n');
    } else if (type === 'korean') {
      content = segments.map(s => s.translated).join('\n\n');
    } else {
      content = segments.map(s => `[Original]\n${s.original}\n\n[Translation]\n${s.translated}\n\n---`).join('\n');
    }
    downloadText(`paper_${type}.txt`, content);
    setShowDownloadMenu(false);
  };

  const handleDownloadOriginalPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = selectedFile?.name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowPdfMenu(false);
  };

  const handleDownloadTranslatedPdf = () => {
    if (segments.length === 0 || !metadata) return;
    printTranslatedPdf(metadata.title, segments);
    setShowPdfMenu(false);
  };

  const handleCitationClick = async (citation: string) => {
    const fullText = segments.map(s => s.original).join("\n");
    try {
        const details = await findReferenceDetails(citation, fullText);
        alert(`Reference Found:\n\n${details}`);
    } catch (e) {
        alert(`Could not resolve details for ${citation}`);
    }
  };

  const getApaCitation = () => {
    if (!metadata) return "";
    const authors = metadata.authors.join(", ");
    return `${authors} (${metadata.year}). ${metadata.title}. ${metadata.journal}, ${metadata.volumeIssue || ""}${metadata.pages ? `, ${metadata.pages}` : ""}. ${metadata.doi ? `https://doi.org/${metadata.doi}` : ""}`;
  };

  const getMlaCitation = () => {
    if (!metadata) return "";
    const authors = metadata.authors.length > 0 ? metadata.authors[0] + (metadata.authors.length > 1 ? " et al." : "") : "Unknown";
    return `${authors}. "${metadata.title}." ${metadata.journal}, ${metadata.volumeIssue ? `vol. ${metadata.volumeIssue}, ` : ""}${metadata.year}, ${metadata.pages ? `pp. ${metadata.pages}` : ""}.`;
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert("Citation Copied!");
    }
  };

  // --- Render ---

  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-20 shadow-sm flex-none h-16">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
           <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
             S
           </div>
           <h1 className="text-xl font-bold text-gray-800 tracking-tight">ScholarTwin <span className="text-primary-500 font-light">AI</span></h1>
        </div>

        <div className="flex items-center gap-4">
          {currentUser.isAdmin && (
             <button 
               onClick={() => setShowAdmin(true)}
               className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition-colors"
             >
               Admin Dashboard
             </button>
          )}

          {segments.length > 0 ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetTranslation}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors mr-2 border border-gray-200"
              >
                ← Back
              </button>
              
              <button 
                onClick={() => setShowTools(true)}
                className="text-sm font-medium text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={isProcessing}
              >
                Study Assistant
              </button>
              
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1 relative">
                {/* PDF Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowPdfMenu(!showPdfMenu)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded transition-all flex items-center gap-1"
                  >
                    PDF ▼
                  </button>
                  {showPdfMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
                      <button onClick={handleDownloadOriginalPdf} className="w-full text-left px-4 py-3 text-xs hover:bg-gray-50 flex items-center gap-2">
                        <span>📄</span> Download Original (PDF)
                      </button>
                      <button onClick={handleDownloadTranslatedPdf} className="w-full text-left px-4 py-3 text-xs hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                        <span>🌏</span> Download Translated (PDF)
                      </button>
                    </div>
                  )}
                </div>
                
                {/* TXT Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded transition-all flex items-center gap-1"
                  >
                    TXT ▼
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
                      <button onClick={() => handleDownloadTxt('english')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50">English Only</button>
                      <button onClick={() => handleDownloadTxt('korean')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50">Korean Only</button>
                      <button onClick={() => handleDownloadTxt('twin')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50">Twin View</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mr-2 flex items-center gap-2">
               <span>Welcome, <strong>{currentUser.name}</strong></span>
               {currentUser.isPaid && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">Premium</span>}
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden justify-center">
        {metadata && segments.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-6 py-3 text-xs text-gray-500 shadow-sm z-10 flex-none space-y-2">
             <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <span className="font-bold text-gray-700 inline-block w-10">APA:</span> 
                  <span className="font-serif text-gray-600">{getApaCitation()}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(getApaCitation())} 
                  className="text-[10px] px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                >
                  Copy APA
                </button>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <span className="font-bold text-gray-700 inline-block w-10">MLA:</span> 
                  <span className="font-serif text-gray-600">{getMlaCitation()}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(getMlaCitation())} 
                  className="text-[10px] px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                >
                  Copy MLA
                </button>
             </div>
          </div>
        )}

        {!selectedFile ? (
          /* State 1: Upload */
          <div className="w-full flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="max-w-2xl w-full">
              <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
              <div className="mt-8 text-center text-gray-400 text-sm">
                <p>Supported: PDF Files (Research Papers, Journals)</p>
                <p>Features: Translation, Twin View, Vocab Extraction, Scholar Grounding</p>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Result View OR Setup View */
          <div className="flex-1 flex w-full max-w-7xl mx-auto shadow-xl bg-white overflow-hidden">
            {segments.length === 0 ? (
              /* Setup View */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 overflow-y-auto">
                   <div className="max-w-xl w-full bg-white p-10 rounded-2xl shadow-lg border border-gray-100 text-center">
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedFile.name}</h2>
                      <p className="text-gray-500 mb-8">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • File Loaded Successfully</p>

                      <div className="mb-6 text-left">
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. Select Translation Tone</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setTone(TranslationTone.ACADEMIC)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${tone === TranslationTone.ACADEMIC ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            Academic (~이다)
                          </button>
                          <button 
                            onClick={() => setTone(TranslationTone.EXPLANATORY)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${tone === TranslationTone.EXPLANATORY ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            Explanatory (설명체)
                          </button>
                        </div>
                      </div>

                      <hr className="border-gray-100 my-8" />

                      <div className="text-left">
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Choose Translation Scope</label>
                        
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                          <div className="flex items-center gap-3">
                            <input 
                              type="text" 
                              placeholder="e.g. 1-3" 
                              value={pageRange}
                              onChange={(e) => setPageRange(e.target.value)}
                              className="w-32 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 p-2.5 text-center"
                            />
                            <button
                              onClick={() => handleTranslate(false)}
                              disabled={isProcessing}
                              className="flex-1 px-4 py-2.5 bg-white border border-primary-600 text-primary-600 font-bold rounded-lg hover:bg-primary-50 transition-colors shadow-sm"
                            >
                              Translate Specific Pages
                            </button>
                          </div>
                        </div>

                        <button
                           onClick={() => handleTranslate(true)}
                           disabled={isProcessing}
                           className="w-full px-4 py-3.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold rounded-xl hover:from-primary-700 hover:to-indigo-700 shadow-md transition-all flex justify-center items-center gap-2"
                         >
                           {isProcessing ? 'Processing...' : 'Translate Full Document'}
                         </button>
                         <p className="text-xs text-center text-gray-400 mt-3">Full document translation might take a few minutes depending on size.</p>
                      </div>
                      <div className="mt-8 text-center">
                        <button onClick={handleRemoveFile} className="text-sm text-red-500 hover:text-red-700 hover:underline">
                          Remove File & Start Over
                        </button>
                      </div>
                   </div>
              </div>
            ) : (
              /* TwinView with Controls */
              <div className="w-full h-full flex flex-col overflow-hidden">
                 <TwinView 
                    segments={segments} 
                    highlightedId={highlightedId} 
                    onHoverSegment={setHighlightedId}
                    onCitationClick={handleCitationClick}
                    pdfUrl={pdfUrl}
                    currentRange={currentActiveRange}
                    onNavigatePage={handlePageNavigation}
                  />
              </div>
            )}
          </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
             <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-gray-100 max-w-sm w-full mx-4">
               <div className="relative mb-6">
                 <div className="w-16 h-16 rounded-full border-4 border-gray-100"></div>
                 <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
               </div>
               <h3 className="text-xl font-bold text-gray-800 mb-2">Analyzing & Translating</h3>
               <p className="text-gray-500 text-center mb-6">
                 {segments.length === 0 ? "Analyzing structure..." : "Processing pages..."}
               </p>
               <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                 <div className="h-full bg-primary-500 animate-pulse rounded-full w-full origin-left scale-x-50"></div>
               </div>
             </div>
          </div>
        )}

        {showTools && (
          <ToolsPanel 
            vocabulary={vocabulary} 
            conclusion={conclusion} 
            onClose={() => setShowTools(false)}
            onGenerateVocab={handleGenerateVocab}
            onGenerateConclusion={handleGenerateConclusion}
            isProcessing={isProcessing}
          />
        )}

        {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      </main>
    </div>
  );
};

export default App;
