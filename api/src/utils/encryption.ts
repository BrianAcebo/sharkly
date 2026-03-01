/**
 * Encryption utilities for sensitive data
 * Used for encrypting OAuth refresh tokens before storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt sensitive data (e.g., OAuth refresh tokens)
 * Returns base64 encoded string: base64(iv:encryptedData:tag)
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
	// Ensure key is 32 bytes for AES-256
	const key = Buffer.from(encryptionKey.padEnd(32).slice(0, 32), 'utf-8');
	const iv = crypto.randomBytes(IV_LENGTH);

	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
	encrypted += cipher.final('hex');

	const tag = cipher.getAuthTag();

	// Combine: iv:encrypted:tag
	const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag]);
	return combined.toString('base64');
}

/**
 * Decrypt encrypted data
 * Expects base64 encoded string: base64(iv:encryptedData:tag)
 */
export function decrypt(encryptedData: string, encryptionKey: string): string {
	// Ensure key is 32 bytes for AES-256
	const key = Buffer.from(encryptionKey.padEnd(32).slice(0, 32), 'utf-8');

	const combined = Buffer.from(encryptedData, 'base64');

	// Extract: iv:encrypted:tag
	const iv = combined.slice(0, IV_LENGTH);
	const tag = combined.slice(combined.length - TAG_LENGTH);
	const encryptedBytes = combined.slice(IV_LENGTH, combined.length - TAG_LENGTH);

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);

	let decrypted = decipher.update(encryptedBytes);
	decrypted = Buffer.concat([decrypted, decipher.final()]);

	return decrypted.toString('utf-8');
}
