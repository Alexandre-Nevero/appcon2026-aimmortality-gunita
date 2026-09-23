import { del, put } from "@vercel/blob";

// System Design: "Vercel Blob, public store, random pathnames" — put() with `addRandomSuffix`
// (the default) means the pathname itself is unguessable, not the URL scheme (ADR-002 known limit:
// public Blob capability URLs).
export async function uploadSourceFile(
  spaceId: string,
  filename: string,
  content: Blob | ArrayBuffer | string,
  contentType: string,
): Promise<{ pathname: string; url: string }> {
  const result = await put(`sources/${spaceId}/${filename}`, content, {
    access: "public",
    contentType,
  });
  return { pathname: result.pathname, url: result.url };
}

export async function deleteSourceFile(pathname: string): Promise<void> {
  await del(pathname);
}
