document.addEventListener('DOMContentLoaded', function () {
  const crawlButton = document.getElementById('crawlButton');
  const selectElementButton = document.getElementById('selectElementButton');
  const xpathInput = document.getElementById('xpathInput');
  const resultsTextarea = document.getElementById('results');
  const htmlContentTextarea = document.getElementById('htmlContent');

  // Function to update the UI with data
  function updateUI(data) {
    if (data && data.xpath) {
      xpathInput.value = data.xpath;
    }
    if (data && data.html) {
      htmlContentTextarea.value = data.html;
    }
  }

  // Load last selected element from storage when popup opens
  chrome.storage.local.get('lastSelectedElement', (result) => {
    if (result.lastSelectedElement) {
      updateUI(result.lastSelectedElement);
    }
  });

  // Listener for live updates from the content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementSelected") {
      updateUI(request);
    }
  });

  selectElementButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleInspector" });
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
});
