document.addEventListener('DOMContentLoaded', function () {
  const crawlButton = document.getElementById('crawlButton');
  const clearButton = document.getElementById('clearButton');
  const xpathInput = document.getElementById('xpathInput');
  const resultsTextarea = document.getElementById('results');
  const saveElementSwitch = document.getElementById('saveElementSwitch');

  let savedElements = [];

  function clearData() {
    resultsTextarea.value = '';
    xpathInput.value = '';
    savedElements = [];
    chrome.storage.local.set({ savedElements: [] });
  }

  // Listen for messages from the content script
  window.addEventListener('message', (event) => {
    if (event.data.action === 'clearData') {
      clearData();
    }
  });

  // Listener for live updates from the content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementClicked") {
      const elementData = {
        html: request.html,
        text: request.text,
        tagName: request.tagName,
        className: request.className,
        id: request.id,
        href: request.href,
        src: request.src,
        role: request.role,
        tabindex: request.tabindex,
        cursor: request.cursor,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };
      
      savedElements.push(elementData);
      chrome.storage.local.set({ savedElements: savedElements });
      
      // Display formatted element data
      const displayText = savedElements.map((element, index) => {
        return `Element ${index + 1}:\n` +
               `Tag: ${element.tagName}\n` +
               `Text: ${element.text}\n` +
               `Class: ${element.className}\n` +
               `ID: ${element.id}\n` +
               `Role: ${element.role || 'N/A'}\n` +
               `TabIndex: ${element.tabindex || 'N/A'}\n` +
               `Cursor: ${element.cursor}\n` +
               `URL: ${element.href || element.src || 'N/A'}\n` +
               `Timestamp: ${element.timestamp}\n` +
               `Page: ${element.url}\n` +
               `HTML: ${element.html}\n`;
      }).join('\n---\n\n');
      
      resultsTextarea.value = displayText;
    }
  });

  saveElementSwitch.addEventListener('change', () => {
    // Save the switch state to storage
    chrome.storage.local.set({ saveElementsState: saveElementSwitch.checked });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSaveElement", save: saveElementSwitch.checked });
      // Also notify background script to maintain state
      chrome.runtime.sendMessage({ action: "toggleSaveElement", save: saveElementSwitch.checked });
    });
  });

  crawlButton.addEventListener('click', () => {
    const xpath = xpathInput.value;
    if (!xpath) {
      resultsTextarea.value = 'Please enter an XPath expression.';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "crawl", xpath: xpath }, (response) => {
        if (chrome.runtime.lastError) {
          resultsTextarea.value = 'Error: ' + chrome.runtime.lastError.message;
        } else if (response && response.data) {
          resultsTextarea.value = response.data.join('\n');
        } else if (response && response.error) {
          resultsTextarea.value = 'Error: ' + response.error;
        } else {
          resultsTextarea.value = 'No data found or an unknown error occurred.';
        }
      });
    });
  });

  clearButton.addEventListener('click', () => {
    // Clear the tracked elements data
    savedElements = [];
    chrome.storage.local.set({ savedElements: [] });
    resultsTextarea.value = '';
    
    // Show confirmation message
    const originalPlaceholder = resultsTextarea.placeholder;
    resultsTextarea.placeholder = 'Tracked elements cleared successfully!';
    
    // Reset placeholder after 2 seconds
    setTimeout(() => {
      resultsTextarea.placeholder = originalPlaceholder;
    }, 2000);
  });

  // Load saved elements from storage
  chrome.storage.local.get('savedElements', (result) => {
    if (result.savedElements) {
      savedElements = result.savedElements;
      
      // Display formatted element data
      const displayText = savedElements.map((element, index) => {
        return `Element ${index + 1}:\n` +
               `Tag: ${element.tagName}\n` +
               `Text: ${element.text}\n` +
               `Class: ${element.className}\n` +
               `ID: ${element.id}\n` +
               `Role: ${element.role || 'N/A'}\n` +
               `TabIndex: ${element.tabindex || 'N/A'}\n` +
               `Cursor: ${element.cursor || 'N/A'}\n` +
               `URL: ${element.href || element.src || 'N/A'}\n` +
               `Timestamp: ${element.timestamp}\n` +
               `Page: ${element.url}\n` +
               `HTML: ${element.html}\n`;
      }).join('\n---\n\n');
      
      resultsTextarea.value = displayText;
    }
  });

  // Load and restore the save elements switch state
  chrome.storage.local.get('saveElementsState', (result) => {
    if (result.saveElementsState !== undefined) {
      saveElementSwitch.checked = result.saveElementsState;
      // Notify content script of the current state
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSaveElement", save: result.saveElementsState });
      });
    }
  });
});
