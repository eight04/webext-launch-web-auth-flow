export = launchWebAuthFlow;

declare function launchWebAuthFlow(options: WebAuthFlowOptions): ResponseUrl;

interface WebAuthFlowOptions {
  url: string,
  redirect_uri: string,
  interactive?: boolean,
  alwaysUseTab?: boolean,
  windowOptions?: {
    allowScriptsToClose?: boolean;
    cookieStoreId?: number;
    focused?: boolean;
    height?: number;
    incognito?: boolean;
    left?: number;
    state?: "normal" | "minimized" | "maximized" | "fullscreen" | "docked";
    tabId?: number;
    titlePreface?: string;
    top?: number;
    type?: "normal" | "popup" | "panel" | "detached_panel";
    url?: string | string[];
    width?: number;
  }
}

type ResponseUrl = string;
