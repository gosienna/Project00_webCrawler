chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
});

// Create context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extractXPath",
    title: "Extract XPath Pattern",
    contexts: ["all"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extractXPath") {
    // Validate coordinates before sending
    const clickX = (info.clickX !== undefined && isFinite(info.clickX)) ? info.clickX : null;
    const clickY = (info.clickY !== undefined && isFinite(info.clickY)) ? info.clickY : null;
    
    chrome.tabs.sendMessage(tab.id, { 
      action: "extractXPathFromElement",
      clickX: clickX,
      clickY: clickY
    });
  }
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
