type WebAuthFlowOptions = import('webextension-polyfill').Identity.LaunchWebAuthFlowDetailsType;
type WindowOptions = import('webextension-polyfill').Windows.CreateCreateDataType

interface WebAuthFlowPolyfillOptions extends WebAuthFlowOptions {
  redirect_uri: string,
  alwaysUseTab?: boolean,
  windowOptions?: WindowOptions,
}

declare function launchWebAuthFlow(options: WebAuthFlowPolyfillOptions): Promise<string>;

export = launchWebAuthFlow;
