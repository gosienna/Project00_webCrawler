const link = document.createElement('link');
link.href = chrome.runtime.getURL('panel.css');
link.type = 'text/css';
link.rel = 'stylesheet';
document.head.appendChild(link);

const panel = document.createElement('div');
panel.id = 'web-crawler-panel';

const tab = document.createElement('div');
tab.id = 'panel-tab';
tab.textContent = 'C'; // For Crawler

const iframe = document.createElement('iframe');
iframe.id = 'panel-iframe';
iframe.src = chrome.runtime.getURL('panel.html');

panel.appendChild(tab);
panel.appendChild(iframe);
document.body.appendChild(panel);

tab.addEventListener('click', () => {
    panel.classList.toggle('visible');
});

let clickListenerAttached = false;
let lastRightClickedElement = null;


// Add right-click event listener to capture the last right-clicked element
document.addEventListener('contextmenu', (event) => {
    // Try to find the most specific clickable element
    let target = event.target;
    
    // If the target is a text node, get its parent element
    if (target.nodeType === Node.TEXT_NODE) {
        target = target.parentElement;
    }
    
    // Look for the nearest clickable element starting from the target
    let clickableElement = target;
    let current = target;
    let depth = 0;
    
    while (current && current !== document.body && depth < 5) {
        if (isClickableElement(current)) {
            clickableElement = current;
            break;
        }
        current = current.parentElement;
        depth++;
    }
    
    lastRightClickedElement = clickableElement;
    console.log('Right-click captured element:', clickableElement.tagName, clickableElement.className, clickableElement.id);
}, true);

// Function to check if an element is clickable
function isClickableElement(element) {
    if (!element) {
        console.log('isClickableElement: element is null/undefined');
        return false;
    }
    
    console.log('Checking if element is clickable:', {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        href: element.href || element.getAttribute('href'),
        onclick: element.onclick !== null,
        role: element.getAttribute('role'),
        tabindex: element.getAttribute('tabindex')
    });
    
    // Check if element has pointer-events: none
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.pointerEvents === 'none') {
        console.log('Element has pointer-events: none');
        return false;
    }
    
    // Check if element is visible
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        console.log('Element is not visible');
        return false;
    }
    
    // Check if element has opacity 0
    if (parseFloat(computedStyle.opacity) === 0) {
        console.log('Element has opacity 0');
        return false;
    }
    
    // Check if element is disabled
    if (element.disabled === true) {
        console.log('Element is disabled');
        return false;
    }
    
    // Check if element is a clickable tag
    const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
    if (clickableTags.includes(element.tagName)) {
        console.log('Element is a clickable tag:', element.tagName);
        return true;
    }
    
    // Check if element has click event listeners
    if (element.onclick !== null) {
        console.log('Element has onclick handler');
        return true;
    }
    
    // Check if element has role attributes that make it clickable
    const role = element.getAttribute('role');
    const clickableRoles = ['button', 'link', 'menuitem', 'tab', 'option', 'checkbox', 'radio'];
    if (role && clickableRoles.includes(role.toLowerCase())) {
        console.log('Element has clickable role:', role);
        return true;
    }
    
    // Check if element has tabindex (makes it focusable/clickable)
    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') {
        console.log('Element has tabindex:', element.getAttribute('tabindex'));
        return true;
    }
    
    // Check if element has data attributes that suggest it's interactive
    const interactiveDataAttrs = ['data-toggle', 'data-target', 'data-dismiss', 'data-bs-toggle', 'data-bs-target', 'data-click', 'data-action'];
    if (interactiveDataAttrs.some(attr => element.hasAttribute(attr))) {
        console.log('Element has interactive data attributes');
        return true;
    }
    
    // Check if element has classes that suggest it's clickable
    const clickableClasses = ['btn', 'button', 'link', 'clickable', 'interactive', 'nav-link', 'dropdown-toggle', 'menu-item', 'tab', 'card', 'item'];
    const classList = Array.from(element.classList);
    const hasClickableClass = clickableClasses.some(cls => classList.some(elementClass => 
        elementClass.toLowerCase().includes(cls.toLowerCase())
    ));
    if (hasClickableClass) {
        console.log('Element has clickable classes');
        return true;
    }
    
    // Check if element has href attribute (even if not an A tag)
    if (element.hasAttribute('href') && element.getAttribute('href') !== '') {
        console.log('Element has href attribute');
        return true;
    }
    
    // Check if element is inside a clickable container
    let parent = element.parentElement;
    let depth = 0;
    while (parent && parent !== document.body && depth < 10) { // Limit depth to prevent infinite loops
        if (clickableTags.includes(parent.tagName) || 
            parent.onclick !== null || 
            parent.hasAttribute('tabindex') ||
            parent.hasAttribute('href')) {
            console.log('Element is inside clickable parent:', parent.tagName);
            return true;
        }
        parent = parent.parentElement;
        depth++;
    }
    
    console.log('Element is not clickable');
    return false;
}

