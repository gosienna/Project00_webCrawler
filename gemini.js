// Gemini API Integration Module
// This module handles all Gemini AI API interactions

class GeminiAPI {
  constructor() {
    this.apiKey = null;
  }

  // Get API key from Chrome storage
  async getApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        this.apiKey = result.geminiApiKey || null;
        resolve(this.apiKey);
      });
    });
  }

  // Set API key in Chrome storage
  async setApiKey(apiKey) {
    this.apiKey = apiKey;
    return new Promise((resolve) => {
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        resolve();
      });
    });
  }

  // Collect all elements from the tree structure for Gemini analysis
  collectAllElementsForGemini(elements) {
    let allElements = [];
    
    elements.forEach(element => {
      allElements.push({
        text: element.text,
        url: element.url,
        href: element.href,
        tagName: element.tagName,
        isPdf: element.isPdf
      });
      
      // Recursively collect children
      if (element.children && element.children.length > 0) {
        allElements = allElements.concat(this.collectAllElementsForGemini(element.children));
      }
    });
    
    return allElements;
  }

  // Analyze individual element with Gemini API
  async analyzeElement(elementHtml, elementText, elementHref, onProgress, onSuccess, onError) {
    // Get API key
    let apiKey = await this.getApiKey();
    if (!apiKey) {
      apiKey = prompt('Please enter your Gemini API key:');
      if (!apiKey) {
        onError('API key is required to use Gemini AI.');
        return;
      }
      await this.setApiKey(apiKey);
    }

    // Show loading state
    onProgress('Analyzing element with Gemini AI...');

    try {
      // Prepare the prompt with the element HTML
      const prompt = `Analyze the following HTML element outerHTML and return 
      the potential xpath that can be used to extract this element:

      HTML Element:
      ${elementHtml}

      Element Text: ${elementText}
      Element Href: ${elementHref}

      Please provide multiple XPath expressions that can be used to select this exact element.
      Return ONLY a valid JSON object with the following format (no additional text or explanation):
      {
        "option1": "//a[contains(text(), '${elementText}')]",
        "option2": "//a[@href='${elementHref}']",
        "option3": "//a[contains(@class, 'specific-class')]"
      }

      Provide 2-4 different XPath options with varying specificity levels.`;

      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const geminiText = data.candidates[0].content.parts[0].text;
        onSuccess(geminiText);
      } else {
        throw new Error('Invalid response format from Gemini API');
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      onError(`Error: ${error.message}`);
    }
  }

  // Show Gemini response in the UI
  showResponse(message, type = 'success', responseElement) {
    if (!responseElement) return;
    
    responseElement.innerHTML = '';
    
    if (type === 'loading') {
      responseElement.innerHTML = `<p class="loading">${message}</p>`;
    } else if (type === 'error') {
      responseElement.innerHTML = `<div class="error">${message}</div>`;
    } else {
      responseElement.innerHTML = `
        <h3>🤖 Gemini AI Analysis</h3>
        <div>${message.replace(/\n/g, '<br>')}</div>
      `;
    }
    
    responseElement.classList.add('show');
  }
}

// Export the class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiAPI;
} else if (typeof window !== 'undefined') {
  window.GeminiAPI = GeminiAPI;
}
