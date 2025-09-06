chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get('saveElementsState', (result) => {
      if (result.saveElementsState !== undefined) {
        chrome.tabs.sendMessage(tabId, { action: "toggleSaveElement", save: result.saveElementsState });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSaveElementsState") {
    chrome.storage.local.get('saveElementsState', (result) => {
      sendResponse({ save: result.saveElementsState });
    });
    return true; // Indicates that the response is sent asynchronously
  }
});