// Function to find the nearest clickable parent element
function findNearestClickableElement(element) {
    if (!element) {
        console.log('findNearestClickableElement: element is null/undefined');
        return null;
    }
    
    console.log('Searching for clickable parent starting from:', element.tagName, element.className);
    
    let current = element;
    let depth = 0;
    while (current && current !== document.body && depth < 10) { // Limit depth to prevent infinite loops
        console.log(`Checking parent at depth ${depth}:`, current.tagName, current.className);
        if (isClickableElement(current)) {
            console.log('Found clickable parent:', current.tagName, current.className);
            return current;
        }
        current = current.parentElement;
        depth++;
    }
    
    console.log('No clickable parent found');
    return null;
}

// PDF Detection Functions
function isPdfFile(href, element) {
    if (!href) return false;
    
    // Check if href contains .pdf (handles query parameters, fragments, etc.)
    const lowerHref = href.toLowerCase();
    if (lowerHref.includes('.pdf')) {
        // Extract the pathname to check if .pdf is in the actual file path
        try {
            const url = new URL(href, window.location.href);
            const pathname = url.pathname.toLowerCase();
            if (pathname.includes('.pdf')) {
                return true;
            }
        } catch (error) {
            // If URL parsing fails, check if .pdf appears before common URL separators
            const pdfIndex = lowerHref.indexOf('.pdf');
            if (pdfIndex !== -1) {
                // Check if .pdf is followed by common URL separators or end of string
                const afterPdf = lowerHref.substring(pdfIndex + 4);
                if (afterPdf === '' || afterPdf.startsWith('?') || afterPdf.startsWith('#') || afterPdf.startsWith('&')) {
                    return true;
                }
            }
        }
    }
    
    // Check if element has download attribute with .pdf
    const downloadAttr = element.getAttribute('download');
    if (downloadAttr && downloadAttr.toLowerCase().includes('.pdf')) {
        return true;
    }
    
    // Check if element has type attribute indicating PDF
    const typeAttr = element.getAttribute('type');
    if (typeAttr && typeAttr.toLowerCase().includes('pdf')) {
        return true;
    }
    
    // Check if element text suggests it's a PDF
    const text = element.textContent?.toLowerCase() || '';
    if (text.includes('pdf') || text.includes('download') || text.includes('document')) {
        // Additional check: look for PDF-related keywords in nearby elements
        const parent = element.parentElement;
        if (parent) {
            const parentText = parent.textContent?.toLowerCase() || '';
            if (parentText.includes('pdf') || parentText.includes('document')) {
                return true;
            }
        }
    }
    
    return false;
}

function getPdfInfo(href, element) {
    const info = {
        url: href,
        filename: '',
        size: null,
        title: element.textContent?.trim() || 'PDF Document'
    };
    
    // Extract filename from URL
    try {
        const url = new URL(href, window.location.href);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop();
        if (filename && filename.toLowerCase().endsWith('.pdf')) {
            info.filename = filename;
        }
    } catch (error) {
        console.warn('Error parsing PDF URL:', error);
    }
    
    // Try to get size from element attributes
    const sizeAttr = element.getAttribute('data-size') || element.getAttribute('size');
    if (sizeAttr) {
        info.size = sizeAttr;
    }
    
    return info;
}


