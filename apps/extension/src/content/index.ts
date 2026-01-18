console.log('Cluttarex content script loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Cluttarex: Message received', message);
  
  if (message.action === 'clean_page') {
    cleanPage(message.font, message.theme);
    sendResponse({ success: true });
  } else if (message.action === 'replace_content') {
    replaceContent(message.data, message.font, message.theme);
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

function replaceContent(data: any, fontType: string = 'sans', theme: string = 'light') {
  const fontFamily = getFontFamily(fontType);
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#000' : '#fff';
  const textColor = isDark ? '#eee' : '#111';
  const linkColor = isDark ? '#68b5e9' : '#0066cc';
  const borderColor = isDark ? '#333' : '#eee';

  // Completely replace the page content
  document.documentElement.innerHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${data.title}</title>
      <style>
        body {
          font-family: ${fontFamily};
          line-height: 1.6;
          font-size: 19px;
          max-width: 750px;
          margin: 0 auto;
          padding: 60px 24px;
          background-color: ${bgColor};
          color: ${textColor};
          all: initial;
        }
        body * { all: revert; }
        .cltrx-container { max-width: 750px; margin: 0 auto; display: block; }
        h1 { font-size: 2.5em; margin-bottom: 0.8em; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em; }
        p { margin: 1.4em 0; }
        a { color: ${linkColor}; text-decoration: underline; text-underline-offset: 4px; }
        img { max-width: 100%; height: auto; margin: 2.5em 0; border: 1px solid ${borderColor}; display: block; }
        hr { border: none; border-top: 1px solid ${borderColor}; margin: 3em 0; }
        .exit-btn {
          position: fixed; top: 20px; right: 20px; 
          padding: 8px 16px; background: ${isDark ? '#222' : '#eee'}; 
          color: ${textColor}; border: 1px solid ${borderColor}; 
          cursor: pointer; font-family: sans-serif; font-size: 12px; font-weight: bold;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .exit-btn:hover { background: ${isDark ? '#333' : '#ddd'}; }
      </style>
    </head>
    <body dir="${data.dir || 'ltr'}">
      <div class="cltrx-container">
        <button class="exit-btn" onclick="window.location.reload()">Exit Cluttarex</button>
        <h1>${data.title}</h1>
        <div class="article-body">${data.content}</div>
        <hr />
        <p style="opacity: 0.3; font-size: 0.7em; text-transform: uppercase; letter-spacing: 2px;">End of Cluttarex Clean Version</p>
      </div>
    </body>
    </html>
  `;
}

function cleanPage(fontType: string = 'sans', theme: string = 'light') {
  const title = document.querySelector('h1')?.innerText || document.title;
  
  // Target Wikipedia and other common content areas
  const contentSelectors = [
    '.mw-parser-output', 
    'article', 
    'main', 
    '[role="main"]',
    '.content',
    '.post-content'
  ];
  
  let mainContent: Element | null = null;
  for (const selector of contentSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      mainContent = el.cloneNode(true) as Element;
      break;
    }
  }

  // Fallback to all paragraphs if no container found
  let htmlContent = '';
  if (mainContent) {
    // Remove known clutter from the clone
    const clutter = mainContent.querySelectorAll('script, style, .navbox, .infobox, .reference, .reflist, .sidebar, .ambox, .metadata');
    clutter.forEach(el => el.remove());
    htmlContent = mainContent.innerHTML;
  } else {
    htmlContent = Array.from(document.querySelectorAll('p'))
      .map(p => p.outerHTML)
      .filter(html => html.length > 20)
      .join('');
  }

  replaceContent({ title, content: htmlContent }, fontType, theme);
}