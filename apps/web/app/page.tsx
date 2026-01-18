'use client';

import { useState, useEffect, useRef } from 'react';
import { ArticleData } from '@lite-read/shared';

interface Tab {
  id: string;
  title: string;
  url: string;
  article: ArticleData | null;
  loading: boolean;
  error: string | null;
  scrollPos: number;
}

export default function Home() {
  // Global Settings
  const [font, setFont] = useState<'sans' | 'serif' | 'mono' | 'slab' | 'dyslexic'>('serif');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<number>(18);
  
  // Audio Settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isSpeaking, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tab State
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'init', title: 'New Tab', url: '', article: null, loading: false, error: null, scrollPos: 0 }]);
  const [activeTabId, setActiveTabId] = useState<string>('init');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Computed
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Helper to update active tab
  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  // --- Effects ---
  
  // Load Persistence
  useEffect(() => {
    const savedTabs = localStorage.getItem('cltrx-tabs');
    const savedActiveId = localStorage.getItem('cltrx-active-id');
    const savedSidebar = localStorage.getItem('cltrx-sidebar');

    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (parsed.length > 0) setTabs(parsed);
      } catch (e) { console.error('Failed to parse saved tabs'); }
    }
    if (savedActiveId) setActiveTabId(savedActiveId);
    if (savedSidebar !== null) setSidebarOpen(savedSidebar === 'true');
  }, []);

  // Save Persistence
  useEffect(() => {
    // Only save if there's actual data to avoid overwriting with defaults during mount
    if (tabs.length > 0) {
      localStorage.setItem('cltrx-tabs', JSON.stringify(tabs.map(t => ({ ...t, loading: false, error: null })))); // Don't save transient states
    }
    localStorage.setItem('cltrx-active-id', activeTabId);
    localStorage.setItem('cltrx-sidebar', sidebarOpen.toString());
  }, [tabs, activeTabId, sidebarOpen]);

  // Sync Theme with DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load Settings
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

    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      const filtered = vs.filter(v => v.lang.startsWith('en')).sort((a, b) => {
        const aScore = (a.name.includes('Natural') || a.name.includes('Google')) ? 1 : 0;
        const bScore = (b.name.includes('Natural') || b.name.includes('Google')) ? 1 : 0;
        return bScore - aScore;
      });
      setVoices(filtered);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Save Settings
  useEffect(() => {
    localStorage.setItem('lr-font', font);
    localStorage.setItem('lr-theme', theme);
    localStorage.setItem('lr-fontSize', fontSize.toString());
    localStorage.setItem('lr-voice', selectedVoiceName);
    localStorage.setItem('lr-rate', speechRate.toString());
    localStorage.setItem('lr-pitch', speechPitch.toString());
  }, [font, theme, fontSize, selectedVoiceName, speechRate, speechPitch]);

  // --- Handlers ---

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const createTab = () => {
    const newId = Date.now().toString();
    setTabs(prev => [...prev, { id: newId, title: 'New Tab', url: '', article: null, loading: false, error: null, scrollPos: 0 }]);
    setActiveTabId(newId);
    // On mobile, maybe close sidebar automatically? Keeping it simple for now.
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      const newId = Date.now().toString();
      setTabs([{ id: newId, title: 'New Tab', url: '', article: null, loading: false, error: null, scrollPos: 0 }]);
      setActiveTabId(newId);
      return;
    }
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const clearAllTabs = () => {
    if (confirm('Clear all tabs?')) {
      const newId = Date.now().toString();
      setTabs([{ id: newId, title: 'New Tab', url: '', article: null, loading: false, error: null, scrollPos: 0 }]);
      setActiveTabId(newId);
    }
  };

  // --- Effects ---
  
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      
      // ESC to close empty tab and return
      if (e.key === 'Escape' && !activeTab.article && tabs.length > 1) {
        closeTab(e as any, activeTabId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const handleRead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab.url) return;
    
    updateActiveTab({ loading: true, error: null, article: null });

    try {
      const res = await fetch(`/api/read?url=${encodeURIComponent(activeTab.url)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch article');

      updateActiveTab({ article: data, title: data.title || 'Untitled', loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      updateActiveTab({ error: message, loading: false });
    }
  };

  const handleListen = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (activeTab.article) {
      const utterance = new SpeechSynthesisUtterance(activeTab.article.textContent);
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.onend = () => setIsPlaying(false);
      
      const voice = voices.find(v => v.name === selectedVoiceName) || voices[0];
      if (voice) utterance.voice = voice;
      
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  // --- Components ---

  // Show sidebar if sidebar is manually open OR if we are in "article mode" (active tab has content)
  // But strictly, user asked for "not in home page only in extract page".
  // So: Default closed on home. Open on Extract.
  // Actually, let's make it simpler: Sidebar is available but collapsed by default on Home.
  
  const showSidebar = sidebarOpen && (activeTab.article !== null || tabs.length > 1);

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      
      {/* Mobile Backdrop */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Arc-style) */}
      <aside 
        className={`flex-shrink-0 border-r transition-all duration-300 ease-in-out flex flex-col
          ${showSidebar ? 'w-64 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
          ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}
          md:relative fixed top-0 left-0 bottom-0 z-50 h-full shadow-2xl md:shadow-none
        `}
      >
        <div className="p-8 flex items-center justify-between">
           <span className="font-black uppercase tracking-[0.2em] text-xs opacity-40">Library</span>
           <div className="flex items-center gap-4">
             <button 
               onClick={createTab} 
               className="w-4 h-4 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity font-bold text-lg leading-none"
               title="New Tab"
             >
               +
             </button>
             {/* Mobile Close Button */}
             <button 
               onClick={() => setSidebarOpen(false)}
               className="md:hidden w-4 h-4 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity font-bold text-xs leading-none"
             >
               ✕
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 space-y-6">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`group flex items-center justify-between text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all relative
                ${activeTabId === tab.id ? 'opacity-100 pl-4' : 'opacity-40 hover:opacity-100'}
              `}
            >
              {/* Active Indicator Line */}
              {activeTabId === tab.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-current" />
              )}
              
              <span className="truncate pr-2">{tab.title || 'Untitled'}</span>
              
              <button 
                onClick={(e) => closeTab(e, tab.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity font-mono"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="p-8 text-[9px] font-black uppercase tracking-[0.3em] opacity-20 flex justify-between items-end">
          <span>Cluttarex<br/>v1.2</span>
          <button onClick={clearAllTabs} className="hover:opacity-100 transition-opacity hover:text-red-500">Clear</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">
        
        {/* Toggle Sidebar Button (Visible only when article is active) */}
        {activeTab.article && (
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 left-4 z-40 p-2 opacity-20 hover:opacity-100 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth no-scrollbar flex flex-col">
          
          <div className={`max-w-3xl mx-auto px-4 sm:px-6 transition-all duration-500 flex-1 flex flex-col ${!activeTab.article ? '' : 'py-8 md:py-12'}`}>
             
             {/* --- Content: Landing State (Empty Tab) --- */}
             {!activeTab.article && (
               <div className="animate-in fade-in zoom-in-95 duration-500 flex-1 flex flex-col justify-center items-center w-full min-h-[60vh]">
                  
                  {/* Show Hero Branding ONLY if it's the very first initial tab */}
                  {tabs.length === 1 ? (
                    <div className="w-full py-12">
                      <header className="space-y-6 relative mb-12 animate-in slide-in-from-left-4 duration-700">
                        <div className="absolute -left-12 top-0 h-full w-1 bg-current opacity-10 hidden md:block" />
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
                              value={activeTab.url}
                              onChange={(e) => updateActiveTab({ url: e.target.value })}
                              placeholder="Paste URL..."
                              className="w-full bg-transparent border-b-2 border-current/20 py-6 md:py-8 pr-32 text-lg md:text-2xl font-bold outline-none placeholder:opacity-40 focus:border-current focus:placeholder:opacity-20 transition-all duration-300"
                              required
                              autoFocus
                            />
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform -translate-x-full group-focus-within:translate-x-0 transition-transform duration-500 ease-out" />
                          </div>
                          <button
                            type="submit"
                            disabled={activeTab.loading}
                            className="absolute right-0 bottom-6 md:bottom-8 text-xs font-black tracking-[0.2em] uppercase px-4 py-2 transition-all disabled:opacity-20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                          >
                            {activeTab.loading ? '...' : 'Extract'}
                          </button>
                        </form>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-widest font-bold opacity-40">
                          <span>Try:</span>
                          {[
                            'https://paulgraham.com/hword.html',
                            'https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html'
                          ].map((link, i) => (
                            <button 
                              key={i}
                              onClick={() => { updateActiveTab({ url: link }); }}
                              className="hover:opacity-100 hover:underline decoration-1 underline-offset-4 transition-all"
                            >
                              Ex {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="w-full max-w-xl px-8">
                    <form onSubmit={handleRead} className="group relative">
                      <div className="relative overflow-hidden">
                        <input
                          type="url"
                          value={activeTab.url}
                          onChange={(e) => updateActiveTab({ url: e.target.value })}
                          placeholder="Search or paste URL..."
                          className="w-full bg-transparent border-b-2 border-current/20 py-6 text-xl md:text-3xl font-black text-center outline-none placeholder:opacity-40 focus:border-current focus:placeholder:opacity-10 transition-all duration-500 italic tracking-tighter"
                          required
                          autoFocus
                        />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-current transform -translate-x-full group-focus-within:translate-x-0 transition-transform duration-700 ease-out" />
                      </div>
                      
                      <div className="mt-12 text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
                        <div className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">
                          {activeTab.loading ? 'Decluttering...' : 'Press Enter to Extract'}
                        </div>
                      </div>
                    </form>
                  </div>
                  )}
                  
                  {activeTab.error && (
                    <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-red-500 animate-pulse break-words border-l-2 border-red-500 pl-4 mt-12 max-w-2xl w-full">
                      Error: {activeTab.error}
                    </div>
                  )}
               </div>
             )}

             {/* --- Content: Article State --- */}
             {activeTab.article && (
               <div className="space-y-8 md:space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                  {/* Article Header Controls */}
                  <div className="flex justify-between items-center pl-10 md:pl-0">
                    <div className="flex items-center gap-4">
                      {/* Back / New Tab Shortcut */}
                      <button 
                        onClick={() => { createTab(); }} 
                        className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
                      >
                        + New
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-6">
                       <button onClick={toggleFullscreen} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity hidden md:block">
                         {isFullscreen ? 'Exit' : 'Full'}
                       </button>
                       <button onClick={toggleTheme} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity">
                         {theme === 'light' ? 'Dark' : 'Light'}
                       </button>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="sticky top-0 z-10 bg-inherit border-b border-current/10 font-sans backdrop-blur-sm bg-opacity-95 transition-all">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between py-4 overflow-x-auto no-scrollbar gap-4">
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

                        <div className="flex items-center gap-6 text-xs font-black flex-shrink-0 pl-4">
                            <div className="flex gap-2 opacity-40 border-r border-current/20 pr-6">
                              <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="hover:opacity-100 w-6 text-center">A-</button>
                              <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="hover:opacity-100 w-6 text-center text-sm">A+</button>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={handleListen} className={`tracking-[0.2em] uppercase transition-colors ${isSpeaking ? 'text-red-500 animate-pulse' : 'opacity-40 hover:opacity-100'}`}>
                                {isSpeaking ? 'Stop' : 'Listen'}
                              </button>
                              <button 
                                onClick={() => setShowAudioSettings(!showAudioSettings)} 
                                className={`w-8 h-8 flex items-center justify-center transition-all ${showAudioSettings ? 'bg-black text-white dark:bg-white dark:text-black opacity-100' : 'opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'}`}
                                title="Audio Settings"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="4" y1="21" x2="4" y2="14" />
                                  <line x1="4" y1="10" x2="4" y2="3" />
                                  <line x1="12" y1="21" x2="12" y2="12" />
                                  <line x1="12" y1="8" x2="12" y2="3" />
                                  <line x1="20" y1="21" x2="20" y2="16" />
                                  <line x1="20" y1="12" x2="20" y2="3" />
                                  <line x1="1" y1="14" x2="7" y2="14" />
                                  <line x1="9" y1="8" x2="15" y2="8" />
                                  <line x1="17" y1="16" x2="23" y2="16" />
                                </svg>
                              </button>
                            </div>
                        </div>
                      </div>

                      {showAudioSettings && (
                        <div className="border-t border-current/10 py-6 px-1 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-[10px] font-black uppercase tracking-[0.2em]">
                            <div className="flex flex-col gap-3">
                              <div className="flex justify-between opacity-40"><span>Voice Selection</span></div>
                              <select 
                                value={selectedVoiceName}
                                onChange={(e) => setSelectedVoiceName(e.target.value)}
                                className="bg-transparent border-b border-current/20 py-2 outline-none font-black uppercase tracking-tighter cursor-pointer hover:border-current transition-colors h-8"
                              >
                                <option value="">System Default</option>
                                {voices.map(v => (
                                  <option key={v.name} value={v.name}>{v.name.replace(/Google |Microsoft |Apple /g, '')}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-3">
                              <div className="flex justify-between opacity-40">
                                <span>Playback Speed</span>
                                <span className="font-mono">{speechRate.toFixed(1)}x</span>
                              </div>
                              <div className="h-8 flex items-center">
                                  <input 
                                    type="range" min="0.5" max="2" step="0.1" 
                                    value={speechRate} 
                                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                    className="w-full h-1 accent-current cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                  />
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              <div className="flex justify-between opacity-40">
                                <span>Voice Pitch</span>
                                <span className="font-mono">{speechPitch.toFixed(1)}x</span>
                              </div>
                              <div className="h-8 flex items-center">
                                  <input 
                                    type="range" min="0.5" max="2" step="0.1" 
                                    value={speechPitch} 
                                    onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                                    className="w-full h-1 accent-current cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                  />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <article className={`${font === 'serif' ? 'font-serif' : font === 'mono' ? 'font-mono' : font === 'slab' ? 'font-slab' : font === 'dyslexic' ? 'font-dyslexic' : 'font-sans'}`}>
                    <h1 className="text-3xl md:text-5xl font-bold mb-8 md:mb-12 leading-tight tracking-tight break-words">{activeTab.article.title}</h1>
                    <div
                      className={`article-content ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}
                      style={{ fontSize: `${fontSize}px` }}
                      dangerouslySetInnerHTML={{ __html: activeTab.article.content }}
                      dir={activeTab.article.dir}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const link = target.closest('a');
                        if (link && link.href) {
                          e.preventDefault();
                          window.open(link.href, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    />
                  </article>
               </div>
             )}

             {/* Footer (Always Visible at bottom of scroll, simpler version) */}
             {!activeTab.article && (
                <footer className="pt-24 flex flex-col md:flex-row justify-between items-start md:items-center gap-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-30 pl-8 md:pl-0 pb-12">
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
             )}

          </div>
        </div>
      </main>
    </div>
  );
}
