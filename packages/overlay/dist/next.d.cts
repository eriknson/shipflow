import { NextRequest, NextResponse } from 'next/server';

type ShipflowOverlayServerOptions = {
    cursorAgentBinary?: string;
    additionalSearchDirs?: string[];
    defaultModel?: string;
    allowInProduction?: boolean;
    timeoutMs?: number;
    logPrefix?: string;
};
declare function createNextHandler(options?: ShipflowOverlayServerOptions): (request: NextRequest) => Promise<NextResponse<unknown>>;

type NextConfig = Record<string, unknown>;
type ShipflowOverlayNextOptions = {
    enableInProduction?: boolean;
    reactGrabUrl?: string;
    logClipboardEndpoint?: string;
};
declare function withShipflowOverlay<T extends NextConfig = NextConfig>(config?: T, options?: ShipflowOverlayNextOptions): T & NextConfig;

export { type ShipflowOverlayNextOptions, type ShipflowOverlayServerOptions, createNextHandler, withShipflowOverlay };
