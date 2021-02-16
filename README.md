webext-launch-web-auth-flow
============

Polyfill `launchWebAuthFlow` with popups.

Installation
------------

### Via npm

```
npm install webext-launch-web-auth-flow
```

```js
const launchWebAuthFlow = require("webext-launch-web-auth-flow");

```

### Pre-built dist

You can find it under the `dist` folder, or [download from unpkg](https://unpkg.com/webext-launch-web-auth-flow/dist/).

Why
----

1. Builtin `launchWebAuthFlow` doesn't reuse the browser session. This library does.
2. Builtin `launchWebAuthFlow` doesn't allow custom redirect_uri. This library does.

Permission
-----------

To polyfill `launchWebAuthFlow`, this library uses following API/permissions:

1. `windows` and `tabs` - this library launches a window dialog (or tab in Firefox android) to login.
2. `webRequest` with `blocking` - this library cancels the request to `redirect_uri` so it won't leak the token/code to `redirect_uri` (or `redirect_uri` is unresolveable e.g. the URL from `identity.getRedirectURL`).
3. `webNavigation` - the login dialog is minimized unless there is no redirect. It checks the loading state using `webNavigation.onDOMContentLoaded`.

Compatibility
--------------

This library references the global `browser`. To make it work on Chrome, you need something like [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)

Known issues
-------------

* Currently there is no good way to create an "inactive minimized dialog" on both Chrome and Firefox. Ref: https://crbug.com/783827 & https://bugzilla.mozilla.org/show_bug.cgi?id=1659190

API reference
-------------

This module exports a single function.

### webextLaunchWebAuthFlow

```js
launchWebAuthFlow({
  url: String,
  redirect_uri: String,
  interactive?: Boolean = false,
  
  alwaysUseTab?: Boolean = false,
  windowOptions?: Object
}) => finalUrl: String
```

See the [official document](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity/launchWebAuthFlow) for `url`, `redirect_uri`, and `interactive` options. Note that **`redirect_uri` is required** in this library.

By default, this library uses a popup to display the login page. If popups are unavailable (which usually happens on mobile browsers), it uses a tab instead. Set `alwaysUseTab` to `true` to always use a tab.

Use `windowOptions` to set extra properties that will be sent to [`browser.windows.create`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/windows/create).

Changelog
---------

* 0.1.0 (Aug 15, 2020)

  - First release.
