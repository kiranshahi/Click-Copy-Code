chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ccc-copyCode",
    title: "Copy Code",
    contexts: ["all"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ccc-copyCode" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "copy-code" });
  }
});
