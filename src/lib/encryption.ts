// encryption.ts - Funciones para encriptar y desencriptar tokens de forma segura usando Web Crypto API. Incluye generación de claves, manejo de IV y validación de tokens encriptados.

import { appEnv } from "../config/env";

/**
 * Utilidades de encriptación para credenciales sensibles
 * Usa Web Crypto API para encriptación AES-GCM
 */

// Clave de encriptación (en producción, usar variable de entorno)
const ENCRYPTION_KEY = appEnv.security.encryptionKey;

/**
 * Genera una clave de encriptación desde una contraseña
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('did-glo-bal-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encripta un token de forma segura
 * @param token - Token a encriptar
 * @returns Token encriptado en formato base64
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await getEncryptionKey();
    
    // Generar IV aleatorio
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encriptar
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(token)
    );

    // Combinar IV + datos encriptados
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convertir a base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error encriptando token:', error);
    throw new Error('Error al encriptar el token');
  }
}

/**
 * Desencripta un token
 * @param encryptedToken - Token encriptado en formato base64
 * @returns Token desencriptado
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decodificar base64
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map(char => char.charCodeAt(0))
    );

    // Separar IV y datos encriptados
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Desencriptar
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    // Decodificar
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Error desencriptando token:', error);
    throw new Error('Error al desencriptar el token');
  }
}

/**
 * Valida que un token encriptado sea válido
 * @param encryptedToken - Token encriptado a validar
 * @returns true si es válido, false si no
 */
export async function validateEncryptedToken(encryptedToken: string): Promise<boolean> {
  try {
    await decryptToken(encryptedToken);
    return true;
  } catch {
    return false;
  }
}
