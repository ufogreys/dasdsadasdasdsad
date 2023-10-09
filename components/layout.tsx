import React, { useEffect } from "react"
import Head from "next/head"
import { useRouter } from "next/router";
import QueryProvider from "../context/query";
import ThemeWrapper from "./themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import { QueryParams } from "../Models/QueryParams";
import MaintananceContent from "./maintanance/maintanance";
import { AuthProvider } from "../context/authContext";
import NoCookies from "./NoCookies";
import useStorage from "../hooks/useStorage";
import RainbowKitComponent from "./RainbowKit";
import { SettingsProvider } from "../context/settings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { MenuProvider } from "../context/menu";
import ErrorFallback from "./ErrorFallback";
import { SendErrorMessage } from "../lib/telegram";

type Props = {
  children: JSX.Element | JSX.Element[];
  hideFooter?: boolean;
  hideNavbar?: boolean;
  settings?: LayerSwapSettings;
};

export default function Layout({ hideNavbar, children, settings }: Props) {
  const router = useRouter();
  const { storageAvailable } = useStorage();
  let appSettings = new LayerSwapAppSettings(settings);

  function logErrorToService(error, info) {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
      SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A errorInfo: ${info?.componentStack} %0A stack: ${error?.stack ?? error.stack} %0A`)
    }
  }

  const query: QueryParams = {
    ...router.query,
    ...(router.query.lockAddress === 'true' ? { lockAddress: true } : {}),
    ...(router.query.lockNetwork === 'true' ? { lockNetwork: true } : {}),
    ...(router.query.lockExchange === 'true' ? { lockExchange: true } : {}),
    ...(router.query.hideRefuel === 'true' ? { hideRefuel: true } : {}),
    ...(router.query.hideAddress === 'true' ? { hideAddress: true } : {}),
    ...(router.query.hideFrom === 'true' ? { hideFrom: true } : {}),
    ...(router.query.hideTo === 'true' ? { hideTo: true } : {}),
    ...(router.query.lockFrom === 'true' ? { lockFrom: true } : {}),
    ...(router.query.lockTo === 'true' ? { lockTo: true } : {}),
    ...(router.query.lockAsset === 'true' ? { lockAsset: true } : {}),


    ...(router.query.lockAddress === 'false' ? { lockAddress: false } : {}),
    ...(router.query.lockNetwork === 'false' ? { lockNetwork: false } : {}),
    ...(router.query.lockExchange === 'false' ? { lockExchange: false } : {}),
    ...(router.query.hideRefuel === 'false' ? { hideRefuel: false } : {}),
    ...(router.query.hideAddress === 'false' ? { hideAddress: false } : {}),
    ...(router.query.hideFrom === 'false' ? { hideFrom: false } : {}),
    ...(router.query.hideTo === 'false' ? { hideTo: false } : {}),
    ...(router.query.lockFrom === 'false' ? { lockFrom: false } : {}),
    ...(router.query.lockTo === 'false' ? { lockTo: false } : {}),
    ...(router.query.lockAsset === 'false' ? { lockAsset: false } : {}),
  };

  useEffect(() => {
    function prepareUrl(params) {
      const url = new URL(location.href)
      const queryParams = new URLSearchParams(location.search)
      let customUrl = url.protocol + "//" + url.hostname + url.pathname.replace(/\/$/, '')
      for (const paramName of params) {
        const paramValue = queryParams.get(paramName)
        if (paramValue) customUrl = customUrl + '/' + paramValue
      }
      return customUrl
    }
    plausible('pageview', { u: prepareUrl(['destNetwork', 'sourceExchangeName', 'addressSource', 'asset', 'amount']) })
  }, [])
  const basePath = router?.basePath ?? ""
  return (<>
    <Head>
      <title>Layerswap</title>
      <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/favicon/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/favicon/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/favicon/favicon-16x16.png`} />
      <link rel="manifest" href={`${basePath}/favicon/site.webmanifest`} />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#111827" />
      <meta name="description" content="Move crypto across exchanges, blockchains, and wallets." />

      {/* Facebook Meta Tags */}
      <meta property="og:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Layerswap" />
      <meta property="og:description" content="Move crypto across exchanges, blockchains, and wallets." />
      <meta property="og:image" content={`https://layerswap.io/${basePath}/opengraph.jpg?v=2`} />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta name="twitter:title" content="Layerswap" />
      <meta name="twitter:description" content="Move crypto across exchanges, blockchains, and wallets." />
      <meta name="twitter:image" content={`https://layerswap.io/${basePath}/opengraphtw.jpg`} />

    </Head>
    {
      storageAvailable === true &&
      <SettingsProvider data={appSettings}>
        <RainbowKitComponent>
          <MenuProvider>
            <AuthProvider>
              <ErrorBoundary FallbackComponent={ErrorFallback} onError={logErrorToService}>
                <QueryProvider query={query}>
                  <ThemeWrapper hideNavbar={hideNavbar}>
                    {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true' ? <MaintananceContent /> : children}
                  </ThemeWrapper>
                </QueryProvider>
              </ErrorBoundary>
            </AuthProvider>
          </MenuProvider>
        </RainbowKitComponent>
      </SettingsProvider>
    }
    {storageAvailable === false &&
      <NoCookies />
    }
  </>)
}
