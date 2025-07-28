// background.js – MV3 service worker for individual image downloads

chrome.runtime.onMessage.addListener((msg, _sender) => {
  if (msg.action === 'download') {
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename,
      saveAs: msg.saveAs || false
    }).catch(console.error);
  }
});

// Optional: open side panel on action click
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
}
