import { randomBytes } from "node:crypto";

import QRCode from "qrcode";

export function newMemorialToken(): string {
  return randomBytes(16).toString("base64url");
}

function getPublicBaseUrl(): string {
  const raw = process.env.PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    throw new Error("PUBLIC_WEB_URL is not set (see docs/ops.md § Configuration & secrets)");
  }
  return raw.replace(/\/+$/, "");
}

export function buildMemorialUrl(token: string): string {
  return `${getPublicBaseUrl()}/m/${token}`;
}

export async function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}
