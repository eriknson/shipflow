import { createNextHandler, type ShipflowOverlayServerOptions } from "./server/createNextHandler";

type NextConfig = Record<string, unknown>;

export type ShipflowOverlayNextOptions = {
  enableInProduction?: boolean;
  reactGrabUrl?: string;
  logClipboardEndpoint?: string;
};

export function withShipflowOverlay<T extends NextConfig = NextConfig>(
  config: T = {} as T,
  options: ShipflowOverlayNextOptions = {},
): T & NextConfig {
  const enabled =
    options.enableInProduction || process.env.NODE_ENV === "development";

  const env: Record<string, string | undefined> = {
    ...(config.env as Record<string, string | undefined> | undefined),
    SHIPFLOW_OVERLAY_ENABLED: enabled ? "true" : "false",
  };

  if (options.reactGrabUrl) {
    env.SHIPFLOW_OVERLAY_REACT_GRAB_URL = options.reactGrabUrl;
  }

  if (options.logClipboardEndpoint) {
    env.SHIPFLOW_OVERLAY_LOG_ENDPOINT = options.logClipboardEndpoint;
  }

  const existingTranspile = Array.isArray(config.transpilePackages)
    ? config.transpilePackages
    : [];
  const transpilePackages = Array.from(
    new Set([...existingTranspile, "@shipflow/overlay"]),
  );

  return {
    ...config,
    env,
    transpilePackages,
  };
}

export { createNextHandler, type ShipflowOverlayServerOptions };
export { createUndoHandler, type ShipflowUndoServerOptions } from "./server/createUndoHandler";



