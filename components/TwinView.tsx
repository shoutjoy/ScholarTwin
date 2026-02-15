import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PaperSegment, SegmentType } from '../types';

interface TwinViewProps {
  segments: PaperSegment[];
  highlightedId: string | null;
  onHoverSegment: (id: string | null) => void;
  onCitationClick: (citation: string) => void;
  pdfUrl: string | null;
  currentRange: string;
  onNavigatePage: (direction: 'next' | 'prev') => void;
}

// Sub-component for individual segment rendering to handle local state (copy/toggle)
const SegmentBlock: React.FC<{
  segment: PaperSegment;
  content: string;
  isKorean: boolean;
  highlighted: boolean;
  globalMarkdownMode: boolean;
  onHover: () => void;
  onCitationClick: (c: string) => void;
}> = ({ segment, content, isKorean, highlighted, globalMarkdownMode, onHover, onCitationClick }) => {
  const [showEquationRaw, setShowEquationRaw] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const renderContent = () => {
    // 1. Heading
    if (segment.type === SegmentType.HEADING) {
      if (globalMarkdownMode) return <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded text-slate-700">{`# ${content}`}</pre>;
      return <h2 className="text-xl font-bold mb-2 mt-4 text-slate-900">{content}</h2>;
    }
    
    // 2. Figure Caption
    if (segment.type === SegmentType.FIGURE_CAPTION) {
      if (globalMarkdownMode) return <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded text-slate-700">{`> ${content}`}</pre>;
      return (
        <div className="my-4 p-3 bg-gray-100 rounded border-l-4 border-gray-400 text-sm italic text-gray-700">
          <span className="font-semibold block not-italic mb-1">{isKorean ? "그림 설명" : "Figure Caption"}</span>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
        </div>
      );
    }

    // 3. Equation - Handle newlines by splitting
    if (segment.type === SegmentType.EQUATION) {
      const lines = content.split('\n');

      return (
        <div className="my-2 relative group/eq">
          <div className="font-mono bg-slate-50 p-3 rounded overflow-x-auto border border-gray-100">
             {showEquationRaw || globalMarkdownMode ? (
               <pre className="whitespace-pre-wrap text-sm text-slate-700">{content}</pre>
             ) : (
               <div className="flex flex-col gap-1">
                 {lines.map((line, i) => (
                   <div key={i} className="min-h-[1.5em] whitespace-pre-wrap">
                     <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                       {line || '&nbsp;'}
                     </ReactMarkdown>
                   </div>
                 ))}
               </div>
             )}
          </div>
          {!globalMarkdownMode && (
             <button 
               onClick={(e) => { e.stopPropagation(); setShowEquationRaw(!showEquationRaw); }}
               className="absolute top-1 right-1 opacity-0 group-hover/eq:opacity-100 transition-opacity text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-600 px-1.5 py-0.5 rounded"
             >
               {showEquationRaw ? 'Render' : 'Markdown'}
             </button>
          )}
        </div>
      );
    }

    // 4. Tables - Explicit handling to ensure rendering
    // Check if type is TABLE OR if the content strongly resembles a markdown table (pipes + dashes)
    const isTable = segment.type === SegmentType.TABLE || (content.includes('|') && content.includes('---'));
    
    if (isTable) {
       if (globalMarkdownMode) return <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded text-slate-700">{content}</pre>;
       
       // Add newlines around content to ensure remark-gfm picks up the table if it was tight
       const safeContent = `\n\n${content}\n\n`;

       return (
        <div className="my-4 overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
           <div className="markdown-body p-2 text-sm">
             <ReactMarkdown 
               remarkPlugins={[remarkGfm, remarkMath]} 
               rehypePlugins={[rehypeKatex]}
               components={{
                 table: ({node, ...props}) => <table className="min-w-full divide-y divide-gray-200" {...props} />,
                 thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                 tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                 tr: ({node, ...props}) => <tr className="hover:bg-gray-50" {...props} />,
                 th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 bg-gray-50" {...props} />,
                 td: ({node, ...props}) => <td className="px-3 py-2 whitespace-normal text-gray-600 border-r border-gray-100 last:border-r-0 text-xs leading-5" {...props} />
               }}
             >
               {safeContent}
             </ReactMarkdown>
           </div>
        </div>
       );
    }
    
    // 5. Normal Text
    if (globalMarkdownMode) {
      return <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-2 rounded text-slate-700">{content}</pre>;
    }

    return (
      <div className="leading-relaxed text-base markdown-body">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
             p: ({node, ...props}) => <p className="mb-2 whitespace-pre-line" {...props} />,
             table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-gray-200 border" {...props} /></div>,
             thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
             th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" {...props} />,
             td: ({node, ...props}) => <td className="px-3 py-2 whitespace-normal text-sm text-gray-600 border-b border-r last:border-r-0" {...props} />
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const renderCitationLinks = () => {
    if (!segment.citations || segment.citations.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {segment.citations.map((cite, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); onCitationClick(cite); }}
            className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded hover:bg-primary-200 transition-colors"
          >
            {cite}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      id={`${isKorean ? 'trans' : 'orig'}-${segment.id}`}
      className={`relative group transition-all duration-200 rounded p-2 mb-2 cursor-pointer border border-transparent ${
        highlighted ? 'bg-primary-50 ring-1 ring-primary-200 shadow-sm z-10' : 'hover:bg-gray-50 hover:border-gray-200'
      }`}
      onMouseEnter={onHover}
      onClick={onHover}
    >
      {/* Copy Button (Top Right) */}
      <button
        onClick={handleCopy}
        className={`absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-all opacity-0 group-hover:opacity-100 z-20`}
        title="Copy Block"
      >
        {showCopied ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
             <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
          </svg>
        )}
      </button>

      {renderContent()}
      {renderCitationLinks()}
    </div>
  );
};

const TwinView: React.FC<TwinViewProps> = ({ 
  segments, 
  highlightedId, 
  onHoverSegment,
  onCitationClick,
  pdfUrl,
  currentRange,
  onNavigatePage
}) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const [viewMode, setViewMode] = useState<'text' | 'image' | 'pdf'>('text');
  const [globalMarkdown, setGlobalMarkdown] = useState(false);

  const handleScroll = (source: 'left' | 'right') => {
    if (viewMode !== 'text' && source === 'left') return;
    if (isSyncing.current) return;
    
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    isSyncing.current = true;

    if (source === 'left') {
      const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight);
      right.scrollTop = percentage * (right.scrollHeight - right.clientHeight);
    } else {
      if (viewMode === 'text') {
        const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight);
        left.scrollTop = percentage * (left.scrollHeight - left.clientHeight);
      }
    }

    setTimeout(() => {
      isSyncing.current = false;
    }, 50);
  };

  const figureSegments = segments.filter(s => s.type === SegmentType.FIGURE_CAPTION);

  return (
    <div className="flex flex-col h-full border-t border-gray-200">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Original / Image / PDF */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white relative">
          
          {/* Left Header */}
          <div className="h-12 flex-none px-4 flex items-center justify-between border-b border-gray-100 bg-white z-10">
            <span className="font-sans text-xs uppercase tracking-wider text-gray-500">Original Source</span>
            <div className="flex items-center gap-2">
               {/* Markdown Toggle */}
               {viewMode === 'text' && (
                  <button 
                    onClick={() => setGlobalMarkdown(!globalMarkdown)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${globalMarkdown ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    MD View
                  </button>
               )}
               <div className="flex bg-gray-100 rounded p-0.5">
                <button 
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'text' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Text
                </button>
                <button 
                  onClick={() => setViewMode('image')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'image' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Image
                </button>
                <button 
                  onClick={() => setViewMode('pdf')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'pdf' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* Left Content */}
          <div 
            ref={leftRef}
            onScroll={() => handleScroll('left')}
            className="flex-1 overflow-y-auto"
          >
            {viewMode === 'text' && (
              <div className="p-6 font-serif">
                {segments.map((seg) => (
                  <SegmentBlock
                    key={`orig-${seg.id}`}
                    segment={seg}
                    content={seg.original}
                    isKorean={false}
                    highlighted={highlightedId === seg.id}
                    globalMarkdownMode={globalMarkdown}
                    onHover={() => onHoverSegment(seg.id)}
                    onCitationClick={onCitationClick}
                  />
                ))}
              </div>
            )}

            {viewMode === 'image' && (
              <div className="p-6 font-sans">
                 <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                    <strong>AI Figure Analysis</strong>: Below are the figures detected by AI, along with their captions and a generated explanation.
                 </div>
                 {figureSegments.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                       No figures detected in this section.
                    </div>
                 ) : (
                    figureSegments.map((seg, i) => (
                      <div key={seg.id} className="mb-8 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
                           <span className="font-bold text-gray-700">Figure Found</span>
                           <button 
                             onClick={() => {
                               setViewMode('text');
                               setTimeout(() => {
                                 const el = document.getElementById(`orig-${seg.id}`);
                                 el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 onHoverSegment(seg.id);
                               }, 100);
                             }}
                             className="text-xs text-primary-600 hover:underline"
                           >
                             Jump to Text Location
                           </button>
                        </div>
                        <div className="p-4">
                           <div className="text-sm font-serif italic text-gray-600 mb-4 bg-gray-50 p-2 rounded">
                             {seg.original}
                           </div>
                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">AI Analysis & Description</h4>
                           <div className="text-sm text-gray-800 leading-relaxed markdown-body">
                             <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {seg.description || "No detailed description provided by AI."}
                             </ReactMarkdown>
                           </div>
                        </div>
                      </div>
                    ))
                 )}
              </div>
            )}

            {viewMode === 'pdf' && (
              <div className="w-full h-full bg-gray-200">
                {pdfUrl ? (
                  <object 
                    data={pdfUrl} 
                    type="application/pdf" 
                    className="w-full h-full"
                  >
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                      <p className="mb-2">Unable to display PDF directly.</p>
                      <a href={pdfUrl} download className="text-primary-600 underline text-sm">Download PDF instead</a>
                    </div>
                  </object>
                ) : (
                   <div className="p-8 text-center text-gray-400">PDF not available</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Translated */}
        <div className="w-1/2 flex flex-col bg-slate-50 relative">
          
          {/* Right Header */}
          <div className="h-12 flex-none px-4 flex items-center justify-between border-b border-gray-200 bg-slate-50 z-10">
             <span className="font-sans text-xs uppercase tracking-wider text-gray-500">Translated Twin</span>
             <button 
                onClick={() => setGlobalMarkdown(!globalMarkdown)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${globalMarkdown ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
              >
                MD View
              </button>
          </div>

          <div 
            ref={rightRef}
            onScroll={() => handleScroll('right')}
            className="flex-1 overflow-y-auto p-6 font-sans"
          >
            {segments.map((seg) => (
               <SegmentBlock
                key={`trans-${seg.id}`}
                segment={seg}
                content={seg.translated}
                isKorean={true}
                highlighted={highlightedId === seg.id}
                globalMarkdownMode={globalMarkdown}
                onHover={() => onHoverSegment(seg.id)}
                onCitationClick={onCitationClick}
              />
            ))}
            
            {(currentRange && currentRange !== 'All') && (
               <div className="mt-8 pt-8 border-t border-gray-200 pb-10">
                 <p className="text-center text-sm text-gray-500 mb-4">Viewing page(s) <span className="font-bold text-gray-800">{currentRange}</span></p>
                 <div className="flex justify-center gap-4">
                   <button 
                     onClick={() => onNavigatePage('prev')}
                     className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
                   >
                     ← Previous Page
                   </button>
                   <button 
                     onClick={() => onNavigatePage('next')}
                     className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
                   >
                     Next Page →
                   </button>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwinView;