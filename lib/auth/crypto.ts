export type PasswordCredential = {
  algorithm: "pbkdf2-sha256";
  version: number;
  iterations: number;
  salt: string;
  hash: string;
};

const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
const fromBase64url = (value: string) => {
  const raw = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};
const secureEqual = (left: string, right: string) => {
  const a = encoder.encode(left), b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
};

export function validateEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("邮箱格式不正确");
  return email;
}

export function validatePassword(value: unknown) {
  const password = String(value || "");
  const validCharacters = /^[\x21-\x7e]+$/.test(password);
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) => pattern.test(password)).length;
  const repetitive = /^(.)\1+$/.test(password) || /^(12345678|password|qwerty123|abcdefgh)$/i.test(password);
  return { valid: password.length >= 8 && password.length <= 20 && validCharacters && variety >= 3 && !repetitive, score: variety };
}

export async function hashPassword(password: string, pepper: string, options: { iterations?: number; salt?: string } = {}): Promise<PasswordCredential> {
  const iterations = options.iterations || 600_000;
  const salt = options.salt ? fromBase64url(options.salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(`${password}\u0000${pepper}`), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations, salt }, key, 256);
  return { algorithm: "pbkdf2-sha256", version: 1, iterations, salt: base64url(salt), hash: base64url(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, pepper: string, credential: PasswordCredential) {
  if (credential.algorithm !== "pbkdf2-sha256" || credential.version !== 1) return false;
  const candidate = await hashPassword(password, pepper, { iterations: credential.iterations, salt: credential.salt });
  return secureEqual(candidate.hash, credential.hash);
}

export async function hashOpaqueToken(token: string, pepper: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${pepper}\u0000${token}`));
  return base64url(new Uint8Array(digest));
}

export function randomToken(byteLength = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export function randomCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(value).padStart(6, "0");
}

export function safeReturnTo(value: unknown) {
  const path = String(value || "/");
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  try {
    const url = new URL(path, "https://app.local");
    return url.origin === "https://app.local" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch { return "/"; }
}
