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
  const window = { tabs: [tab] };

  return window;
}

async function updateWindow(windowId, tabId, options) {
  if (windowId) {
    return await browser.windows.update(windowId, options);
  }

  return await browser.tabs.update(tabId, { active: options.focused });
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
  windowOptions,
}) {
  const authWindow = await createWindow(
    { type: "popup", url, state: "minimized", ...windowOptions },
    // https://crbug.com/783827
    // note that Firefox doesn't support focused either
    // focused: false
    alwaysUseTab
  );
  const authWindowId = authWindow.id;
  const authTabId = authWindow.tabs[0].id;
  const { promise, resolve, reject } = defer();

  browser.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    { urls: ["*://*/*"], tabId: authTabId, types: ["main_frame"] },
    ["blocking"]
  );
  browser.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);
  browser.tabs.onRemoved.addListener(onTabRemoved);

  try {
    return await promise;
  } finally {
    await cleanup();
  }

  function onBeforeRequest({ frameId, tabId, url }) {
    if (frameId || tabId !== authTabId) return;
    if (!url.startsWith(redirect_uri)) return;
    resolve(url);
    return { cancel: true };
  }

  async function onDOMContentLoaded({ frameId, tabId }) {
    if (frameId || tabId !== authTabId) return;

    if (interactive) {
      await updateWindow(authWindowId, authTabId, {
        focused: true,
        state: "normal",
      }).catch((error) => console.error(error));
    } else {
      reject(new Error("User interaction required"));
    }
    browser.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
  }

  function onTabRemoved(removedTabId) {
    if (removedTabId === authTabId) {
      reject(new Error("Cancelled by user"));
    }
  }

  async function cleanup() {
    browser.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
    browser.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
    browser.tabs.onRemoved.removeListener(onTabRemoved);

    await closeWindow(authWindowId, authTabId).catch((error) =>
      console.error(error)
    );
  }
}

module.exports = launchWebAuthFlow;
