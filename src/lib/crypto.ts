import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from './env';
const derive = promisify(scrypt);
export function encrypt(text: string, context: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(env().CONTENT_KEY, 'hex'), iv);
  cipher.setAAD(Buffer.from(context));
  return Buffer.concat([iv, cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64');
}
export function decrypt(value: string, context: string) {
  const bytes = Buffer.from(value, 'base64'); const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env().CONTENT_KEY, 'hex'), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString('utf8');
}
export function safeEqual(a: string, b: string) { return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()); }
export async function hashAnswer(answer: string, salt = randomBytes(16).toString('hex')) { return { salt, hash: (await derive(answer, salt, 64) as Buffer).toString('hex') }; }
export async function verifyHash(answer: string, entry: { salt: string; hash: string }) { return safeEqual((await hashAnswer(answer, entry.salt)).hash, entry.hash); }
