import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "./env";
import { HttpError } from "./http";
const visitorSchema = z.object({
  sub: z.string().uuid(),
  unlocked: z.array(z.string()).max(100),
});
const key = () => new TextEncoder().encode(env().SESSION_SECRET);
export async function issueSession(id: string, unlocked: string[]) {
  await setToken(
    "journal",
    await new SignJWT({ unlocked })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(id)
      .setIssuer("journal")
      .setAudience("visitor")
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(key()),
    30 * 86400,
  );
}
async function setToken(name: string, token: string, maxAge: number) {
  (await cookies()).set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
}
export async function visitorSession() {
  try {
    const token = (await cookies()).get("journal")?.value;
    if (!token) throw Error();
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      issuer: "journal",
      audience: "visitor",
    });
    return visitorSchema.parse(payload);
  } catch {
    throw new HttpError(
      401,
      "Please leave your name before opening the journal.",
    );
  }
}
export async function issueAdmin() {
  await setToken(
    "journal_admin",
    await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuer("journal")
      .setAudience("admin")
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(key()),
    28800,
  );
}
export async function requireAdmin() {
  try {
    const token = (await cookies()).get("journal_admin")?.value;
    if (!token) throw Error();
    await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      issuer: "journal",
      audience: "admin",
      subject: "admin",
    });
  } catch {
    throw new HttpError(401, "Please sign in.");
  }
}
export async function clearAdmin() {
  (await cookies()).delete("journal_admin");
}
