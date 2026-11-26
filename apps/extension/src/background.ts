chrome.runtime.onInstalled.addListener(() => {
  console.info("DealHunter installed");
});

chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
