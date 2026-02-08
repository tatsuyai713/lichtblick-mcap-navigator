import type { TreeNode } from "./types";

function resolveMcapBaseUrl() {
  const { hostname, protocol, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:3100`;
  }
  return origin;
}

export async function fetchTree(): Promise<TreeNode> {
  const res = await fetch(new URL("/api/tree", resolveMcapBaseUrl()));
  if (!res.ok) {
    throw new Error("Failed to load MCAP tree");
  }
  return res.json();
}

function encodePath(relPath: string) {
  return relPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildFileUrl(relPath: string) {
  const encodedPath = encodePath(relPath);
  const url = new URL(`/api/file/${encodedPath}`, resolveMcapBaseUrl());
  return url.toString();
}
