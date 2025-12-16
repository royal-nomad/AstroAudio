import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';
import { SEARCH_MODEL } from '../constants';

const SearchInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: 'Ask me anything about music theory, equipment specs, or artist techniques. I can browse the web for up-to-date info.' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const apiKey = process.env.API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: SEARCH_MODEL,
        contents: userMsg.text,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "I couldn't find an answer to that.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      const sources: string[] = [];
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            sources.push(chunk.web.uri);
          }
        });
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text,
        sources: Array.from(new Set(sources)) // dedupe
      }]);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error searching for that info.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-4">
      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-5 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
            }`}>
              <div className="prose prose-invert prose-sm">
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-600/50">
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, i) => (
                      <a 
                        key={i} 
                        href={src} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs bg-slate-900/50 hover:bg-slate-700 px-2 py-1 rounded text-blue-300 truncate max-w-[200px] transition-colors border border-slate-700/50"
                      >
                        {new URL(src).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-tl-none p-4 flex gap-2 items-center border border-slate-700">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Astro about scales, progressions, or music history..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-5 pr-14 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-lg"
        />
        <button 
          type="submit"
          disabled={!query.trim() || loading}
          className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default SearchInterface;
