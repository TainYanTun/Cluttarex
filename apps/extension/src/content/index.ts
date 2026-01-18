console.log('Cluttarex content script loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Cluttarex: Message received', message);
  
  if (message.action === 'clean_page') {
    cleanPage(message.font, message.theme, message.fontSize);
    sendResponse({ success: true });
  } else if (message.action === 'replace_content') {
    replaceContent(message.data, message.font, message.theme, message.fontSize);
    sendResponse({ success: true });
  }
  
  return true;
});

function getFontFamily(fontType: string) {
  switch (fontType) {
    case 'serif': return 'Georgia, Cambria, "Times New Roman", Times, serif';
    case 'mono': return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    case 'slab': return '"Rockwell", "Roboto Slab", "Courier New", serif';
    case 'dyslexic': return '"OpenDyslexic", "Comic Sans MS", "Verdana", sans-serif';
    case 'sans': default: return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  }
}

function replaceContent(data: any, fontType: string = 'sans', theme: string = 'light', fontSize: string = '20') {
  const fontFamily = getFontFamily(fontType);
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#000' : '#fff';
  const textColor = isDark ? '#eee' : '#111';
  const linkColor = isDark ? '#68b5e9' : '#0066cc';
  const borderColor = isDark ? '#333' : '#eee';

  // Create a clean overlay
  const overlay = document.createElement('div');
  overlay.id = 'cluttarex-overlay';
  overlay.style.cssText = `
    all: initial;
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: ${bgColor};
    color: ${textColor};
    z-index: 2147483647;
    overflow-y: auto;
    padding: 60px 20px;
    font-family: ${fontFamily};
    line-height: 1.6;
    display: block;
  `;

  overlay.innerHTML = `
    <div style="all: revert; max-width: 750px; margin: 0 auto; display: block;">
      <button onclick="document.getElementById('cluttarex-overlay').remove()" style="all: revert; position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: ${isDark ? '#222' : '#eee'}; color: ${textColor}; border: 1px solid ${borderColor}; cursor: pointer; font-weight: bold; font-family: sans-serif;">EXIT</button>
      <h1 style="all: revert; font-size: 2.5em; margin-bottom: 30px; font-weight: 800; display: block;">${data.title}</h1>
      <div style="all: revert; font-size: ${fontSize}px; display: block;">${data.content}</div>
      <div style="all: revert; border-top: 1px solid ${borderColor}; margin-top: 50px; padding-top: 20px; opacity: 0.3; font-size: 12px; display: block;">
        CLEANED BY CLUTTAREX
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function cleanPage(fontType: string = 'sans', theme: string = 'light', fontSize: string = '20') {
  const title = document.querySelector('h1')?.innerText || document.title;
  
  // High-reliability content extraction
  const article = document.querySelector('article') || document.querySelector('main') || document.querySelector('.content') || document.body;
  const clone = article.cloneNode(true) as HTMLElement;

  // Remove junk from the clone
  const junk = clone.querySelectorAll('script, style, iframe, nav, footer, header, aside, .ad, .social, .comments, .sidebar');
  junk.forEach(el => el.remove());

  replaceContent({ title, content: clone.innerHTML }, fontType, theme, fontSize);
}