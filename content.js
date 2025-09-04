// Add CSS for the hovering panel
const style = document.createElement('style');
style.textContent = `
  #web-crawler-panel {
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 400px !important;
    height: 100vh !important;
    background: white !important;
    border-left: 2px solid #ddd !important;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1) !important;
    z-index: 2147483647 !important;
    transition: transform 0.3s ease !important;
  }
  
  #web-crawler-panel.hidden {
    transform: translateX(100%) !important;
  }
  
  #web-crawler-tab {
    position: fixed !important;
    top: 0 !important;
    right: 400px !important;
    width: 30px !important;
    height: 30px !important;
    background: #2196F3 !important;
    color: white !important;
    border: none !important;
    border-radius: 0 0 8px 8px !important;
    cursor: pointer !important;
    z-index: 2147483648 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 14px !important;
    font-weight: bold !important;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
    transition: all 0.3s ease !important;
  }
  
  #web-crawler-tab:hover {
    background: #1976D2 !important;
    height: 35px !important;
  }
  
  #web-crawler-tab.hidden {
    right: 0 !important;
  }
`;
document.head.appendChild(style);

// Create the hovering panel iframe
const iframe = document.createElement('iframe');
iframe.id = 'web-crawler-panel';
iframe.src = chrome.runtime.getURL('panel.html');
iframe.style.width = '400px';
iframe.style.height = '100vh';
iframe.style.border = 'none';
iframe.style.position = 'fixed';
iframe.style.top = '0';
iframe.style.right = '0';
iframe.style.zIndex = '2147483647';
iframe.style.backgroundColor = 'white';
iframe.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.1)';
iframe.style.transition = 'transform 0.3s ease';

document.body.appendChild(iframe);

// Create toggle tab
const toggleTab = document.createElement('button');
toggleTab.id = 'web-crawler-tab';
toggleTab.innerHTML = '⚙';
toggleTab.title = 'Toggle Web Crawler Panel';
toggleTab.style.position = 'fixed';
toggleTab.style.top = '0';
toggleTab.style.right = '400px';
toggleTab.style.width = '30px';
toggleTab.style.height = '30px';
toggleTab.style.background = '#2196F3';
toggleTab.style.color = 'white';
toggleTab.style.border = 'none';
toggleTab.style.borderRadius = '0 0 8px 8px';
toggleTab.style.cursor = 'pointer';
toggleTab.style.zIndex = '2147483648';
toggleTab.style.display = 'flex';
toggleTab.style.alignItems = 'center';
toggleTab.style.justifyContent = 'center';
toggleTab.style.fontSize = '14px';
toggleTab.style.fontWeight = 'bold';
toggleTab.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
toggleTab.style.transition = 'all 0.3s ease';

toggleTab.addEventListener('mouseenter', () => {
    toggleTab.style.background = '#1976D2';
    toggleTab.style.height = '35px';
});

toggleTab.addEventListener('mouseleave', () => {
    toggleTab.style.background = '#2196F3';
    toggleTab.style.height = '30px';
});

document.body.appendChild(toggleTab);

let panelVisible = true;
let saveElements = false;

function togglePanel() {
    const iframe = document.getElementById('web-crawler-panel');
    const toggleTab = document.getElementById('web-crawler-tab');
    
    if (iframe && toggleTab) {
        if (panelVisible) {
            // Hide panel
            iframe.classList.add('hidden');
            toggleTab.classList.add('hidden');
            toggleTab.innerHTML = '⚙';
        } else {
            // Show panel
            iframe.classList.remove('hidden');
            toggleTab.classList.remove('hidden');
            toggleTab.innerHTML = '✕';
        }
        panelVisible = !panelVisible;
    }
}

// Add click event to toggle tab
document.getElementById('web-crawler-tab').addEventListener('click', togglePanel);

// Function to check if an element is clickable
function isClickableElement(element) {
    const tagName = element.tagName.toLowerCase();
    
    // Always clickable elements
    const clickableTags = [
        'a', 'button', 'input', 'select', 'textarea', 'option',
        'area', 'label', 'summary', 'details'
    ];
    
    if (clickableTags.includes(tagName)) {
        return true;
    }
    
    // Check for interactive attributes
    if (element.hasAttribute('onclick') || 
        element.hasAttribute('onmousedown') || 
        element.hasAttribute('onmouseup') ||
        element.hasAttribute('onmousemove') ||
        element.hasAttribute('onmouseover') ||
        element.hasAttribute('onmouseout')) {
        return true;
    }
    
    // Check for role attributes that indicate interactivity
    const role = element.getAttribute('role');
    if (role && [
        'button', 'link', 'menuitem', 'tab', 'option', 'checkbox', 
        'radio', 'switch', 'slider', 'combobox', 'textbox'
    ].includes(role)) {
        return true;
    }
    
    // Check for cursor pointer style
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.cursor === 'pointer') {
        return true;
    }
    
    // Check if element has tabindex (indicating it can be focused)
    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') {
        return true;
    }
    
    // Check for data attributes that might indicate clickability
    if (element.hasAttribute('data-clickable') || 
        element.hasAttribute('data-toggle') ||
        element.hasAttribute('data-target') ||
        element.hasAttribute('data-dismiss')) {
        return true;
    }
    
    // Check for common clickable classes
    const className = element.className.toLowerCase();
    if (className.includes('btn') || 
        className.includes('button') || 
        className.includes('clickable') ||
        className.includes('link') ||
        className.includes('nav') ||
        className.includes('menu')) {
        return true;
    }
    
    return false;
}

// Function to handle element clicks - allows normal click behavior while tracking
function handleClick(event) {
    if (saveElements && isClickableElement(event.target)) {
        // Send the element data but don't prevent the default behavior
        chrome.runtime.sendMessage({ 
            action: "elementClicked", 
            html: event.target.outerHTML,
            text: event.target.textContent?.trim() || '',
            tagName: event.target.tagName,
            className: event.target.className,
            id: event.target.id,
            href: event.target.href || '',
            src: event.target.src || '',
            role: event.target.getAttribute('role') || '',
            tabindex: event.target.getAttribute('tabindex') || '',
            cursor: window.getComputedStyle(event.target).cursor
        });
    }
}

// No need for special link handling since we're working with the original page

// Initialize element tracking for a document
function initializeElementTracking(doc) {
    if (saveElements) {
        doc.addEventListener('click', handleClick, true);
    }
}

// Function to remove element tracking from a document
function removeElementTracking(doc) {
    doc.removeEventListener('click', handleClick, true);
}

// Initialize element tracking on the main document
initializeElementTracking(document);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "crawl") {
        try {
            const results = document.evaluate(request.xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const data = [];
            for (let i = 0; i < results.snapshotLength; i++) {
                const node = results.snapshotItem(i);
                data.push(node.textContent.trim());
            }
            sendResponse({ data: data });
        } catch (e) {
            sendResponse({ error: e.message });
        }
    } else if (request.action === "toggleInspector") {
        window.xpathCrawler.toggleInspector();
    } else if (request.action === "togglePanel") {
        togglePanel();
    } else if (request.action === "toggleSaveElement") {
        saveElements = request.save;
        
        if (saveElements) {
            // Add event listener to the main document
            document.addEventListener('click', handleClick, true);
        } else {
            // Remove event listener from the main document
            document.removeEventListener('click', handleClick, true);
        }
    }
    return true; // Indicates that the response is sent asynchronously
});