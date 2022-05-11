/* eslint-env webextensions */

function checkManifestPermissions() {
  const permissions = [
    { name: "tabs", value: browser.tabs },
    { name: "windows", value: browser.windows },
    { name: "webRequest", value: browser.webRequest },
    { name: "webNavigation", value: browser.webNavigation },
  ];

  permissions.forEach(({ name, value }) => {
    if (typeof value === "undefined") {
      throw new Error(`No "${name}" permission declared in manifest.json.`);
    }
  });
}

async function createWindow(options, useTab) {
  if (browser.windows && !useTab) {
    return await browser.windows.create(options);
  }
  const tabOptions = {
    active: options.state !== "minimized",
    url: options.url,
  };
  const tab = await browser.tabs.create(tabOptions);
  return {
    tabs: [tab]
  };
}

async function updateWindow(windowId, tabId, options) {
  if (windowId) {
    return await browser.windows.update(windowId, options);
  }
  return await browser.tabs.update(tabId, {
    active: options.focused
  });
}

async function closeWindow(windowId, tabId) {
  if (windowId) {
    return await browser.windows.remove(windowId);
  }
  return await browser.tabs.remove(tabId);
}

function defer() {
  const o = {};
  o.promise = new Promise((resolve, reject) => {
    o.resolve = resolve;
    o.reject = reject;
  });
  return o;
}

async function launchWebAuthFlow({
  url,
  redirect_uri,
  interactive = false,
  alwaysUseTab = false,
  windowOptions
}) {

	checkManifestPermissions();

  const wInfo = await createWindow({
    type: "popup",
    url,
    state: "minimized",
    // https://crbug.com/783827
    // note that Firefox doesn't support focused either
    // focused: false
    ...windowOptions
  }, alwaysUseTab);
  const windowId = wInfo.id;
  const tabId = wInfo.tabs[0].id;
  const {promise, resolve, reject} = defer();
  browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
    urls: ["*://*/*"],
    tabId,
    types: ["main_frame"]
  }, ["blocking"]);
  browser.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);
  browser.tabs.onRemoved.addListener(onTabRemoved);
  try {
    return await promise;
  } finally {
    cleanup();
  }
  
  function onBeforeRequest(details) {
    if (details.frameId || details.tabId !== tabId) return;
    if (!details.url.startsWith(redirect_uri)) return;
    resolve(details.url);
    return {cancel: true};
  }
  
  function onDOMContentLoaded(details) {
    if (details.frameId || details.tabId !== tabId) return;
    if (interactive) {
      updateWindow(windowId, tabId, {focused: true, state: "normal"}).catch(err => console.error(err));
    } else {
      reject(new Error("User interaction required"));
    }
    browser.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
  }
  
  function onTabRemoved(removedTabId) {
    if (removedTabId === tabId) {
      reject(new Error("Canceled by user"));
    }
  }
  
  function cleanup() {
    browser.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
    browser.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
    browser.tabs.onRemoved.removeListener(onTabRemoved);
    closeWindow(windowId, tabId).catch(err => console.error(err));
  }
}

module.exports = launchWebAuthFlow;
