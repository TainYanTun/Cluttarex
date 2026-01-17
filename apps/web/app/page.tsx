'use client';

import { useState, useEffect } from 'react';
import { ArticleData } from '@lite-read/shared';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings with persistence
  const [font, setFont] = useState<'sans' | 'serif' | 'mono' | 'slab' | 'dyslexic'>('serif');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<number>(18);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isSpeaking, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem('lr-font') as any;
    const savedTheme = localStorage.getItem('lr-theme') as any;
    const savedSize = localStorage.getItem('lr-fontSize');
    const savedVoice = localStorage.getItem('lr-voice');
    const savedRate = localStorage.getItem('lr-rate');
    const savedPitch = localStorage.getItem('lr-pitch');
    
    if (savedFont) setFont(savedFont);
    if (savedTheme) setTheme(savedTheme);
    if (savedSize) setFontSize(parseInt(savedSize, 10));
    if (savedVoice) setSelectedVoiceName(savedVoice);
    if (savedRate) setSpeechRate(parseFloat(savedRate));
    if (savedPitch) setSpeechPitch(parseFloat(savedPitch));

    // Load voices
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      // Prioritize "Natural" or "Google" voices in the list
      const filtered = vs.filter(v => v.lang.startsWith('en')).sort((a, b) => {
        const aScore = (a.name.includes('Natural') || a.name.includes('Google')) ? 1 : 0;
        const bScore = (b.name.includes('Natural') || b.name.includes('Google')) ? 1 : 0;
        return bScore - aScore;
      });
      setVoices(filtered);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('lr-font', font);
    localStorage.setItem('lr-theme', theme);
    localStorage.setItem('lr-fontSize', fontSize.toString());
    localStorage.setItem('lr-voice', selectedVoiceName);
    localStorage.setItem('lr-rate', speechRate.toString());
    localStorage.setItem('lr-pitch', speechPitch.toString());
  }, [font, theme, fontSize, selectedVoiceName, speechRate, speechPitch]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Speech Logic
  const handleListen = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (article) {
      const utterance = new SpeechSynthesisUtterance(article.textContent);
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.onend = () => setIsPlaying(false);
      
      const voice = voices.find(v => v.name === selectedVoiceName) || voices[0];
      if (voice) utterance.voice = voice;
      
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleRead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setArticle(null);

    try {
      const res = await fetch(`/api/read?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch article');
      }

      setArticle(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-gray-200' : 'bg-white text-gray-900'}`}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        
        {/* Minimal Header - Only show when no article is loaded */}
        {!article && (
          <header className="mb-12 text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-2 font-sans">Cluttarex</h1>
            <p className={`text-sm font-sans opacity-60`}>Distraction-free reading.</p>
          </header>
        )}

        {/* Input Area */}
        <form onSubmit={handleRead} className={`flex gap-0 mb-12 font-sans border-b-2 ${theme === 'dark' ? 'border-gray-700 focus-within:border-white' : 'border-gray-200 focus-within:border-black'} transition-colors`}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste URL..."
            className="flex-1 px-0 py-3 bg-transparent border-none focus:ring-0 placeholder-opacity-40 outline-none text-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-3 font-bold uppercase text-xs tracking-widest hover:opacity-50 transition-opacity disabled:opacity-30"
          >
            {loading ? '...' : 'READ'}
          </button>
        </form>

        {error && (
          <div className="p-4 mb-8 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-sans">
            {error}
          </div>
        )}

        {/* Hyper-Minimal Toolbar */}
        {article && (
          <div className="sticky top-0 z-10 bg-inherit py-4 mb-8 border-b border-gray-200 dark:border-gray-800 font-sans flex flex-wrap items-center justify-between gap-4 select-none backdrop-blur-sm bg-opacity-95">
             {/* Font Selection - Text Only */}
             <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
               {(['serif', 'sans', 'slab', 'mono'] as const).map((f) => (
                 <button 
                   key={f}
                   onClick={() => setFont(f)} 
                   className={`hover:text-current transition-colors ${font === f ? 'text-current underline decoration-2 underline-offset-4' : 'text-gray-400 dark:text-gray-600'}`}
                 >
                   {f}
                 </button>
               ))}
               <button 
                   onClick={() => setFont('dyslexic')} 
                   className={`hover:text-current transition-colors ${font === 'dyslexic' ? 'text-current underline decoration-2 underline-offset-4' : 'text-gray-400 dark:text-gray-600'}`}
                   title="OpenDyslexic"
               >
                 Aa
               </button>
             </div>

             {/* Actions */}
             <div className="flex items-center gap-4 text-sm">
               <div className="flex items-center gap-2">
                 <button 
                   onClick={handleListen}
                   className={`flex items-center gap-2 hover:opacity-50 transition-all font-bold text-xs tracking-widest ${isSpeaking ? 'text-red-500' : ''}`}
                 >
                   {isSpeaking ? '■ STOP' : '▶ LISTEN'}
                 </button>
                 
                 {voices.length > 0 && (
                   <div className="flex items-center gap-2">
                     <select 
                       value={selectedVoiceName}
                       onChange={(e) => setSelectedVoiceName(e.target.value)}
                       className="bg-transparent border-none text-[10px] uppercase font-bold tracking-tighter opacity-40 hover:opacity-100 outline-none max-w-[80px]"
                     >
                       <option value="">Default Voice</option>
                       {voices.map(v => (
                         <option key={v.name} value={v.name}>{v.name}</option>
                       ))}
                     </select>

                     {/* Fine-tuning controls */}
                     <div className="flex items-center gap-3 ml-2 opacity-30 hover:opacity-100 transition-opacity">
                       <div className="flex items-center gap-1">
                         <span className="text-[8px] font-bold">SPD</span>
                         <input 
                           type="range" min="0.5" max="2" step="0.1" 
                           value={speechRate} 
                           onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                           className="w-12 h-1 accent-current"
                         />
                       </div>
                       <div className="flex items-center gap-1">
                         <span className="text-[8px] font-bold">PCH</span>
                         <input 
                           type="range" min="0.5" max="2" step="0.1" 
                           value={speechPitch} 
                           onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                           className="w-12 h-1 accent-current"
                         />
                       </div>
                     </div>
                   </div>
                 )}
               </div>

               <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>

               <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="w-6 h-6 hover:opacity-50 font-serif">A-</button>
               <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="w-6 h-6 hover:opacity-50 font-serif text-lg">A+</button>
               
               <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>

               <button 
                 onClick={toggleTheme}
                 className="hover:opacity-50"
                 title="Toggle Theme"
               >
                 {theme === 'light' ? '●' : '○'}
               </button>

               <button 
                 onClick={() => {
                   if (!document.fullscreenElement) {
                     document.documentElement.requestFullscreen();
                   } else {
                     document.exitFullscreen();
                   }
                 }} 
                 className="hover:opacity-50"
                 title="Fullscreen"
               >
                 ⛶
               </button>
             </div>
          </div>
        )}

        {/* Install Prompt - Subtle Footer Action */}
        {!article && installPrompt && (
           <div className="fixed bottom-8 left-0 right-0 text-center pointer-events-none">
             <button 
               onClick={handleInstall}
               className="pointer-events-auto px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
             >
               Install App
             </button>
           </div>
        )}

        {article && (
          <article className={`${font === 'serif' ? 'font-serif' : font === 'mono' ? 'font-mono' : font === 'slab' ? 'font-slab' : font === 'dyslexic' ? 'font-dyslexic' : 'font-sans'}`}>
            <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight tracking-tight">{article.title}</h1>
            
            <div
              className={`article-content ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{ __html: article.content }}
              dir={article.dir}
            />
          </article>
        )}
      </div>
    </div>
  );
}