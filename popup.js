document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM loaded, initializing...');
  const clearButton = document.getElementById('clearButton');
  const displayTest = document.getElementById('displayTest');
  const addInputBtn = document.getElementById('addInputBtn');
  const inputContainer = document.getElementById('inputContainer');
  const extractXPathBtn = document.getElementById('extractXPathBtn');
  const downloadPdfsBtn = document.getElementById('downloadPdfsBtn');
  const geminiResponse = document.getElementById('geminiResponse');
  
  console.log('DOM elements found:');
  console.log('clearButton:', clearButton);
  console.log('displayTest:', displayTest);
  console.log('addInputBtn:', addInputBtn);
  console.log('inputContainer:', inputContainer);
  console.log('extractXPathBtn:', extractXPathBtn);
  console.log('downloadPdfsBtn:', downloadPdfsBtn);

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
    console.log('Found textareas:', textareas.length);
    const values = Array.from(textareas).map(textarea => textarea.value.trim()).filter(text => text.length > 0);
    console.log('XPath expressions found:', values);
    return values;
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

  // Function to collect all PDF elements from the tree
  function collectAllPdfElements(elements) {
    let pdfElements = [];
    
    elements.forEach(element => {
      if (element.isPdf && element.href) {
        pdfElements.push({
          text: element.text,
          href: element.href,
          url: element.url
        });
      }
      
      // Recursively check children
      if (element.children && element.children.length > 0) {
        pdfElements = pdfElements.concat(collectAllPdfElements(element.children));
      }
    });
    
    return pdfElements;
  }

  // Function to download all PDF files
  function downloadAllPdfs() {
    const pdfElements = collectAllPdfElements(savedElementsTree);
    
    if (pdfElements.length === 0) {
      alert('No PDF files found to download');
      return;
    }
    
    // Disable button during download
    downloadPdfsBtn.disabled = true;
    downloadPdfsBtn.textContent = `Downloading ${pdfElements.length} PDFs...`;
    
    let downloadCount = 0;
    let errorCount = 0;
    
    // Download each PDF
    pdfElements.forEach((pdfElement, index) => {
      setTimeout(() => {
        try {
          // Create a temporary anchor element to trigger download
          const link = document.createElement('a');
          link.href = pdfElement.href;
          link.download = pdfElement.text.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
          link.target = '_blank';
          
          // Append to body, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          downloadCount++;
        } catch (error) {
          console.error('Error downloading PDF:', pdfElement.href, error);
          errorCount++;
        }
        
        // Update button text with progress
        downloadPdfsBtn.textContent = `Downloading ${pdfElements.length} PDFs... (${downloadCount + errorCount}/${pdfElements.length})`;
        
        // Re-enable button when all downloads are complete
        if (downloadCount + errorCount === pdfElements.length) {
          setTimeout(() => {
            downloadPdfsBtn.disabled = false;
            downloadPdfsBtn.textContent = 'Download All PDFs';
            
            if (errorCount > 0) {
              alert(`Downloaded ${downloadCount} PDFs successfully. ${errorCount} downloads failed.`);
            } else {
              alert(`Successfully downloaded ${downloadCount} PDF files!`);
            }
          }, 1000);
        }
      }, index * 500); // Stagger downloads by 500ms to avoid overwhelming the browser
    });
  }

  // Initialize Gemini API module
  const geminiAPI = new GeminiAPI();

  // Function to parse Gemini response and extract XPath options
  function parseGeminiXPathResponse(responseText) {
    try {
      // Try to extract JSON from the response text
      // Look for JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const xpathOptions = JSON.parse(jsonStr);
        
        // Extract XPath values from the options
        const xpathValues = Object.values(xpathOptions);
        console.log('Parsed XPath options:', xpathValues);
        return xpathValues;
      } else {
        console.warn('No JSON object found in Gemini response');
        return [];
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.log('Raw response:', responseText);
      return [];
    }
  }

  // Function to populate input areas with XPath options
  function populateInputAreasWithXPaths(xpathOptions) {
    if (!xpathOptions || xpathOptions.length === 0) {
      console.log('No XPath options to populate');
      return;
    }

    console.log('Populating input areas with XPath options:', xpathOptions);

    // Get current textareas and their existing values
    const currentTextareas = inputContainer.querySelectorAll('.input-textarea');
    const existingValues = Array.from(currentTextareas).map(textarea => textarea.value.trim()).filter(value => value.length > 0);
    
    console.log('Existing XPath patterns:', existingValues);

    // Filter out duplicate XPath patterns that already exist
    const newXpathOptions = xpathOptions.filter(xpath => !existingValues.includes(xpath));
    
    if (newXpathOptions.length === 0) {
      console.log('All XPath options already exist in input areas');
      return;
    }

    console.log('New XPath options to add:', newXpathOptions);

    // Add new textareas for the new XPath options
    newXpathOptions.forEach(() => {
      addInputRow();
    });

    // Get all textareas after adding new ones
    const allTextareas = inputContainer.querySelectorAll('.input-textarea');

    // Find empty textareas and populate them with new XPath options
    let newXpathIndex = 0;
    allTextareas.forEach((textarea, index) => {
      if (textarea.value.trim() === '' && newXpathIndex < newXpathOptions.length) {
        textarea.value = newXpathOptions[newXpathIndex];
        console.log(`Populated empty textarea ${index + 1} with:`, newXpathOptions[newXpathIndex]);
        newXpathIndex++;
      }
    });

    // Save the updated data to storage
    saveInputDataToStorage();
    
    // Update remove button visibility
    updateRemoveButtonsVisibility();

    console.log(`Successfully added ${newXpathOptions.length} new XPath options to input areas`);
  }


  function extractElementsByXPath() {
    console.log('extractElementsByXPath function called!');
    const xpathExpressions = getAllInputTexts();
    console.log('XPath expressions:', xpathExpressions);
    
    if (xpathExpressions.length === 0) {
      console.log('No XPath expressions found, showing alert');
      alert('Please enter at least one XPath expression');
      return;
    }

    const isRecursive = true; // Always use recursive extraction

    // Disable button during extraction
    extractXPathBtn.disabled = true;
    extractXPathBtn.textContent = 'Extracting (Recursive)...';

    // Send message to content script to extract elements
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: "extractElementsByXPath", 
          xpathExpressions: xpathExpressions,
          recursive: isRecursive
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
              // Add extracted elements to savedElementsTree following the same pattern as click tracking
              console.log('Processing extracted elements:', response.elements);
              
              // Function to add an element and its children to the tree
              function addElementToTree(elementData) {
                const newNode = {
                  text: elementData.text || 'XPath Element',
                  url: elementData.url || tabs[0].url,
                  href: elementData.href || '',
                  html: elementData.html || '',
                  xpath: elementData.xpath || '',
                  tagName: elementData.tagName || '',
                  id: elementData.id || '',
                  className: elementData.className || '',
                  isPdf: elementData.isPdf || false,
                  pdfInfo: elementData.pdfInfo || null,
                  children: elementData.children || []
                };
                
                // For XPath extracted elements, we need to find the appropriate parent
                // based on the element's URL (where it was found), not the current tab URL
                console.log('Looking for parent for element:', elementData.text, 'with URL:', elementData.url);
                const parent = findParent(savedElementsTree, elementData.url);
                
                if (parent) {
                  // Check for duplicates in parent's children
                  const isDuplicate = parent.children.some(item => 
                    item.text === newNode.text && 
                    item.url === newNode.url && 
                    item.href === newNode.href
                  );

                  console.log('Is duplicate in parent children:', isDuplicate);
                  if (!isDuplicate) {
                    parent.children.push(newNode);
                    console.log('Added to parent children. Parent now has', parent.children.length, 'children');
                  }
                } else {
                  // Check for duplicates in root level
                  const isDuplicate = savedElementsTree.some(item => 
                    item.text === newNode.text && 
                    item.url === newNode.url && 
                    item.href === newNode.href
                  );
                  
                  if (!isDuplicate) {
                    savedElementsTree.push(newNode);
                  }
                }
                
                // Recursively add children elements to the tree as well
                if (elementData.children && elementData.children.length > 0) {
                  elementData.children.forEach(childElement => {
                    addElementToTree(childElement);
                  });
                }
              }
              
              // Process all extracted elements (including their children)
              console.log('Total elements to process:', response.elements.length);
              response.elements.forEach((elementData, index) => {
                console.log(`Processing element ${index + 1}:`, elementData.text, 'from URL:', elementData.url);
                addElementToTree(elementData);
              });
              console.log('Final savedElementsTree length:', savedElementsTree.length);
              
              // Save to storage and update display
              chrome.storage.local.set({ savedElementsTree: savedElementsTree });
              displayTest.innerHTML = '';
              renderTree(savedElementsTree, displayTest);
              
              // Count all elements including children recursively
              function countAllElements(elements) {
                let count = 0;
                elements.forEach(element => {
                  count += 1; // Count the element itself
                  if (element.children && element.children.length > 0) {
                    count += countAllElements(element.children); // Recursively count children
                  }
                });
                return count;
              }
              
              const totalElements = countAllElements(response.elements);
              
              alert(`Successfully extracted ${response.elements.length} elements${isRecursive ? ` (${totalElements} total including children)` : ''}`);
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
  console.log('Setting up event listeners...');
  console.log('addInputBtn:', addInputBtn);
  console.log('extractXPathBtn:', extractXPathBtn);
  console.log('downloadPdfsBtn:', downloadPdfsBtn);
  
  addInputBtn.addEventListener('click', addInputRow);
  extractXPathBtn.addEventListener('click', extractElementsByXPath);
  downloadPdfsBtn.addEventListener('click', downloadAllPdfs);
  
  console.log('Event listeners attached successfully');
  
  
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
    console.log('findParent called with URL:', url, 'searching in', nodes.length, 'nodes');
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      console.log('Checking node:', node.text, 'href:', node.href, 'url:', node.url);
      if (node.href === url) {
        console.log('Found matching parent by href');
        return node;
      }
      if (node.children.length > 0) {
        const found = findParent(node.children, url);
        if (found) {
          return found;
        }
      }
    }
    console.log('No parent found for URL:', url);
    return null;
  }

  function renderTree(nodes, container) {
    console.log('Rendering tree with nodes:', nodes);
    const ul = document.createElement('ul');
    nodes.forEach(node => {
      const li = document.createElement('li');
      const item = document.createElement('div');
      item.className = 'list-item';
      
      // Add PDF indicator if this is a PDF element
      let pdfIndicator = '';
      console.log('Processing node:', node.text, 'isPdf:', node.isPdf, 'href:', node.href);
      if (node.isPdf) {
        console.log('Found PDF element:', node.text, 'href:', node.href);
        pdfIndicator = '<span class="pdf-indicator">PDF</span>';
        item.classList.add('pdf-element');
        console.log('Added pdf-element class to item, classes:', item.className);
      }
    
      
      item.innerHTML = `<div class="element-text">${node.text} ${pdfIndicator}</div>`;
      
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
        console.log(`Node "${node.text}" has ${node.children.length} children:`, node.children);
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
    // Clear display area
    displayTest.innerHTML = '';
    
    // Clear in-memory data
    savedElementsTree = [];
    clearAllInputs();
    
    // Clear persistent storage
    chrome.storage.local.set({ 
      savedElementsTree: [],
      xpathInputData: []
    });
  }

  window.addEventListener('message', (event) => {
    if (event.data.action === 'clearData') {
      clearData();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeElementWithGemini") {
      // Call Gemini API to analyze the clicked element
      geminiAPI.analyzeElement(
        request.html,
        request.text,
        request.href,
        // onProgress callback
        (message) => {
          geminiAPI.showResponse(message, 'loading', geminiResponse);
        },
        // onSuccess callback
        (message) => {
          geminiAPI.showResponse(message, 'success', geminiResponse);
          
          // Parse the Gemini response and populate input areas
          const xpathOptions = parseGeminiXPathResponse(message);
          if (xpathOptions.length > 0) {
            populateInputAreasWithXPaths(xpathOptions);
            
            // Show success message about populated XPath options
            const successMessage = `✅ Successfully populated ${xpathOptions.length} XPath option(s) in the input areas!`;
            geminiAPI.showResponse(successMessage, 'success', geminiResponse);
          } else {
            // Show warning if no XPath options were found
            const warningMessage = `⚠️ No XPath options found in the response. Please check the Gemini response format.`;
            geminiAPI.showResponse(warningMessage, 'error', geminiResponse);
          }
        },
        // onError callback
        (message) => {
          geminiAPI.showResponse(message, 'error', geminiResponse);
        }
      );
    }
  });



  clearButton.addEventListener('click', () => {
    clearData();
  });

  chrome.storage.local.get(['savedElementsTree'], (result) => {
    if (result.savedElementsTree) {
      savedElementsTree = result.savedElementsTree;
      displayTest.innerHTML = '';
      renderTree(savedElementsTree, displayTest);
    }
  });

  // Load input data from storage
  loadInputDataFromStorage();

  // Initialize the remove button visibility
  updateRemoveButtonsVisibility();
});
