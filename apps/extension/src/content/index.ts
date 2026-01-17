console.log('Lite-Read content script loaded');

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'clean_page') {
    cleanPage(request.font, request.theme);
    sendResponse({ status: 'done' });
  } else if (request.action === 'replace_content') {
    replaceContent(request.data, request.font, request.theme);
    sendResponse({ status: 'done' });
  }
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
  const bgColor = isDark ? '#111' : '#fff';
  const textColor = isDark ? '#ddd' : '#111';
  const linkColor = isDark ? '#68b5e9' : '#0066cc';
  const headerBg = isDark ? '#222' : '#fafafa';
  const borderColor = isDark ? '#333' : '#eee';

  document.documentElement.innerHTML = `
    <html>
      <head>
        <title>${data.title}</title>
        <style>
          body {
            font-family: ${fontFamily};
            line-height: 1.6;
            font-size: 18px;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: ${bgColor};
            color: ${textColor};
          }
          h1 { font-size: 1.8em; margin-bottom: 0.5em; line-height: 1.2; }
          p { margin: 0.8em 0; }
          h2, h3 { margin-top: 1.2em; margin-bottom: 0.4em; }
          a { color: ${linkColor}; }
          ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
          li { margin-bottom: 0.3em; }
          table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
          th, td { text-align: left; padding: 0.5em; border-bottom: 1px solid ${borderColor}; vertical-align: top; }
          th { background: ${headerBg}; font-weight: bold; }
          blockquote { border-left: 3px solid ${borderColor}; padding-left: 1em; color: ${isDark ? '#aaa' : '#666'}; font-style: italic; }
          img { 
            max-width: 100%; 
            height: auto; 
            display: block; 
            margin: 1.5em 0; 
            opacity: ${isDark ? '0.9' : '1'}; 
            border-radius: 4px;
            border: 1px solid ${borderColor};
          }
        </style>
      </head>
      <body dir="${data.dir || 'ltr'}">
        <h1>${data.title}</h1>
        <div>${data.content}</div>
      </body>
    </html>
  `;
}

function cleanPage(fontType: string = 'sans', theme: string = 'light') {
  // Simple client-side cleanup
  const selectorToRemove = 'script, style, iframe, nav, footer, header, aside, noscript, .ad, .ads, [class*="ad-"], [id*="ad-"]';
  const elements = document.querySelectorAll(selectorToRemove);
  elements.forEach(el => el.remove());

  // Apply font & theme preference
  const fontFamily = getFontFamily(fontType);
  const isDark = theme === 'dark';

  document.body.style.fontFamily = fontFamily;
  document.body.style.fontSize = '20px';
  document.body.style.lineHeight = '1.6';
  document.body.style.maxWidth = '800px';
  document.body.style.margin = '0 auto';
  document.body.style.padding = '20px';
  document.body.style.backgroundColor = isDark ? '#111' : '#fff';
  document.body.style.color = isDark ? '#ddd' : '#111';

  // Remove all attributes except src and href from remaining elements to clean styles
  const allElements = document.body.querySelectorAll('*');
  allElements.forEach(el => {
    // Keep semantic tags but strip attributes
    const keepAttrs = ['href', 'src'];
    Array.from(el.attributes).forEach(attr => {
      if (!keepAttrs.includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  console.log('Page cleaned');
}
