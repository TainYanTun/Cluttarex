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
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 ${!article ? 'py-12 md:py-40' : 'py-8 md:py-12'}`}>
        
        {/* Hyper-Minimalist Landing */}
        {!article ? (
          <div className="space-y-16 md:space-y-24 animate-in fade-in duration-700">
            <header className="space-y-6 relative">
              <div className="absolute -left-4 -top-4 w-12 h-12 border-t-2 border-l-2 border-current opacity-20" />
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic break-words hover:line-through decoration-4 decoration-current cursor-default transition-all select-none">
                Cluttarex
              </h1>
              <p className="text-lg md:text-2xl opacity-60 font-medium tracking-tight max-w-lg leading-relaxed">
                The web is noisy. <br/>
                <span className="opacity-50">Make it silent.</span>
              </p>
            </header>

            <div className="space-y-8">
              <form onSubmit={handleRead} className="group relative">
                <div className="relative overflow-hidden">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste URL to declutter..."
                    className="w-full bg-transparent border-b-2 border-current/20 py-6 md:py-8 pr-32 text-lg md:text-2xl font-bold outline-none placeholder:opacity-20 focus:border-current focus:placeholder:opacity-10 transition-all duration-300"
                    required
                    autoFocus
                  />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform -translate-x-full group-focus-within:translate-x-0 transition-transform duration-500 ease-out" />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-0 bottom-6 md:bottom-8 text-xs font-black tracking-[0.2em] uppercase px-4 py-2 transition-all disabled:opacity-20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  {loading ? 'Processing' : 'Extract'}
                </button>
              </form>

              {/* Quick Try Section */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-widest font-bold opacity-40">
                <span>Try:</span>
                {[
                  'https://paulgraham.com/hword.html',
                  'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html'
                ].map((link, i) => (
                  <button 
                    key={i}
                    onClick={() => { setUrl(link); }}
                    className="hover:opacity-100 hover:underline decoration-1 underline-offset-4 transition-all"
                  >
                    Example {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-red-500 animate-pulse break-words border-l-2 border-red-500 pl-4">
                Error: {error}
              </div>
            )}

            <footer className="pt-24 flex flex-col md:flex-row justify-between items-start md:items-center gap-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-current animate-pulse" />
                  <div>&copy; {new Date().getFullYear()} CLTRX</div>
                </div>
                <div className="w-12 h-px bg-current/20" />
                <div>Status: Online / {theme}</div>
              </div>
              
              <button 
                onClick={toggleTheme} 
                className="hover:opacity-100 transition-all flex items-center gap-4 border border-current/20 px-4 py-2 hover:border-black hover:bg-black hover:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
              >
                <span>Toggle Environment</span>
                <span className="text-lg leading-none translate-y-[-1px]">{theme === 'light' ? '☾' : '☼'}</span>
              </button>
            </footer>
          </div>
        ) : (
          /* Article View */
          <div className="space-y-8 md:space-y-12">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setArticle(null)}
                className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
              >
                &larr; Back
              </button>
              
              <div className="flex items-center gap-6">
                 <button onClick={toggleTheme} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity">
                   {theme === 'light' ? 'Dark' : 'Light'}
                 </button>
              </div>
            </div>

            {/* Hyper-Minimal Toolbar - Scrollable on mobile */}
            <div className="sticky top-0 z-10 bg-inherit py-4 border-b border-current/10 font-sans flex items-center justify-between gap-4 select-none backdrop-blur-sm bg-opacity-95 overflow-x-auto no-scrollbar">
               <div className="flex gap-4 text-[10px] font-black uppercase tracking-[0.2em] flex-shrink-0">
                 {(['serif', 'sans', 'slab', 'mono'] as const).map((f) => (
                   <button 
                     key={f}
                     onClick={() => setFont(f)} 
                     className={`hover:opacity-100 transition-opacity ${font === f ? 'opacity-100 underline decoration-2 underline-offset-4' : 'opacity-30'}`}
                   >
                     {f}
                   </button>
                 ))}
               </div>

               <div className="flex items-center gap-4 text-xs font-black flex-shrink-0 pl-4">
                 <div className="flex items-center gap-3 border-r border-current/20 pr-4 mr-2">
                   <button onClick={handleListen} className={`tracking-[0.2em] uppercase ${isSpeaking ? 'text-red-500' : 'opacity-40 hover:opacity-100'}`}>
                     {isSpeaking ? 'Stop' : 'Listen'}
                   </button>
                   
                   {voices.length > 0 && (
                     <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
                       <select 
                         value={selectedVoiceName}
                         onChange={(e) => setSelectedVoiceName(e.target.value)}
                         className="bg-transparent border-none text-[10px] uppercase font-bold tracking-tighter outline-none max-w-[60px] cursor-pointer"
                       >
                         <option value="">Voice</option>
                         {voices.map(v => (
                           <option key={v.name} value={v.name}>{v.name}</option>
                         ))}
                       </select>
                       <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-1">
                            <span className="text-[6px] uppercase tracking-wider">Spd</span>
                            <input 
                              type="range" min="0.5" max="2" step="0.1" 
                              value={speechRate} 
                              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                              className="w-8 h-1 accent-current"
                            />
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="text-[6px] uppercase tracking-wider">Pch</span>
                            <input 
                              type="range" min="0.5" max="2" step="0.1" 
                              value={speechPitch} 
                              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                              className="w-8 h-1 accent-current"
                            />
                         </div>
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="flex gap-2 opacity-40">
                   <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="hover:opacity-100 w-6 text-center">A-</button>
                   <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="hover:opacity-100 w-6 text-center text-sm">A+</button>
                 </div>
               </div>
            </div>

            <article className={`${font === 'serif' ? 'font-serif' : font === 'mono' ? 'font-mono' : font === 'slab' ? 'font-slab' : font === 'dyslexic' ? 'font-dyslexic' : 'font-sans'}`}>
              <h1 className="text-3xl md:text-5xl font-bold mb-8 md:mb-12 leading-tight tracking-tight break-words">{article.title}</h1>
              <div
                className={`article-content ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={{ __html: article.content }}
                dir={article.dir}
              />
            </article>
          </div>
        )}
      </div>
    </div>
  );
}