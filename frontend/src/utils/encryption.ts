/**
 * Web Crypto API kullanarak güvenli şifreleme işlemleri
 */

const ENCRYPTION_KEY = 'auth_encryption_key';

// AES-GCM için rastgele IV oluştur
async function generateIV(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(12));
}

// String'den ArrayBuffer'a dönüştürme
function str2ab(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// ArrayBuffer'dan string'e dönüştürme
function ab2str(buf: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buf);
}

// Şifreleme anahtarı oluştur
async function getKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: str2ab('auth_salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Veriyi şifrele
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await getKey();
    const iv = await generateIV();
    const encoded = str2ab(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encoded
    );

    // IV ve şifrelenmiş veriyi birleştir
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Base64 encode
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Şifreleme hatası:', error);
    throw new Error('Veri şifrelenemedi');
  }
}

// Şifrelenmiş veriyi çöz
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getKey();
    
    // Base64 decode
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // IV'yi ayır
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encrypted
    );

    return ab2str(decrypted);
  } catch (error) {
    console.error('Şifre çözme hatası:', error);
    throw new Error('Veri çözülemedi');
  }
}