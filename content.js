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
        panel.classList.toggle('visible');
    }
    return true; // Indicates that the response is sent asynchronously
});