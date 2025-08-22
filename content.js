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
    }
    return true; // Indicates that the response is sent asynchronously
});
