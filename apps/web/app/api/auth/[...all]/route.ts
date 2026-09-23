import { toNextJsHandler } from "better-auth/next-js";
import { z } from "zod";

import { auth } from "@/src/auth/auth";
import { ApiError } from "@/src/auth/errors";
import { errorResponse, parseJsonBody } from "@/src/auth/http";
import { acceptInviteForUser, findUserByEmail, validateInviteCode } from "@/src/auth/store";

const authHandler = toNextJsHandler(auth);

const signUpBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  password: z.string().min(8).max(128),
  image: z.string().url().optional(),
  callbackURL: z.string().url().optional(),
  rememberMe: z.boolean().optional(),
  inviteCode: z.string().trim().min(1).max(64).optional(),
});

const signInBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  callbackURL: z.string().url().optional(),
  rememberMe: z.boolean().optional(),
  inviteCode: z.string().trim().min(1).max(64).optional(),
});

async function forwardAuthRequest(
  request: Request,
  body: Record<string, unknown>,
  inviteCode: string | undefined,
): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");

  const response = await authHandler.POST(
    new Request(request.url, {
      method: request.method,
      headers,
      body: JSON.stringify(body),
    }),
  );

  if (!response.ok || !inviteCode) {
    return response;
  }

  const email = typeof body.email === "string" ? body.email : null;

  if (!email) {
    throw new ApiError(500, "AUTH_EMAIL_MISSING", "Auth response could not be linked to an invite.");
  }

  const user = findUserByEmail(email);

  if (!user) {
    throw new ApiError(500, "AUTH_USER_NOT_FOUND", "Signed-in user could not be found after auth.");
  }

  acceptInviteForUser(inviteCode, user.id);

  return response;
}

async function handleSignUp(request: Request): Promise<Response> {
  const parsedBody = await parseJsonBody(request.clone(), signUpBodySchema);
  const { inviteCode, ...authBody } = parsedBody;

  if (inviteCode) {
    validateInviteCode(inviteCode);
  }

  return forwardAuthRequest(request, authBody, inviteCode);
}

async function handleSignIn(request: Request): Promise<Response> {
  const parsedBody = await parseJsonBody(request.clone(), signInBodySchema);
  const { inviteCode, ...authBody } = parsedBody;

  if (inviteCode) {
    validateInviteCode(inviteCode);
  }

  return forwardAuthRequest(request, authBody, inviteCode);
}

async function dispatchPost(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  if (pathname.endsWith("/sign-up/email")) {
    return handleSignUp(request);
  }

  if (pathname.endsWith("/sign-in/email")) {
    return handleSignIn(request);
  }

  return authHandler.POST(request);
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await authHandler.GET(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await dispatchPost(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    return await authHandler.PATCH(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    return await authHandler.PUT(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    return await authHandler.DELETE(request);
  } catch (error) {
    return errorResponse(error);
  }
}
