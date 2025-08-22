document.addEventListener('DOMContentLoaded', function () {
  const crawlButton = document.getElementById('crawlButton');
  const selectElementButton = document.getElementById('selectElementButton');
  const xpathInput = document.getElementById('xpathInput');
  const resultsTextarea = document.getElementById('results');

  // Listener for receiving messages from the content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementSelected") {
      xpathInput.value = request.xpath;
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
