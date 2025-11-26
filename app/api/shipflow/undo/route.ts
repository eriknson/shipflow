import { createUndoHandler } from "@shipflow/overlay/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createUndoHandler();

export const POST = handler;
