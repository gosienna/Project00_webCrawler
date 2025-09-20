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


