import { auth } from "@/src/auth/auth";
import { ApiError } from "@/src/auth/errors";

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: {
      disableCookieCache: true,
    },
  });

  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "You must be signed in to use this endpoint.");
  }

  return session;
}
