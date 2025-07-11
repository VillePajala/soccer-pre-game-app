export async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('soccer-app-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(
  text: string,
  passphrase: string
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase);
  const enc = new TextEncoder();
  const cipher = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(text)
  );
  const buff = new Uint8Array(iv.byteLength + cipher.byteLength);
  buff.set(iv, 0);
  buff.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...buff));
}

export async function decryptString(
  cipherText: string,
  passphrase: string
): Promise<string> {
  const data = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const cipher = data.slice(12);
  const key = await deriveKey(passphrase);
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
  const dec = new TextDecoder();
  return dec.decode(plainBuffer);
}
