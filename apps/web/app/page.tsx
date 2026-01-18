'use client';

import { useState, useEffect, useRef } from 'react';
import { ArticleData } from '@cluttarex/shared';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const articleRef = useRef<HTMLElement>(null);

  // Computed
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  // Load persistence
  useEffect(() => {
    const savedTabs = localStorage.getItem('cltrx-tabs');
    const savedActiveId = localStorage.getItem('cltrx-active-id');
    const savedSidebar = localStorage.getItem('cltrx-sidebar');

    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) setTabs(parsed);
      } catch (e) { console.error('Failed to parse saved tabs'); }
    }
    if (savedActiveId) setActiveTabId(savedActiveId);
    if (savedSidebar !== null) setSidebarOpen(savedSidebar === 'true');
  }, []);

  // Save persistence
  useEffect(() => {
    if (tabs && tabs.length > 0) {
      localStorage.setItem('cltrx-tabs', JSON.stringify(tabs.map(t => ({ ...t, loading: false, error: null })))); 
    }
    if (activeTabId) localStorage.setItem('cltrx-active-id', activeTabId);
    if (sidebarOpen !== undefined) localStorage.setItem('cltrx-sidebar', sidebarOpen.toString());
  }, [tabs, activeTabId, sidebarOpen]);

  // Sync Theme
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Load Settings
  useEffect(() => {
    const savedFont = localStorage.getItem('cltrx-font');
    const savedTheme = localStorage.getItem('cltrx-theme');
    const savedSize = localStorage.getItem('cltrx-fontSize');
    const savedVoice = localStorage.getItem('cltrx-voice');
    const savedRate = localStorage.getItem('cltrx-rate');
    const savedPitch = localStorage.getItem('cltrx-pitch');
    
    if (savedFont) setFont(savedFont as any);
    if (savedTheme) setTheme(savedTheme as any);
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
    localStorage.setItem('cltrx-font', font);
    localStorage.setItem('cltrx-theme', theme);
    localStorage.setItem('cltrx-fontSize', fontSize.toString());
    localStorage.setItem('cltrx-voice', selectedVoiceName);
    localStorage.setItem('cltrx-rate', speechRate.toString());
    localStorage.setItem('cltrx-pitch', speechPitch.toString());
  }, [font, theme, fontSize, selectedVoiceName, speechRate, speechPitch]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const createTab = () => {
    const newId = Date.now().toString();
    setTabs(prev => [...prev, { id: newId, title: 'New Tab', url: '', article: null, loading: false, error: null, scrollPos: 0 }]);
    setActiveTabId(newId);
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

  const handleRead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab.url) return;
    
    updateActiveTab({ loading: true, error: null, article: null });

    try {
      const res = await fetch(`/api/read?url=${encodeURIComponent(activeTab.url)}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      updateActiveTab({ article: data, title: data.title || 'Untitled', loading: false });
    } catch (err: unknown) {
      console.warn('Server failed, fallback to client fetch', err);
      try {
        const proxyRes = await fetch(activeTab.url);
        const html = await proxyRes.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const title = doc.querySelector('title')?.innerText || 'Untitled';
        const content = Array.from(doc.querySelectorAll('p')).map(p => p.innerText).filter(t => t.length > 50).join('<p>');
        updateActiveTab({ article: { title, content, textContent: content, dir: 'ltr' }, title, loading: false });
      } catch (fallbackErr) {
        updateActiveTab({ error: `Failed to extract content.`, loading: false });
      }
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

  const handleDownloadPDF = async () => {
    if (!articleRef.current || !activeTab.article) return;
    const btn = document.getElementById('pdf-btn');
    if (btn) btn.innerText = '...';
    try {
      const canvas = await html2canvas(articleRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const article = clonedDoc.querySelector('article');
          if (article) {
            article.style.color = '#000000';
            article.style.padding = '100px';
            article.style.maxWidth = '800px';
            clonedDoc.querySelectorAll('hr').forEach(hr => hr.remove());
            const header = document.createElement('div');
            header.innerHTML = `<div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end;"><span style="font-family: sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-size: 10px;">Cluttarex Document</span><span style="font-family: sans-serif; opacity: 0.5; font-size: 8px;">${new Date().toLocaleDateString()}</span></div>`;
            article.prepend(header);
            const articleBody = clonedDoc.querySelector('.article-content');
            if (articleBody) { (articleBody as HTMLElement).style.paddingBottom = '60px'; (articleBody as HTMLElement).style.display = 'block'; }
            const footer = document.createElement('div');
            footer.style.clear = 'both'; footer.style.display = 'block';
            footer.innerHTML = `<div style="margin-top: 60px;"><div style="border-top: 4px solid #000; margin-bottom: 4px;"></div><div style="border-top: 1px solid #000; margin-bottom: 24px;"></div><p style="font-family: sans-serif; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Source Origin</p><p style="font-family: mono; font-size: 8px; color: #000; word-break: break-all; opacity: 0.6;">${activeTab.url}</p></div>`;
            article.append(footer);
            clonedDoc.querySelectorAll('img, button, .ad').forEach(el => el.remove());
          }
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) { position = heightLeft - pdfHeight; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight); heightLeft -= pageHeight; }
      pdf.save(`${activeTab.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (err) { alert('Failed to generate PDF'); } finally { if (btn) btn.innerText = 'PDF'; }
  };

  const showSidebar = sidebarOpen && (activeTab.article !== null || tabs.length > 1);

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {showSidebar && <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`flex-shrink-0 border-r transition-all duration-300 ease-in-out flex flex-col ${showSidebar ? 'w-64' : 'w-0 overflow-hidden'} ${theme === 'dark' ? 'bg-black border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'} md:relative fixed top-0 left-0 bottom-0 z-50 h-full`}>
        <div className="p-8 flex items-center justify-between">
           <span className="font-black uppercase tracking-[0.2em] text-xs opacity-40">Library</span>
           <div className="flex items-center gap-4">
             <button onClick={createTab} className="opacity-40 hover:opacity-100 font-bold">+</button>
             <button onClick={() => setSidebarOpen(false)} className="md:hidden opacity-40 hover:opacity-100 font-bold text-xs">✕</button>
           </div>
        </div>
                <div className="flex-1 overflow-y-auto px-8 space-y-6">
                  {tabs.map(tab => (
                    <div key={tab.id} onClick={() => { setActiveTabId(tab.id); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`group flex items-center justify-between text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all relative ${activeTabId === tab.id ? 'opacity-100 pl-4' : 'opacity-40 hover:opacity-100'}`}>
                      {activeTabId === tab.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-current" />}
                      <span className="truncate pr-2">{tab.title || 'Untitled'}</span>
                      <button onClick={(e) => closeTab(e, tab.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
        
                <div className="px-8 mt-auto pt-8">
                  <div className="p-4 border border-current/10 bg-current/[0.02] space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Power Up</p>
                    <p className="text-[10px] font-medium opacity-60 leading-relaxed">Clean any site with one click using our browser extension.</p>
                                <a 
                                  href="/cluttarex-extension.zip" 
                                  download
                                  className="block text-[10px] font-black uppercase tracking-[0.2em] hover:underline"
                                >
                                  Get Extension &rarr;
                                </a>                  </div>
                </div>
        
                <div className="p-8 text-[9px] font-black uppercase tracking-[0.3em] opacity-20 flex justify-between items-end">
                  <span>Cluttarex</span>
                  <button onClick={clearAllTabs} className="hover:text-red-500">Clear</button>
                </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">
        {activeTab.article && <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute top-4 left-4 z-40 p-2 opacity-20 hover:opacity-100 transition-opacity"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg></button>}
        <div className="flex-1 overflow-y-auto scroll-smooth flex flex-col">
          <div className={`max-w-3xl mx-auto px-4 sm:px-6 flex-1 flex flex-col w-full ${activeTab.article ? 'py-12' : ''}`}>
             
             {!activeTab.article ? (
               <div className="flex-1 flex flex-col justify-center items-center w-full min-h-[60vh]">
                  {tabs.length === 1 ? (
                    <div className="w-full">
                      <header className="space-y-6 mb-12">
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic break-words select-none">Cluttarex</h1>
                        <p className="text-lg md:text-2xl opacity-60 font-medium tracking-tight leading-relaxed">The web is noisy. <br/><span className="opacity-50">Make it silent.</span></p>
                        <div className="pt-4 flex flex-col gap-6">
                          <a 
                            href="/cluttarex-extension.zip" 
                            download
                            className="w-fit text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity border border-current px-4 py-2 hover:bg-current hover:text-white dark:hover:text-black"
                          >
                            Download Extension (.zip)
                          </a>
                          
                          <div className="space-y-3 opacity-30 group-hover:opacity-50 transition-opacity">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Installation Guide</p>
                            <div className="text-[10px] font-medium leading-relaxed space-y-1">
                              <p>1. Unzip the downloaded file.</p>
                              <p>2. Open Chrome Extensions (chrome://extensions).</p>
                              <p>3. Enable "Developer mode" in the top right.</p>
                              <p>4. Click "Load unpacked" and select the unzipped folder.</p>
                            </div>
                          </div>
                        </div>
                      </header>
                      <form onSubmit={handleRead} className="group relative">
                        <input type="url" value={activeTab.url} onChange={(e) => updateActiveTab({ url: e.target.value })} placeholder="Paste URL..." className="w-full bg-transparent border-b-2 border-current/20 py-8 text-lg md:text-2xl font-bold outline-none placeholder:opacity-40 focus:border-current transition-all" required autoFocus />
                        <button type="submit" disabled={activeTab.loading} className="absolute right-0 bottom-8 text-xs font-black tracking-[0.2em] uppercase px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">{activeTab.loading ? '...' : 'Extract'}</button>
                      </form>
                    </div>
                  ) : (
                    <div className="w-full max-w-xl px-8">
                      <form onSubmit={handleRead}>
                        <input type="url" value={activeTab.url} onChange={(e) => updateActiveTab({ url: e.target.value })} placeholder="Paste URL..." className="w-full bg-transparent border-b-2 border-current/20 py-6 text-xl md:text-3xl font-black text-center outline-none italic tracking-tighter" required autoFocus />
                        <div className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.6em] opacity-40">{activeTab.loading ? 'Decluttering...' : 'Press Enter to Extract'}</div>
                      </form>
                    </div>
                  )}
                  {activeTab.error && <div className="text-xs font-bold uppercase tracking-widest text-red-500 mt-12 border-l-2 border-red-500 pl-4">{activeTab.error}</div>}
               </div>
             ) : (
               <div className="space-y-8 md:space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center pl-10 md:pl-0">
                    <button onClick={createTab} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100">+ New</button>
                    <div className="flex items-center gap-6">
                       <button id="pdf-btn" onClick={handleDownloadPDF} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100">PDF</button>
                       <button onClick={toggleFullscreen} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hidden md:block">{isFullscreen ? 'Exit' : 'Full'}</button>
                       <button onClick={toggleTheme} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100">{theme === 'light' ? 'Dark' : 'Light'}</button>
                    </div>
                  </div>

                  <div className="sticky top-0 z-10 bg-inherit border-b border-current/10 backdrop-blur-sm bg-opacity-95 transition-all">
                    <div className="flex items-center justify-between py-4 gap-4 overflow-x-auto no-scrollbar">
                      <div className="flex gap-4 text-[10px] font-black uppercase tracking-[0.2em]">
                        {(['serif', 'sans', 'slab', 'mono'] as const).map((f) => (
                          <button key={f} onClick={() => setFont(f)} className={`hover:opacity-100 ${font === f ? 'underline decoration-2 underline-offset-4' : 'opacity-30'}`}>{f}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-6 text-xs font-black">
                          <div className="flex gap-2 opacity-40 border-r border-current/20 pr-6">
                            <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="hover:opacity-100 w-6 text-center">A-</button>
                            <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="hover:opacity-100 w-6 text-center text-sm">A+</button>
                          </div>
                          <button onClick={handleListen} className={`tracking-[0.2em] uppercase transition-colors ${isSpeaking ? 'text-red-500 animate-pulse' : 'opacity-40 hover:opacity-100'}`}>{isSpeaking ? 'Stop' : 'Listen'}</button>
                      </div>
                    </div>
                  </div>

                  <article ref={articleRef} className={`${font === 'serif' ? 'font-serif' : font === 'mono' ? 'font-mono' : font === 'slab' ? 'font-slab' : font === 'dyslexic' ? 'font-dyslexic' : 'font-sans'}`}>
                    <h1 className="text-3xl md:text-5xl font-bold mb-12 leading-tight tracking-tight">{activeTab.article.title}</h1>
                    <div className={`article-content ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`} style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: activeTab.article.content }} dir={activeTab.article.dir} />
                  </article>
               </div>
             )}

             {!activeTab.article && (
                <footer className="pt-24 flex flex-col md:flex-row justify-between items-start md:items-center gap-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-30 pb-12">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-current animate-pulse" />
                      <div>&copy; {new Date().getFullYear()} CLTRX</div>
                    </div>
                    <div className="w-12 h-px bg-current/20" />
                    <div>Status: Online / {theme}</div>
                  </div>
                  <button onClick={toggleTheme} className="hover:opacity-100 transition-all flex items-center gap-4 border border-current/20 px-4 py-2">
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