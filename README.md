# XPath Web Crawler Chrome Extension

This is a simple but powerful Chrome extension that allows you to extract content from any webpage using XPath expressions.

## Features

*   **Simple Interface:** A clean and straightforward popup UI to enter your XPath query.
*   **Real-time Results:** Instantly see the crawled content from the active tab.
*   **XPath Powered:** Leverages the browser's native XPath engine for efficient and accurate data extraction.

## How to Install and Use

1.  **Download the files:** Make sure you have all the project files (`manifest.json`, `popup.html`, `popup.css`, `popup.js`, `content.js`, and the `images` directory with icons) in a single directory.

2.  **Open Chrome Extensions:** Open the Google Chrome browser and navigate to `chrome://extensions/`.

3.  **Enable Developer Mode:** In the top right corner of the Extensions page, toggle the "Developer mode" switch to the on position.

4.  **Load the Extension:** Click the "Load unpacked" button that appears on the top left. Select the directory where you saved the extension files.

5.  **Start Crawling:**
    *   Navigate to the webpage you want to crawl.
    *   Click on the extension's icon in the Chrome toolbar.
    *   Enter your XPath expression into the input box.
    *   Click the "Crawl" button.
    *   The extracted text content will appear in the text area below.

## File Structure

```
.
├── images
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── content.js
├── manifest.json
├── popup.css
├── popup.html
└── popup.js
```

*   `manifest.json`: The core configuration file for the Chrome extension.
*   `popup.html` / `popup.css` / `popup.js`: The files that define the structure, style, and logic of the extension's user interface.
*   `content.js`: The script that runs on the webpage to execute the XPath query and extract the data.
*   `images/`: Directory containing the icons for the extension.
