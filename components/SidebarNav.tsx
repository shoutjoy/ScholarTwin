
import React, { useState } from 'react';
import { PaperSegment, SegmentType } from '../types';

interface SidebarNavProps {
  totalPages: number;
  processedPages: number[];
  segments: PaperSegment[];
  onPageClick: (pageIndex: number, isProcessed: boolean) => void;
  onHeadingClick: (segmentId: string) => void;
  isProcessing: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ 
  totalPages, 
  processedPages, 
  segments, 
  onPageClick, 
  onHeadingClick,
  isProcessing,
  isOpen,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'outline'>('pages');

  const headings = segments.filter(s => s.type === SegmentType.HEADING);

  return (
    <div 
      className={`flex-none border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-10'}`}
    >
      {/* Sidebar Header/Tabs */}
      <div className="flex flex-col border-b border-gray-200">
        <div className="flex items-center justify-between p-2 bg-gray-50/50">
            {isOpen && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Navigation</span>}
            <button 
                onClick={onToggle}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors mx-auto"
                title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                    </svg>
                )}
            </button>
        </div>
        
        {isOpen && (
            <div className="flex">
                <button
                onClick={() => setActiveTab('pages')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'pages' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                Pages ({totalPages})
                </button>
                <button
                onClick={() => setActiveTab('outline')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'outline' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                Outline
                </button>
            </div>
        )}
      </div>

      {/* Content Area */}
      {isOpen && (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            {activeTab === 'pages' && (
            <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                const isProcessed = processedPages.includes(pageNum);
                return (
                    <button
                    key={pageNum}
                    onClick={() => onPageClick(pageNum, isProcessed)}
                    disabled={isProcessing}
                    className={`
                        relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all aspect-[3/4] shadow-sm
                        ${isProcessed 
                            ? 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md' 
                            : 'bg-gray-100 border-gray-200 hover:bg-white hover:border-gray-300'
                        }
                        ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                    >
                    <span className={`text-xs font-bold ${isProcessed ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {pageNum}
                    </span>
                    {isProcessed && (
                        <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white"></div>
                    )}
                    {!isProcessed && (
                        <span className="text-[9px] text-gray-400 mt-1">Load</span>
                    )}
                    </button>
                );
                })}
            </div>
            )}

            {activeTab === 'outline' && (
            <div className="space-y-1">
                {headings.length === 0 ? (
                <div className="text-center text-gray-400 text-xs mt-10">
                    No headings detected yet.<br/>Translate pages to see outline.
                </div>
                ) : (
                headings.map((heading) => (
                    <button
                    key={heading.id}
                    onClick={() => onHeadingClick(heading.id)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded transition-colors truncate border-l-2 border-transparent hover:border-indigo-300"
                    title={heading.translated || heading.original}
                    >
                    {heading.translated || heading.original}
                    </button>
                ))
                )}
            </div>
            )}
        </div>
      )}
      
      {/* Legend / Status Footer */}
      {isOpen && (
        <div className="p-3 border-t border-gray-200 bg-white text-[10px] text-gray-500 flex justify-between">
            <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Done
            </div>
            <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-200 rounded-full border border-gray-300"></span> Empty
            </div>
        </div>
      )}
    </div>
  );
};

export default SidebarNav;
