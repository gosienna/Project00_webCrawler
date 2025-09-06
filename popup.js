document.addEventListener('DOMContentLoaded', function () {
  const clearButton = document.getElementById('clearButton');
  const displayTest = document.getElementById('displayTest');
  const saveElementSwitch = document.getElementById('saveElementSwitch');

  let savedElementsTree = [];

  function findParent(nodes, url) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.href === url) {
        return node;
      }
      if (node.children.length > 0) {
        const found = findParent(node.children, url);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  function renderTree(nodes, container) {
    const ul = document.createElement('ul');
    nodes.forEach(node => {
      const li = document.createElement('li');
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `<div class="element-text">${node.text}</div>`;
      
      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy HTML';
      copyButton.addEventListener('click', () => {
        const textarea = document.createElement('textarea');
        textarea.value = node.html;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });

      item.appendChild(copyButton);
      li.appendChild(item);

      if (node.children.length > 0) {
        const nestedContainer = document.createElement('div');
        nestedContainer.className = 'nested';
        renderTree(node.children, nestedContainer);
        li.appendChild(nestedContainer);
      }
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  function clearData() {
    displayTest.innerHTML = '';
    savedElementsTree = [];
    chrome.storage.local.set({ savedElementsTree: [] });
  }

  window.addEventListener('message', (event) => {
    if (event.data.action === 'clearData') {
      clearData();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementClicked") {
      const newNode = {
        text: request.text,
        url: request.url,
        href: request.href,
        html: request.html,
        children: []
      };

      const parent = findParent(savedElementsTree, request.url);

      if (parent) {
        const isDuplicate = parent.children.some(item => item.text === newNode.text && item.url === newNode.url);
        if (!isDuplicate) {
          parent.children.push(newNode);
        }
      } else {
        const isDuplicate = savedElementsTree.some(item => item.text === newNode.text && item.url === newNode.url);
        if (!isDuplicate) {
          savedElementsTree.push(newNode);
        }
      }

      chrome.storage.local.set({ savedElementsTree: savedElementsTree });
      displayTest.innerHTML = '';
      renderTree(savedElementsTree, displayTest);
    }
  });

  saveElementSwitch.addEventListener('change', () => {
    const saveState = saveElementSwitch.checked;
    chrome.storage.local.set({ saveElementsState: saveState });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSaveElement", save: saveState });
    });
  });

  clearButton.addEventListener('click', () => {
    clearData();
  });

  chrome.storage.local.get(['savedElementsTree', 'saveElementsState'], (result) => {
    if (result.savedElementsTree) {
      savedElementsTree = result.savedElementsTree;
      displayTest.innerHTML = '';
      renderTree(savedElementsTree, displayTest);
    }
    if (result.saveElementsState !== undefined) {
      saveElementSwitch.checked = result.saveElementsState;
    }
  });
});
