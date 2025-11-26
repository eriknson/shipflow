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

type ShipflowUndoServerOptions = {
    allowInProduction?: boolean;
    logPrefix?: string;
};
declare function createUndoHandler(options?: ShipflowUndoServerOptions): (request: NextRequest) => Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    restored: string[];
    deleted: string[];
    message: string;
}>>;

type NextConfig = Record<string, unknown>;
type ShipflowOverlayNextOptions = {
    enableInProduction?: boolean;
    reactGrabUrl?: string;
    logClipboardEndpoint?: string;
};
declare function withShipflowOverlay<T extends NextConfig = NextConfig>(config?: T, options?: ShipflowOverlayNextOptions): T & NextConfig;

export { type ShipflowOverlayNextOptions, type ShipflowOverlayServerOptions, type ShipflowUndoServerOptions, createNextHandler, createUndoHandler, withShipflowOverlay };
