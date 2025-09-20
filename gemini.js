// Gemini API Integration Module
// This module handles all Gemini AI API interactions

class GeminiAPI {
  constructor() {
    this.apiKey = null;
    this.lastPrompt = null;
    this.lastAction = null;
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

  // Generate prompt for element analysis
  generateElementAnalysisPrompt(elementHtml, elementText, elementHref) {
    return `Analyze the following HTML element outerHTML and return 
    the potential xpath that can be used to extract this element:

    HTML Element:
    ${elementHtml}

    Element Text: ${elementText}
    Element Href: ${elementHref}

    Provide multiple XPath expressions that can be used to select elements that have similar patterns.
    Return ONLY a valid JSON object with the following format (no additional text or explanation):
    {
      "option1": xpath_pattern1(most specific) only identify the element being clicked,
      "option2": xpath_pattern2(less specific) identify the elemnt withing same container, class,
      "option3": xpath_pattern4(least specific) identify element not depend on ID, href, element text
    }

    Provide 3 different XPath options with varying specificity levels. Top to down, from most specific to least specific.`;
  }

  // Generate prompt for extract elements action
  generateExtractElementsPrompt(xpathExpressions, isRecursive, currentUrl) {
    return `Extract elements from web pages using XPath expressions.

XPath Expressions to use:
${xpathExpressions.map((xpath, index) => `${index + 1}. ${xpath}`).join('\n')}

Extraction Parameters:
- Recursive extraction: ${isRecursive ? 'Yes' : 'No'}
- Current page URL: ${currentUrl}
- Extraction method: XPath-based element selection

The extraction process will:
1. Find all elements matching the provided XPath expressions
2. Extract their text content, URLs, HTML structure, and metadata
3. ${isRecursive ? 'Follow links to extract elements from linked pages (with depth limit)' : 'Only extract from the current page'}
4. Organize the results in a hierarchical tree structure
5. Identify PDF files and provide download functionality

This is useful for web scraping, data extraction, and content analysis tasks.`;
  }

  // Generate and store prompt directly from element data (without API call)
  generateAndStoreElementPrompt(elementHtml, elementText, elementHref) {
    const prompt = this.generateElementAnalysisPrompt(elementHtml, elementText, elementHref);
    this.storePrompt(prompt, 'element_analysis');
    return prompt;
  }

  // Store a prompt for different actions
  storePrompt(prompt, action = 'element_analysis') {
    this.lastPrompt = prompt;
    this.lastAction = action;
  }

  // Get the last prompt sent to Gemini
  getLastPrompt() {
    return this.lastPrompt;
  }

  // Get the last action that created a prompt
  getLastAction() {
    return this.lastAction;
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
      // Generate the prompt using the dedicated function
      const prompt = this.generateElementAnalysisPrompt(elementHtml, elementText, elementHref);
      
      // Store the prompt for copying
      this.storePrompt(prompt, 'element_analysis');

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
        <h3>Gemini AI Analysis</h3>
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
