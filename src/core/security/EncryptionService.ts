/**
 * Encryption service for secure API key storage
 * Uses AES-256-GCM with PBKDF2 key derivation
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Encrypted data container
 */
export interface EncryptedData {
  encryptedData: string;  // Base64 encoded
  iv: string;            // Base64 encoded
  salt: string;          // Base64 encoded
  authTag: string;       // Base64 encoded
  algorithm: string;     // Encryption algorithm used
  keyDerivation: string; // Key derivation method
}

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivation: 'pbkdf2';
  iterations: number;
  keyLength: number;
  ivLength: number;
  saltLength: number;
}

/**
 * AES-256-GCM encryption service with PBKDF2 key derivation
 */
export class EncryptionService {
  private readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,  // 100k iterations for security
    keyLength: 32,       // 256 bits
    ivLength: 12,        // 96 bits (recommended for GCM)
    saltLength: 16       // 128 bits
  };

  private masterPassword: string;

  constructor(masterPassword: string) {
    if (!masterPassword || masterPassword.length < 16) {
      throw new Error('Master password must be at least 16 characters');
    }
    this.masterPassword = masterPassword;
  }

  /**
   * Encrypt plaintext data
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.config.saltLength);
      const iv = randomBytes(this.config.ivLength);

      // Derive encryption key using PBKDF2
      const key = this.deriveKey(this.masterPassword, salt);

      // Create cipher
      const cipher = createCipheriv(this.config.algorithm, key, iv) as any;
      cipher.setAAD(Buffer.from(this.config.algorithm)); // Additional authenticated data

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.config.algorithm,
        keyDerivation: this.config.keyDerivation
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      // Validate encrypted data structure
      this.validateEncryptedData(encryptedData);

      // Parse components
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');

      // Derive the same key
      const key = this.deriveKey(this.masterPassword, salt);

      // Create decipher
      const decipher = createDecipheriv(encryptedData.algorithm, key, iv) as any;
      decipher.setAAD(Buffer.from(encryptedData.algorithm)); // Same AAD as encryption
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derive encryption key from master password and salt using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(
      password,
      salt,
      this.config.iterations,
      this.config.keyLength,
      'sha256'
    );
  }

  /**
   * Validate encrypted data structure
   */
  private validateEncryptedData(data: EncryptedData): void {
    const requiredFields = ['encryptedData', 'iv', 'salt', 'authTag', 'algorithm', 'keyDerivation'];
    
    for (const field of requiredFields) {
      if (!data[field as keyof EncryptedData]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.algorithm !== this.config.algorithm) {
      throw new Error(`Unsupported algorithm: ${data.algorithm}`);
    }

    if (data.keyDerivation !== this.config.keyDerivation) {
      throw new Error(`Unsupported key derivation: ${data.keyDerivation}`);
    }

    // Validate base64 encoding
    try {
      Buffer.from(data.iv, 'base64');
      Buffer.from(data.salt, 'base64');
      Buffer.from(data.authTag, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 encoding in encrypted data');
    }
  }

  /**
   * Generate a device-specific master password
   */
  static generateMasterPassword(pluginId: string, deviceId?: string): string {
    // Use plugin ID and device-specific information to generate master password
    const deviceInfo = deviceId || this.getDeviceFingerprint();
    const combined = `${pluginId}:${deviceInfo}:obsius-encryption`;
    
    // Create a hash for consistent master password
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get device fingerprint for master password generation
   */
  private static getDeviceFingerprint(): string {
    // Create a device fingerprint using available browser/electron APIs
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'node';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : process.platform;
    const language = typeof navigator !== 'undefined' ? navigator.language : 'en';
    
    // For Electron/Obsidian, we can use additional information
    const timestamp = Date.now().toString().slice(0, -7); // Truncate for some stability
    
    return createHash('md5')
      .update(`${userAgent}:${platform}:${language}:${timestamp}`)
      .digest('hex');
  }

  /**
   * Securely clear sensitive data from memory
   */
  static secureClear(obj: any): void {
    if (typeof obj === 'string') {
      // For strings, we can't directly clear memory, but we can overwrite the reference
      obj = null;
    } else if (obj instanceof Buffer) {
      obj.fill(0);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.secureClear(obj[key]);
          delete obj[key];
        }
      }
    }
  }

  /**
   * Test encryption/decryption with sample data
   */
  static test(masterPassword: string): boolean {
    try {
      const service = new EncryptionService(masterPassword);
      const testData = 'test-encryption-key-12345';
      
      const encrypted = service.encrypt(testData);
      const decrypted = service.decrypt(encrypted);
      
      return decrypted === testData;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }
}