// utils/messaging.js – Enhanced messaging with retry and error handling

export function sendToContentScript(tabId, payload, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (remainingRetries) => {
      chrome.tabs.sendMessage(tabId, payload, (response) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message || chrome.runtime.lastError;
          
          // If "receiving end does not exist" and we have retries left
          if (error.includes('Receiving end does not exist') && remainingRetries > 0) {
            console.warn(`Asset Companion: Retrying message (${remainingRetries} attempts left)`);
            setTimeout(() => attempt(remainingRetries - 1), 500);
            return;
          }
          
          // If it's an activeTab issue, try to inject the content script
          if (error.includes('Receiving end does not exist')) {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['libs/html2canvas.min.js', 'libs/jspdf.umd.min.js', 'libs/jszip.min.js', 'content.js']
            }).then(() => {
              // Try the message again after injection
              setTimeout(() => attempt(0), 1000);
            }).catch(() => {
              reject(new Error('Failed to inject content script: ' + error));
            });
            return;
          }
          
          reject(new Error(error));
        } else {
          resolve(response);
        }
      });
    };
    
    attempt(retries);
  });
}
