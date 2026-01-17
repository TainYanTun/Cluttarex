const API_URL = 'http://localhost:3000/api/read';

document.getElementById('clean-btn')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const serverMode = (document.getElementById('server-mode') as HTMLInputElement)?.checked;
  const darkMode = (document.getElementById('dark-mode') as HTMLInputElement)?.checked;
  const font = (document.getElementById('font-select') as HTMLSelectElement)?.value || 'sans';
  const theme = darkMode ? 'dark' : 'light';
  
  if (tab.id && tab.url) {
    if (serverMode) {
      const btn = document.getElementById('clean-btn') as HTMLButtonElement;
      btn.textContent = 'Processing...';
      btn.disabled = true;

      try {
        const response = await fetch(`${API_URL}?url=${encodeURIComponent(tab.url)}`);
        const data = await response.json();
        
        if (response.ok) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'replace_content', 
            data: data,
            font: font,
            theme: theme
          }, () => window.close());
        } else {
          alert('Server Error: ' + (data.error || 'Failed to fetch'));
          btn.textContent = 'Enable Lite Mode';
          btn.disabled = false;
        }
      } catch (err) {
        alert('Could not connect to server. Ensure web app is running at ' + API_URL);
        btn.textContent = 'Enable Lite Mode';
        btn.disabled = false;
      }
    } else {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'clean_page',
        font: font,
        theme: theme
      }, (response) => {
        console.log('Response from content script:', response);
        window.close();
      });
    }
  }
});
