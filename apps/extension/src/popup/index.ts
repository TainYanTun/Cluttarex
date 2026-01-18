console.log('Cluttarex Popup Script Loaded');

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('clean-btn') as HTMLButtonElement;

  btn?.addEventListener('click', async () => {
    console.log('Button clicked!');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get settings from UI
    const font = (document.getElementById('font-select') as HTMLSelectElement)?.value || 'sans';
    const size = (document.getElementById('size-slider') as HTMLInputElement)?.value || '20';
    const darkMode = (document.getElementById('dark-mode') as HTMLInputElement)?.checked;
    const theme = darkMode ? 'dark' : 'light';

    if (!tab.id || !tab.url) {
      console.error('No active tab found');
      return;
    }

    console.log('Executing with settings:', { font, theme, size });

    // Inject cleaner and send message
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).then(() => {
      chrome.tabs.sendMessage(tab.id!, { 
        action: 'clean_page',
        font: font,
        fontSize: size,
        theme: theme
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError.message);
        } else {
          console.log('Success response:', response);
          window.close();
        }
      });
    }).catch(err => {
      console.error('Injection error:', err);
      alert('Cannot run Cluttarex on this page.');
    });
  });
});
