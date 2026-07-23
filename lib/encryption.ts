/**
 * Client-Side Zero-Knowledge End-to-End Encryption (E2EE) helper using Web Crypto API (AES-GCM 256-bit).
 * Ensures children's personal data is encrypted on the iPad before leaving the device.
 */

async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password.trim().toLowerCase()),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('klisten-e2ee-static-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Computes a SHA-256 hash of the room name to use as a blind room identifier on the server.
 */
export async function getRoomHash(roomName: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(roomName.trim().toLowerCase()));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts any JSON-serializable object into an AES-GCM 256-bit Base64 string.
 */
export async function encryptPayload(data: any, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const jsonStr = JSON.stringify(data);

  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(jsonStr)
  );

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedContent), iv.length);

  let binary = '';
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypts an AES-GCM 256-bit Base64 string back into the original data object.
 */
export async function decryptPayload(base64Str: string, password: string): Promise<any> {
  const key = await deriveKey(password);
  const binary = atob(base64Str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedContent);
  return JSON.parse(jsonStr);
}
