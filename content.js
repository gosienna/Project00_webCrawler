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

let saveElements = false;
let checkXPath = false;
let clickListenerAttached = false;

function updateClickListeners() {
    const shouldAttachListener = saveElements || checkXPath;
    
    if (shouldAttachListener && !clickListenerAttached) {
        document.addEventListener('click', handleClick, true);
        clickListenerAttached = true;
    } else if (!shouldAttachListener && clickListenerAttached) {
        document.removeEventListener('click', handleClick, true);
        clickListenerAttached = false;
    }
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

function handleClick(event) {
    if (event.target.tagName === 'A') {
        const href = event.target.href;
        const isPdf = isPdfFile(href, event.target);
        
        // If checkXPath is enabled, prevent navigation
        if (checkXPath) {
            event.preventDefault();
            event.stopPropagation();
            
            // Visual feedback that the link was intercepted
            event.target.style.backgroundColor = '#ffeb3b';
            event.target.style.transition = 'background-color 0.3s';
            setTimeout(() => {
                event.target.style.backgroundColor = '';
            }, 1000);
        }
        
        // If saveElements is enabled, send the element data
        if (saveElements) {
            chrome.runtime.sendMessage({ 
                action: "elementClicked", 
                text: event.target.textContent?.trim() || '',
                url: window.location.href,
                referrer: document.referrer,
                href: href,
                html: event.target.outerHTML,
                isPdf: isPdf,
                pdfInfo: isPdf ? getPdfInfo(href, event.target) : null
            });
        }
        
        // Always trigger Gemini AI request for XPath analysis when checkXPath is enabled
        if (checkXPath) {
            chrome.runtime.sendMessage({
                action: "analyzeElementWithGemini",
                html: event.target.outerHTML,
                text: event.target.textContent?.trim() || '',
                href: href
            });
        }
    }
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
    } else if (request.action === "toggleSaveElement") {
        saveElements = request.save;
        updateClickListeners();
    } else if (request.action === "toggleCheckXPath") {
        checkXPath = request.checkXPath;
        updateClickListeners();
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
    }
    return true; // Indicates that the response is sent asynchronously
});

// Request the initial state of the switches from the background script
chrome.runtime.sendMessage({ action: "getSaveElementsState" }, (response) => {
    if (response) {
        saveElements = response.save;
        updateClickListeners();
    }
});

chrome.runtime.sendMessage({ action: "getCheckXPathState" }, (response) => {
    if (response) {
        checkXPath = response.checkXPath;
        updateClickListeners();
    }
});