async function extractElementsByXPath(xpathExpressions, recursive = false) {
    const processedUrls = new Set();
    const maxDepth = 2; // Maximum recursion depth to prevent infinite loops
    
    async function extractFromPage(url, xpathExpressions, isRecursive = false, currentDepth = 0) {
        if (processedUrls.has(url)) {
            return [];
        }
        processedUrls.add(url);
        
        const pageElements = [];
        
        // If this is a different URL, we need to fetch it
        if (url !== window.location.href) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${url}: ${response.status}`);
                    return [];
                }
                
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extract elements from the fetched page
                xpathExpressions.forEach(xpath => {
                    try {
                        const result = doc.evaluate(
                            xpath,
                            doc,
                            null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                            null
                        );
                        
                        for (let i = 0; i < result.snapshotLength; i++) {
                            const element = result.snapshotItem(i);
                            if (element) {
                                const href = element.href || element.getAttribute('href') || '';
                                const isPdf = isPdfFile(href, element);
                                console.log('Fetched page element:', element.innerHTML, 'isPdf:', isPdf, 'href:', href, 'from URL:', url);
                                
                                pageElements.push({
                                    text: element.textContent?.trim() || element.tagName || 'Element',
                                    url: url,
                                    href: href,
                                    html: element.outerHTML,
                                    xpath: xpath,
                                    tagName: element.tagName,
                                    id: element.id || '',
                                    className: element.className || '',
                                    children: [],
                                    isPdf: isPdf,
                                    pdfInfo: isPdf ? getPdfInfo(href, element) : null
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error evaluating XPath "${xpath}" on ${url}:`, error);
                    }
                });
            } catch (error) {
                console.error(`Error fetching ${url}:`, error);
                return [];
            }
        } else {
            // Extract from current page
            xpathExpressions.forEach(xpath => {
                try {
                    const result = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    
                    for (let i = 0; i < result.snapshotLength; i++) {
                        const element = result.snapshotItem(i);
                        if (element) {
                            const href = element.href || element.getAttribute('href') || '';
                            const isPdf = isPdfFile(href, element);
                            console.log('Current page element:', element.innerHTML, 'isPdf:', isPdf, 'href:', href);
                            pageElements.push({
                                text: element.textContent?.trim() || element.tagName || 'Element',
                                url: window.location.href,
                                href: href,
                                html: element.outerHTML,
                                xpath: xpath,
                                tagName: element.tagName,
                                id: element.id || '',
                                className: element.className || '',
                                children: [],
                                isPdf: isPdf,
                                pdfInfo: isPdf ? getPdfInfo(href, element) : null
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error evaluating XPath "${xpath}":`, error);
                }
            });
        }
        
        // If recursive and we have links, extract from linked pages (with depth limit)
        if (isRecursive && pageElements.length > 0 && currentDepth < maxDepth) {
            const linksToFollow = [];
            pageElements.forEach(element => {
                if (element.href && !processedUrls.has(element.href)) {
                    // Convert relative URLs to absolute URLs
                    let absoluteUrl = element.href;
                    if (!element.href.startsWith('http')) {
                        try {
                            absoluteUrl = new URL(element.href, url).href;
                        } catch (error) {
                            console.warn(`Invalid URL: ${element.href}`, error);
                            return; // Skip invalid URLs
                        }
                    }
                    linksToFollow.push(absoluteUrl);
                }
            });
            
            // Use all available links for comprehensive searching
            const limitedLinks = linksToFollow;
            
            for (const linkUrl of limitedLinks) {
                try {
                    // Use all XPath expressions for each linked page with full recursion
                    console.log('Extracting from linked page:', linkUrl, 'at depth:', currentDepth + 1);
                    const childElements = await extractFromPage(linkUrl, xpathExpressions, true, currentDepth + 1);
                    console.log('Found', childElements.length, 'child elements from', linkUrl);
                    
                    // Find the parent element and add children
                    const parentElement = pageElements.find(el => el.href === linkUrl);
                    if (parentElement) {
                        parentElement.children = childElements;
                        console.log('Added', childElements.length, 'children to parent element:', parentElement.text);
                    }
                } catch (error) {
                    console.error(`Error extracting from linked page ${linkUrl}:`, error);
                }
            }
        }
        
        return pageElements;
    }
    
    // Start extraction from current page
    const elements = await extractFromPage(window.location.href, xpathExpressions, recursive);
    return elements;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "togglePanel") {
        panel.classList.toggle('visible');
    } else if (request.action === "clearData") {
        const iframe = document.getElementById('panel-iframe');
        if (iframe) {
            iframe.contentWindow.postMessage({ action: "clearData" }, '*');
        }
    } else if (request.action === "extractElementsByXPath") {
        (async () => {
            try {
                const elements = await extractElementsByXPath(request.xpathExpressions, request.recursive);
                sendResponse({
                    success: true,
                    elements: elements,
                    count: elements.length
                });
            } catch (error) {
                console.error('Error extracting elements:', error);
                sendResponse({
                    success: false,
                    error: error.message || 'Unknown error occurred'
                });
            }
        })();
        return true; // Indicates that the response is sent asynchronously
    } else if (request.action === "extractXPathFromElement") {
        // Handle right-click context menu action
        let element = null;
        
        console.log('Right-click context menu triggered with coordinates:', request.clickX, request.clickY);
        
        // First try to use the last right-clicked element (most reliable)
        if (lastRightClickedElement) {
            console.log('Using last right-clicked element:', lastRightClickedElement.tagName, lastRightClickedElement.className);
            element = lastRightClickedElement;
        }
        
        // If no last clicked element, try coordinates
        if (!element && request.clickX !== undefined && request.clickY !== undefined && 
            isFinite(request.clickX) && isFinite(request.clickY)) {
            try {
                const elementFromPoint = document.elementFromPoint(request.clickX, request.clickY);
                console.log('Element from point:', elementFromPoint?.tagName, elementFromPoint?.className);
                
                // If the element from point is a container, try to find a more specific element
                if (elementFromPoint && (elementFromPoint.id === 'contentContainer' || 
                    elementFromPoint.className.includes('container') ||
                    elementFromPoint.tagName === 'BODY' ||
                    elementFromPoint.tagName === 'HTML')) {
                    console.log('Element from point is a container, searching for more specific element...');
                    
                    // Try to find elements with more specific selectors at the same coordinates
                    const elementsAtPoint = document.elementsFromPoint(request.clickX, request.clickY);
                    console.log('All elements at point:', elementsAtPoint.map(el => el.tagName + (el.className ? '.' + el.className : '') + (el.id ? '#' + el.id : '')));
                    
                    // Look for the first clickable element in the stack
                    for (const el of elementsAtPoint) {
                        if (el !== elementFromPoint && isClickableElement(el)) {
                            console.log('Found clickable element in stack:', el.tagName, el.className);
                            element = el;
                            break;
                        }
                    }
                } else {
                    element = elementFromPoint;
                }
            } catch (error) {
                console.warn('Error getting element from point:', error);
            }
        }
        
        // Final fallback: try to find highlighted elements
        if (!element) {
            const highlightedElements = document.querySelectorAll('[style*="background-color: rgb(255, 235, 59)"]');
            if (highlightedElements.length > 0) {
                element = highlightedElements[highlightedElements.length - 1];
                console.log('Using highlighted element:', element.tagName, element.className);
            }
        }
        
        // Validate that the element is clickable
        if (element) {
            // Check if the current element is clickable
            if (!isClickableElement(element)) {
                // Try to find the nearest clickable parent
                const clickableElement = findNearestClickableElement(element);
                if (clickableElement) {
                    element = clickableElement;
                    console.log('Found clickable parent element:', element.tagName, element.className);
                } else {
                    // Fallback: Check if element has any interactive properties
                    const hasInteractiveProperties = element.hasAttribute('href') || 
                                                   element.hasAttribute('onclick') || 
                                                   element.hasAttribute('data-href') ||
                                                   element.hasAttribute('data-url') ||
                                                   element.hasAttribute('data-link') ||
                                                   element.classList.toString().toLowerCase().includes('link') ||
                                                   element.classList.toString().toLowerCase().includes('click') ||
                                                   element.classList.toString().toLowerCase().includes('button');
                    
                    if (hasInteractiveProperties) {
                        console.log('Element has interactive properties, proceeding anyway:', element.tagName, element.className);
                    } else {
                        // Even more lenient fallback: if it's not a generic container, proceed anyway
                        const isGenericContainer = element.id === 'contentContainer' || 
                                                 element.className.includes('container') ||
                                                 element.tagName === 'BODY' ||
                                                 element.tagName === 'HTML' ||
                                                 element.tagName === 'DIV' && !element.className && !element.id;
                        
                        if (!isGenericContainer) {
                            console.log('Element is not a generic container, proceeding with analysis:', element.tagName, element.className);
                        } else {
                            console.log('Element is a generic container, cannot proceed');
                            sendResponse({ success: false, message: 'Selected element is a generic container and not suitable for XPath analysis' });
                            return true;
                        }
                    }
                }
            }
        }
        
        if (element) {
            const href = element.href || element.getAttribute('href') || '';
            const isPdf = isPdfFile(href, element);
            
            console.log('Processing clickable element:', {
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                href: href,
                isPdf: isPdf,
                text: element.textContent?.trim().substring(0, 50) + '...'
            });
            
            // Send element data to popup for Gemini AI analysis
            chrome.runtime.sendMessage({
                action: "analyzeElementWithGemini",
                html: element.outerHTML,
                text: element.textContent?.trim() || '',
                href: href,
                isPdf: isPdf,
                pdfInfo: isPdf ? getPdfInfo(href, element) : null
            });
            
            // Visual feedback that the element was selected
            element.style.backgroundColor = '#ffeb3b';
            element.style.transition = 'background-color 0.3s';
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 1000);
            
            sendResponse({ 
                success: true, 
                message: `Clickable element selected for XPath analysis: ${element.tagName}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ').join('.') : ''}` 
            });
        } else {
            sendResponse({ success: false, message: 'No element found at click position' });
        }
        return true;
    }
    return true; // Indicates that the response is sent asynchronously
});

