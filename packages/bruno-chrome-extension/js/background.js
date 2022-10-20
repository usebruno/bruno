let currentTab = {
  id: null,
  url: null,
};

const getExtensionId = () => {
  const matches = chrome.runtime.getURL("x").match(/.*\/\/(.*)\/x$/);
  if (matches) {
    return matches[1];
  }

  return chrome.runtime.id;
};

// Create a new tab for the extension
function createNewTab() {
  chrome.tabs.create({ url: "index.html" }, function (tab) {
    currentTab = {
      id: tab.id,
      url: tab.url,
    };
  });
}

// Focus on the open extension tab
function focusTab(tabId) {
  var updateProperties = { active: true };
  chrome.tabs.update(tabId, updateProperties, function (tab) {});
}

// Open the extension tab when the extension icon is clicked
chrome.action.onClicked.addListener(function (tab) {
  if (!currentTab || !currentTab.id) {
    createNewTab();
  } else {
    chrome.tabs.get(currentTab.id, function (tab) {
      console.log(chrome.runtime.id, tab.url);
      if (tab && tab.url && tab.url.includes(getExtensionId())) {
        focusTab(currentTab.id);
      } else {
        createNewTab();
      }
    });
  }
});

// When a tab is closed, check if it is the extension tab that was closed, and unset currentTabId
chrome.tabs.onRemoved.addListener(function (tabId) {
  if (tabId === currentTab.id) {
    currentTab = {};
  }
});
