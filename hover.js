// Create a global object to share functions
window.xpathCrawler = window.xpathCrawler || {};

let inspectorEnabled = false;
let highlightedElement = null;

function getXPathForElement(element) {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    if (element === document.body) {
        return '/html/body';
    }

    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
            return `${getXPathForElement(element.parentNode)}/${element.tagName.toLowerCase()}[${ix + 1}]`;
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
}

const mouseOverHandler = (e) => {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
    }
    highlightedElement = e.target;
    highlightedElement.style.outline = '2px solid #f00';
};

const mouseOutHandler = (e) => {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement = null;
    }
};

const clickHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const xpath = getXPathForElement(e.target);
    const html = e.target.outerHTML;
    const data = { action: "elementSelected", xpath: xpath, html: html };

    // Save to storage as a reliable backup
    chrome.storage.local.set({ lastSelectedElement: data });

    // Send a message for a live update (if the popup is open)
    chrome.runtime.sendMessage(data);

    window.xpathCrawler.toggleInspector(); // Disable inspector after selection
};

window.xpathCrawler.toggleInspector = () => {
    inspectorEnabled = !inspectorEnabled;
    if (inspectorEnabled) {
        document.addEventListener('mouseover', mouseOverHandler);
        document.addEventListener('mouseout', mouseOutHandler);
        document.addEventListener('click', clickHandler, true);
    } else {
        document.removeEventListener('mouseover', mouseOverHandler);
        document.removeEventListener('mouseout', mouseOutHandler);
        document.removeEventListener('click', clickHandler, true);
        if (highlightedElement) {
            highlightedElement.style.outline = '';
            highlightedElement = null;
        }
    }
};