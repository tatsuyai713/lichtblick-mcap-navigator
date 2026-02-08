import { useMemo, useState } from "react";

import {
  AppSetting,
  IExtensionLoader,
  IdbExtensionLoader,
  RemoteDataSourceFactory,
  RemoteExtensionLoader,
  SharedRoot,
  StudioApp,
} from "@lichtblick/suite-base";
import { APP_CONFIG } from "@lichtblick/suite-base/constants/config";

import { McapPortalShell } from "./McapPortalShell";
import LocalStorageAppConfiguration from "./services/LocalStorageAppConfiguration";

const isDevelopment = process.env.NODE_ENV === "development";

function NoAppBar(): React.JSX.Element {
  return <></>;
}

export function McapPortalRoot(): React.JSX.Element {
  const appConfiguration = useMemo(
    () =>
      new LocalStorageAppConfiguration({
        defaults: {
          [AppSetting.SHOW_DEBUG_PANELS]: isDevelopment,
        },
        overrides: {
          [AppSetting.SHOW_OPEN_DIALOG_ON_STARTUP]: false,
        },
      }),
    [],
  );

  const defaultExtensionLoaders: IExtensionLoader[] = [
    new IdbExtensionLoader("org"),
    new IdbExtensionLoader("local"),
  ];
  const url = new URL(window.location.href);
  const workspace = url.searchParams.get("workspace");
  if (workspace && APP_CONFIG.apiUrl) {
    defaultExtensionLoaders.push(new RemoteExtensionLoader("org", workspace));
  }
  const [extensionLoaders] = useState(() => defaultExtensionLoaders);

  const dataSources = useMemo(() => [new RemoteDataSourceFactory()], []);

  return (
    <SharedRoot
      enableLaunchPreferenceScreen={false}
      deepLinks={[window.location.href]}
      dataSources={dataSources}
      appConfiguration={appConfiguration}
      extensionLoaders={extensionLoaders}
      enableGlobalCss
      extraProviders={undefined}
      AppBarComponent={NoAppBar}
    >
      <StudioApp Shell={McapPortalShell} />
    </SharedRoot>
  );
}
