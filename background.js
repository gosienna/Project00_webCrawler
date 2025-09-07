chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['saveElementsState', 'checkXPathState'], (result) => {
      if (result.saveElementsState !== undefined) {
        chrome.tabs.sendMessage(tabId, { action: "toggleSaveElement", save: result.saveElementsState });
      }
      if (result.checkXPathState !== undefined) {
        chrome.tabs.sendMessage(tabId, { action: "toggleCheckXPath", checkXPath: result.checkXPathState });
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
  } else if (request.action === "getCheckXPathState") {
    chrome.storage.local.get('checkXPathState', (result) => {
      sendResponse({ checkXPath: result.checkXPathState });
    });
    return true; // Indicates that the response is sent asynchronously
  }
});
