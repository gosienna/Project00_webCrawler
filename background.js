chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
});

// Store extension state globally
let extensionState = {
  saveElements: false
};

// Listen for tab updates to re-initialize content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Re-inject content script to ensure tracking continues
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      // Restore the save elements state
      if (extensionState.saveElements) {
        chrome.tabs.sendMessage(tabId, { 
          action: "toggleSaveElement", 
          save: extensionState.saveElements 
        });
      }
    }).catch((error) => {
      console.log('Script injection failed:', error);
    });
  }
});

// Listen for messages to track extension state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSaveElement") {
    extensionState.saveElements = request.save;
  }
});
