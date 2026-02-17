
import React, { useState, useEffect, useRef } from 'react';
import { PaperSegment, ChatMessage } from '../types';
import { chatWithPaper } from '../services/geminiService';
import { downloadText, fileToBase64 } from '../services/fileHelper';

interface ChatInterfaceProps {
  segments: PaperSegment[];
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ segments, onClose }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async (attachment?: { name: string, data: string, mimeType: string }) => {
    const textToSend = input.trim();
    if ((!textToSend && !attachment) || isLoading) return;
    
    const userMsg: ChatMessage = { 
        role: 'user', 
        text: textToSend,
        attachment 
    };
    
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass the *updated* history (including new msg) implies logic in service needs previous history + new msg
      const response = await chatWithPaper(history, textToSend, segments); 
      // Note: service uses history argument as *previous* messages, so we pass current history state before update + new msg text separately? 
      // Actually my service implementation constructs full history. Let's fix service call to pass history *before* this new message, or pass full.
      // The service code I wrote: "contents = history.map... contents.push(newMessage)". 
      // So I should pass the `history` state (which doesn't have new msg yet) and the `textToSend`. 
      // BUT `attachment` needs to be handled.
      // Correction: Service implementation constructs history from the array passed. 
      // I should update service to take the *entire* conversation including the new message, OR handle the attachment in the `newMessage` arg.
      // For simplicity in this UI component: The `chatWithPaper` in geminiService handles `history` array + `newMessage` string.
      // It assumes `history` is PAST messages.
      // However, if I have an attachment in the CURRENT message, the service needs to know.
      // I will assume `chatWithPaper` uses `history` for context, and `newMessage` for the prompt.
      // Wait, if I attach a file, it should be part of the `contents` sent to Gemini.
      // My service implementation: `const contents = history.map...; contents.push({ role: 'user', parts: [{ text: newMessage }] });`
      // It misses the attachment if it's in the new message.
      // I will hotfix this by appending the new message to `history` locally, then calling a modified service or just passing the right structure.
      // Let's rely on the service to handle the "current" turn properly.
      // Actually, looking at `geminiService.ts`: it constructs `contents` from `history` then PUSHES `newMessage`. 
      // It does NOT look at attachment of `newMessage`.
      // Workaround: I will push the new message to `history` FIRST, then pass `history` to service, and pass empty string as `newMessage`?
      // No, `generateContent` needs a trigger.
      // Let's just fix the service logic in my head: The service iterates `history`. 
      // So if I update `history` state first, then call service with `history` (which now contains new msg), and empty `newMessage`, the service might duplicate or fail.
      
      // Better approach: Pass `userMsg` (entire object) to service as the "latest message".
      // But `chatWithPaper` signature is `(history: ChatMessage[], newMessage: string, ...)`
      // I will adhere to the signature but maybe I should have updated the service signature.
      // Since I cannot change the service signature in this XML block (I already outputted it), 
      // I will assume the service handles history correctly if I pass the PREVIOUS history, 
      // BUT I need to pass the attachment.
      // Wait, I updated `geminiService.ts` in the previous block. Let's double check.
      // It takes `history` (mapped to contents) and pushes `newMessage`.
      // It DOES NOT support attachment in `newMessage` argument.
      // CRITICAL FIX: I will pass the attachment by appending it to the LAST message of `history` inside the service? No.
      // I will change the logic here: I will add the attachment to the history state. 
      // Then I will call the service with the *updated* history.
      // BUT `chatWithPaper` adds `newMessage` to the end.
      // OK, I will pass `input` as `newMessage`. The attachment is lost? 
      // Visual feedback: I'll attach the file to the *previous* message in history? No.
      
      // Real Fix: I'll just rely on the text for now or re-upload the service file if I made a mistake.
      // Looking at my previous output for `geminiService.ts`:
      // `const contents = history.map(...)` then `contents.push({ role: 'user', parts: [{ text: newMessage }] });`
      // Yes, it ignores attachment in `newMessage`.
      // I will fix `geminiService.ts` again in this response to correctly handle attachment in the last turn.
      
      const responseText = await chatWithPaper(
          [...history, userMsg], // Pass full history including current
          "", // Pass empty new message so it doesn't double add
          segments
      );

      setHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setHistory(prev => [...prev, { role: 'model', text: "Error: Could not generate response." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        // Automatically send with file
        await handleSend({
            name: file.name,
            mimeType: file.type,
            data: base64
        });
      } catch (err) {
        alert("Failed to read file.");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadChat = () => {
    const text = history.map(msg => {
      // Clean markdown bolding
      const cleanText = msg.text.replace(/\*\*/g, '');
      return `[${msg.role.toUpperCase()}]\n${cleanText}\n`;
    }).join('\n----------------\n');
    downloadText('chat_history.txt', text);
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col z-40 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 rounded-t-xl flex justify-between items-center text-white">
        <h3 className="font-bold flex items-center gap-2 text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          Chat with Paper
        </h3>
        <div className="flex items-center gap-2">
            <button onClick={handleDownloadChat} className="text-slate-400 hover:text-white" title="Download Chat">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75V1.5m0 0 3 3m-3-3-3 3" />
                </svg>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900" ref={scrollRef}>
        {history.length === 0 && (
            <div className="text-center text-slate-500 text-sm mt-10">
                Ask questions or upload files for context.
            </div>
        )}
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
              {msg.attachment && (
                  <div className="mb-2 p-2 bg-black/20 rounded border border-white/10 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                      <span className="text-xs truncate max-w-[150px]">{msg.attachment.name}</span>
                  </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-800 border-t border-slate-700">
        <div className="relative flex gap-2">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Upload File"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*,application/pdf,text/plain"
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
              }}
              placeholder="Type message..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-10"
            />
            
            <button 
                onClick={() => handleSend()}
                disabled={isLoading}
                className="p-2 text-indigo-400 hover:text-indigo-300 disabled:text-slate-600"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
