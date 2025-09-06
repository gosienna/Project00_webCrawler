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

function handleClick(event) {
    if (saveElements && event.target.tagName === 'A') {
        chrome.runtime.sendMessage({ 
            action: "elementClicked", 
            text: event.target.textContent?.trim() || '',
            url: window.location.href,
            referrer: document.referrer,
            href: event.target.href,
            html: event.target.outerHTML
        });
    }
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
        if (saveElements) {
            document.addEventListener('click', handleClick, true);
        } else {
            document.removeEventListener('click', handleClick, true);
        }
    }
    return true; // Indicates that the response is sent asynchronously
});

// Request the initial state of the switch from the background script
chrome.runtime.sendMessage({ action: "getSaveElementsState" }, (response) => {
    if (response) {
        saveElements = response.save;
        if (saveElements) {
            document.addEventListener('click', handleClick, true);
        }
    }
});