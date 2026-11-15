/* eslint-env webextensions */

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

  // Try blocking webRequest (MV2). In MV3 or environments without webRequestBlocking,
  // gracefully fall back to webNavigation and tabs.onUpdated.
  let hasWebRequest = false;
  if (browser.webRequest && browser.webRequest.onBeforeRequest) {
    try {
      browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
        urls: ["*://*/*"],
        tabId,
        types: ["main_frame"]
      }, ["blocking"]);
      hasWebRequest = true;
    } catch {
      // Manifest V3 does not permit 'blocking' extraInfoSpec; fallback to non-blocking listeners
      try {
        browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
          urls: ["*://*/*"],
          tabId,
          types: ["main_frame"]
        });
        hasWebRequest = true;
      } catch {
        // webRequest permission not granted in MV3
      }
    }
  }

  // MV3 non-blocking listeners: intercept redirect via webNavigation and tabs.onUpdated
  if (browser.webNavigation && browser.webNavigation.onBeforeNavigate) {
    browser.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
  }
  if (browser.webNavigation && browser.webNavigation.onCommitted) {
    browser.webNavigation.onCommitted.addListener(onCommitted);
  }
  if (browser.tabs && browser.tabs.onUpdated) {
    browser.tabs.onUpdated.addListener(onTabUpdated);
  }

  browser.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);
  browser.tabs.onRemoved.addListener(onTabRemoved);

  try {
    return await promise;
  } finally {
    cleanup();
  }

  function handleRedirectUrl(destUrl) {
    if (destUrl && destUrl.startsWith(redirect_uri)) {
      resolve(destUrl);
      return true;
    }
    return false;
  }

  function onBeforeRequest(details) {
    if (details.frameId || details.tabId !== tabId) return;
    if (handleRedirectUrl(details.url)) {
      return {cancel: true};
    }
  }

  function onBeforeNavigate(details) {
    if (details.frameId || details.tabId !== tabId) return;
    handleRedirectUrl(details.url);
  }

  function onCommitted(details) {
    if (details.frameId || details.tabId !== tabId) return;
    handleRedirectUrl(details.url);
  }

  function onTabUpdated(updatedTabId, changeInfo) {
    if (updatedTabId !== tabId) return;
    if (changeInfo.url) {
      handleRedirectUrl(changeInfo.url);
    }
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
    if (hasWebRequest && browser.webRequest && browser.webRequest.onBeforeRequest) {
      try {
        browser.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
      } catch {}
    }
    if (browser.webNavigation && browser.webNavigation.onBeforeNavigate) {
      try {
        browser.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigate);
      } catch {}
    }
    if (browser.webNavigation && browser.webNavigation.onCommitted) {
      try {
        browser.webNavigation.onCommitted.removeListener(onCommitted);
      } catch {}
    }
    if (browser.tabs && browser.tabs.onUpdated) {
      try {
        browser.tabs.onUpdated.removeListener(onTabUpdated);
      } catch {}
    }
    if (browser.webNavigation && browser.webNavigation.onDOMContentLoaded) {
      try {
        browser.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
      } catch {}
    }
    if (browser.tabs && browser.tabs.onRemoved) {
      try {
        browser.tabs.onRemoved.removeListener(onTabRemoved);
      } catch {}
    }
    closeWindow(windowId, tabId).catch(err => console.error(err));
  }
}

module.exports = launchWebAuthFlow;
