/**
 * Secure encryption utilities for sensitive data like API keys
 * Uses PBKDF2 for key derivation and TweetNaCl for encryption
 * Based on wallet-style encryption approaches
 */

import { secretbox, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import bs58 from 'bs58';

// Encryption metadata
export type SecretPayload = {
  ciphertext: string;
  nonce: string;
  salt: string;
  iterations: number;
  digest: string;
};

// Password hash data
export type PasswordHash = {
  hash: string;
  salt: string;
  iterations: number;
  digest: string;
};

// Default password for encryption (in a real wallet, user would provide this)
// For our auto-encryption we'll use a device-specific value
const getDefaultPassword = (): string => {
  // Combination of extension ID, browser info, and installation time
  // This creates a reasonably unique identifier per installation
  const extensionId = chrome.runtime.id;
  const browserInfo = navigator.userAgent;
  // The key will be tied to the specific extension installation
  return `ask-genie-${extensionId}-${browserInfo}`;
};

/**
 * Derives an encryption key using PBKDF2
 */
const deriveEncryptionKey = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
  digest: string,
  keyLength: number
): Promise<Uint8Array> => {
  // Convert string password to buffer for WebCrypto API
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import the password as a key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: digest
    },
    baseKey,
    keyLength * 8
  );
  
  return new Uint8Array(derivedBits);
};

/**
 * Creates a secure hash of a password for storage and verification
 * @param password - The password to hash
 * @returns Password hash object
 */
export const hashPassword = async (password: string): Promise<PasswordHash> => {
  // Generate a random salt
  const salt = randomBytes(16);
  
  // Key derivation parameters
  const iterations = 100000; 
  const digest = 'SHA-256';
  const keyLength = 32; // 256 bits
  
  // Derive the hash
  const hashBytes = await deriveEncryptionKey(
    password,
    salt,
    iterations,
    digest,
    keyLength
  );
  
  // Return the hash object
  return {
    hash: bs58.encode(hashBytes),
    salt: bs58.encode(salt),
    iterations,
    digest
  };
};

/**
 * Verifies a password against a stored hash
 * @param password - The password to verify
 * @param storedHash - The stored password hash object
 * @returns Whether the password is correct
 */
export const verifyPassword = async (
  password: string, 
  storedHash: PasswordHash
): Promise<boolean> => {
  try {
    const { hash, salt, iterations, digest } = storedHash;
    
    // Decode the salt
    const saltBytes = bs58.decode(salt);
    
    // Derive a hash from the provided password
    const hashBytes = await deriveEncryptionKey(
      password,
      saltBytes,
      iterations,
      digest,
      32 // 256 bits
    );
    
    // Compare the hashes
    const computedHash = bs58.encode(hashBytes);
    return computedHash === hash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
};

/**
 * Encrypts a string value
 * @param plaintext - The string to encrypt
 * @param customPassword - Optional password (uses device-specific default if not provided)
 * @returns The encrypted payload
 */
export const encrypt = async (
  plaintext: string,
  customPassword?: string
): Promise<SecretPayload> => {
  if (!plaintext) {
    return {
      ciphertext: '',
      nonce: '',
      salt: '',
      iterations: 0,
      digest: ''
    };
  }
  
  // Use provided password or generate a default one
  const password = customPassword || getDefaultPassword();
  
  // Generate a random salt
  const salt = randomBytes(16);
  
  // Key derivation parameters
  const iterations = 100000; // Adjust based on security needs and performance
  const digest = 'SHA-256';
  
  // Derive the encryption key
  const key = await deriveEncryptionKey(
    password,
    salt,
    iterations,
    digest,
    secretbox.keyLength
  );
  
  // Generate a random nonce
  const nonce = randomBytes(secretbox.nonceLength);
  
  // Encrypt the data
  const ciphertext = secretbox(
    new Uint8Array(new TextEncoder().encode(plaintext)),
    nonce,
    key
  );
  
  // Return the encrypted payload
  return {
    ciphertext: bs58.encode(ciphertext),
    nonce: bs58.encode(nonce),
    salt: bs58.encode(salt),
    iterations,
    digest
  };
};

/**
 * Decrypts an encrypted string value
 * @param cipherObj - The encrypted payload
 * @param customPassword - Optional password (uses device-specific default if not provided)
 * @returns The decrypted string
 */
export const decrypt = async (
  cipherObj: SecretPayload,
  customPassword?: string
): Promise<string> => {
  if (!cipherObj.ciphertext) return '';
  
  try {
    const { ciphertext, nonce, salt, iterations, digest } = cipherObj;
    
    // Use provided password or generate a default one
    const password = customPassword || getDefaultPassword();
    
    // Decode from base58
    const ciphertextBytes = bs58.decode(ciphertext);
    const nonceBytes = bs58.decode(nonce);
    const saltBytes = bs58.decode(salt);
    
    // Derive the encryption key
    const key = await deriveEncryptionKey(
      password,
      saltBytes,
      iterations,
      digest,
      secretbox.keyLength
    );
    
    // Decrypt the data
    const plaintextBytes = secretbox.open(ciphertextBytes, nonceBytes, key);
    
    if (!plaintextBytes) {
      throw new Error("Decryption failed - possibly wrong password");
    }
    
    // Convert back to string
    return new TextDecoder().decode(plaintextBytes);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
};

/**
 * Simplified function to encrypt a string using default password
 * @param value - String to encrypt
 * @returns Base58 encoded JSON string of the encryption payload
 */
export const encryptData = async (value: string): Promise<string> => {
  if (!value) return '';
  const payload = await encrypt(value);
  return bs58.encode(Buffer.from(JSON.stringify(payload)));
};

/**
 * Simplified function to decrypt a string using default password
 * @param encryptedValue - Base58 encoded JSON string of the encryption payload
 * @returns Decrypted string
 */
export const decryptData = async (encryptedValue: string): Promise<string> => {
  if (!encryptedValue) return '';
  try {
    const payloadJson = Buffer.from(bs58.decode(encryptedValue)).toString();
    const payload = JSON.parse(payloadJson) as SecretPayload;
    return await decrypt(payload);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}; 