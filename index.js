/* eslint-env webextensions */

async function createWindow(options) {
  if (browser.windows) {
    return await browser.windows.create(options);
  }
  const tabOptions = {
    active: options.focused,
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

async function launchWebAuthFlow({url, redirect_uri, interactive = false}) {
  const wInfo = await createWindow({
    focused: false,
    type: "popup",
    url
  });
  const windowId = wInfo.id;
  const tabId = wInfo.tabs[0].id;
  const {promise, resolve, reject} = defer();
  const filter = [
    {
      urlPrefix: redirect_uri
    }
  ];
  browser.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate, filter);
  browser.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded, filter);
  browser.tabs.onRemoved.addListener(onTabRemoved);
  try {
    return await promise;
  } finally {
    cleanup();
  }
  
  function onBeforeNavigate(details) {
    if (details.frameId || details.tabId !== tabId) return;
    // if (!details.url.startsWith(url)) return;
    resolve(details.url);
  }
  
  function onDOMContentLoaded(details) {
    if (details.frameId || details.tabId !== tabId) return;
    if (interactive) {
      updateWindow(windowId, tabId, {focused: true}).catch(err => console.error(err));
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
    browser.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigate);
    browser.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
    browser.tabs.onRemoved.removeListener(onTabRemoved);
    closeWindow(windowId, tabId).catch(err => console.error(err));
  }
}

module.exports = launchWebAuthFlow;
