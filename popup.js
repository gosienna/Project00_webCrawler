document.addEventListener('DOMContentLoaded', function () {
  const clearButton = document.getElementById('clearButton');
  const displayTest = document.getElementById('displayTest');
  const saveElementSwitch = document.getElementById('saveElementSwitch');
  const addInputBtn = document.getElementById('addInputBtn');
  const inputContainer = document.getElementById('inputContainer');
  const extractXPathBtn = document.getElementById('extractXPathBtn');

  let savedElementsTree = [];
  let inputRowCount = 1;

  // Dynamic Input Area Functions
  function addInputRow() {
    const inputRow = document.createElement('div');
    inputRow.className = 'input-row';
    inputRowCount++;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'input-textarea';
    textarea.placeholder = 'Enter text here...';
    textarea.setAttribute('data-row-id', inputRowCount);
    textarea.addEventListener('input', saveInputDataToStorage);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'X';
    removeBtn.onclick = () => removeInputRow(removeBtn);
    
    inputRow.appendChild(textarea);
    inputRow.appendChild(removeBtn);
    inputContainer.appendChild(inputRow);
    
    // Show remove buttons for all rows if there's more than one
    updateRemoveButtonsVisibility();
    
    // Focus on the new textarea
    textarea.focus();
  }

  function removeInputRow(button) {
    const inputRow = button.parentElement;
    inputRow.remove();
    updateRemoveButtonsVisibility();
    saveInputDataToStorage();
  }

  function updateRemoveButtonsVisibility() {
    const inputRows = inputContainer.querySelectorAll('.input-row');
    const removeButtons = inputContainer.querySelectorAll('.remove-btn');
    
    // Show remove buttons only if there's more than one row
    removeButtons.forEach(btn => {
      btn.style.display = inputRows.length > 1 ? 'flex' : 'none';
    });
  }

  function getAllInputTexts() {
    const textareas = inputContainer.querySelectorAll('.input-textarea');
    return Array.from(textareas).map(textarea => textarea.value.trim()).filter(text => text.length > 0);
  }

  function clearAllInputs() {
    const textareas = inputContainer.querySelectorAll('.input-textarea');
    textareas.forEach(textarea => textarea.value = '');
    saveInputDataToStorage();
  }

  function saveInputDataToStorage() {
    const inputData = getAllInputTexts();
    chrome.storage.local.set({ xpathInputData: inputData });
  }

  function loadInputDataFromStorage() {
    chrome.storage.local.get(['xpathInputData'], (result) => {
      if (result.xpathInputData && result.xpathInputData.length > 0) {
        // Clear existing inputs first
        const textareas = inputContainer.querySelectorAll('.input-textarea');
        textareas.forEach(textarea => textarea.value = '');
        
        // Remove extra rows if we have more than needed
        const inputRows = inputContainer.querySelectorAll('.input-row');
        for (let i = inputRows.length - 1; i >= result.xpathInputData.length; i--) {
          if (i > 0) { // Keep at least one row
            inputRows[i].remove();
          }
        }
        
        // Add rows if we need more
        while (inputContainer.querySelectorAll('.input-row').length < result.xpathInputData.length) {
          addInputRow();
        }
        
        // Populate the textareas with saved data
        const updatedTextareas = inputContainer.querySelectorAll('.input-textarea');
        result.xpathInputData.forEach((text, index) => {
          if (updatedTextareas[index]) {
            updatedTextareas[index].value = text;
          }
        });
        
        updateRemoveButtonsVisibility();
      }
    });
  }

  function extractElementsByXPath() {
    const xpathExpressions = getAllInputTexts();
    
    if (xpathExpressions.length === 0) {
      alert('Please enter at least one XPath expression');
      return;
    }

    // Disable button during extraction
    extractXPathBtn.disabled = true;
    extractXPathBtn.textContent = 'Extracting...';

    // Send message to content script to extract elements
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: "extractElementsByXPath", 
          xpathExpressions: xpathExpressions 
        }, (response) => {
          // Re-enable button
          extractXPathBtn.disabled = false;
          extractXPathBtn.textContent = 'Extract Elements';
          
          if (chrome.runtime.lastError) {
            console.error('Error communicating with content script:', chrome.runtime.lastError);
            alert('Error: Could not communicate with the page. Make sure you are on a valid webpage.');
            return;
          }
          
          if (response && response.success) {
            if (response.elements && response.elements.length > 0) {
              // Add extracted elements to savedElementsTree
              response.elements.forEach(elementData => {
                const newNode = {
                  text: elementData.text || 'XPath Element',
                  url: elementData.url || tabs[0].url,
                  href: elementData.href || '',
                  html: elementData.html || '',
                  xpath: elementData.xpath || '',
                  children: []
                };
                
                // Check for duplicates before adding
                const isDuplicate = savedElementsTree.some(item => 
                  item.text === newNode.text && 
                  item.url === newNode.url && 
                  item.xpath === newNode.xpath
                );
                
                if (!isDuplicate) {
                  savedElementsTree.push(newNode);
                }
              });
              
              // Save to storage and update display
              chrome.storage.local.set({ savedElementsTree: savedElementsTree });
              displayTest.innerHTML = '';
              renderTree(savedElementsTree, displayTest);
              
              alert(`Successfully extracted ${response.elements.length} elements`);
            } else {
              alert('No elements found matching the XPath expressions');
            }
          } else {
            alert('Error extracting elements: ' + (response ? response.error : 'Unknown error'));
          }
        });
      }
    });
  }

  // Event listeners for input functionality
  addInputBtn.addEventListener('click', addInputRow);
  extractXPathBtn.addEventListener('click', extractElementsByXPath);
  
  // Add event listeners to existing remove buttons
  const existingRemoveButtons = inputContainer.querySelectorAll('.remove-btn');
  existingRemoveButtons.forEach(btn => {
    btn.addEventListener('click', () => removeInputRow(btn));
  });

  // Add event listeners to existing textareas for input tracking
  const existingTextareas = inputContainer.querySelectorAll('.input-textarea');
  existingTextareas.forEach(textarea => {
    textarea.addEventListener('input', saveInputDataToStorage);
  });

  function findParent(nodes, url) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.href === url) {
        return node;
      }
      if (node.children.length > 0) {
        const found = findParent(node.children, url);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  function renderTree(nodes, container) {
    const ul = document.createElement('ul');
    nodes.forEach(node => {
      const li = document.createElement('li');
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<div class="element-text">${node.text}</div>`;
      
      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy HTML';
      copyButton.addEventListener('click', () => {
        const textarea = document.createElement('textarea');
        textarea.value = node.html;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });

      item.appendChild(copyButton);
      li.appendChild(item);

      if (node.children.length > 0) {
        const nestedContainer = document.createElement('div');
        nestedContainer.className = 'nested';
        renderTree(node.children, nestedContainer);
        li.appendChild(nestedContainer);
      }
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  function clearData() {
    displayTest.innerHTML = '';
    savedElementsTree = [];
    clearAllInputs();
    chrome.storage.local.set({ savedElementsTree: [] });
  }

  window.addEventListener('message', (event) => {
    if (event.data.action === 'clearData') {
      clearData();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementClicked") {
      const newNode = {
        text: request.text,
        url: request.url, //element current url
        href: request.href, //where the element leading to
        html: request.html, //the html string of the element
        xpath: "", //potential xpath pattern that match this element
        children: []
      };

      const parent = findParent(savedElementsTree, request.url);

      if (parent) {
        const isDuplicate = parent.children.some(item => item.text === newNode.text && item.url === newNode.url);
        if (!isDuplicate) {
          parent.children.push(newNode);
        }
      } else {
        const isDuplicate = savedElementsTree.some(item => item.text === newNode.text && item.url === newNode.url);
        if (!isDuplicate) {
          savedElementsTree.push(newNode);
        }
      }

      chrome.storage.local.set({ savedElementsTree: savedElementsTree });
      displayTest.innerHTML = '';
      renderTree(savedElementsTree, displayTest);
    }
  });

  saveElementSwitch.addEventListener('change', () => {
    const saveState = saveElementSwitch.checked;
    chrome.storage.local.set({ saveElementsState: saveState });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSaveElement", save: saveState });
    });
  });

  clearButton.addEventListener('click', () => {
    clearData();
  });

  chrome.storage.local.get(['savedElementsTree', 'saveElementsState'], (result) => {
    if (result.savedElementsTree) {
      savedElementsTree = result.savedElementsTree;
      displayTest.innerHTML = '';
      renderTree(savedElementsTree, displayTest);
    }
    if (result.saveElementsState !== undefined) {
      saveElementSwitch.checked = result.saveElementsState;
    }
  });

  // Load input data from storage
  loadInputDataFromStorage();

  // Initialize the remove button visibility
  updateRemoveButtonsVisibility();
});
