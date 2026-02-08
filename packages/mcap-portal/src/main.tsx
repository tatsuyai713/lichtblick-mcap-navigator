import { useEffect } from "react";
import { createRoot } from "react-dom/client";

import Logger from "@lichtblick/log";
import type { IDataSourceFactory } from "@lichtblick/suite-base";

import { McapPortalRoot } from "./McapPortalRoot";

const log = Logger.getLogger(__filename);

function LogAfterRender(props: React.PropsWithChildren): React.JSX.Element {
  useEffect(() => {
    // Integration tests look for this console log to indicate the app has rendered once
    console.debug("App rendered");
  }, []);
  return <>{props.children}</>;
}

export type MainParams = {
  dataSources?: IDataSourceFactory[];
  extraProviders?: React.JSX.Element[];
  rootElement?: React.JSX.Element;
};

export async function main(getParams: () => Promise<MainParams> = async () => ({})): Promise<void> {
  log.debug("initializing");

  window.onerror = (...args) => {
    console.error(...args);
  };
  // Disable compatibility banner regardless of browser to avoid startup splash UI.
  (window as typeof window & { __LICHTBLICK_DISABLE_COMPAT_BANNER__?: boolean })
    .__LICHTBLICK_DISABLE_COMPAT_BANNER__ = true;

  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error("missing #root element");
  }

  const { installDevtoolsFormatters, overwriteFetch, waitForFonts, initI18n } = await import(
    "@lichtblick/suite-base"
  );
  installDevtoolsFormatters();
  overwriteFetch();
  void waitForFonts();
  void initI18n();

  const params = await getParams();
  const rootElement = params.rootElement ?? <McapPortalRoot />;

  const root = createRoot(rootEl);
  root.render(<LogAfterRender>{rootElement}</LogAfterRender>);
}
