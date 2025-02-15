import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class MessageEncryption {
  static encrypt(text) {
    try {
      // Generate initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Return everything needed for decryption
      return {
        iv: iv.toString('hex'),
        encrypted: encrypted,
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  static decrypt(encryptedData) {
    try {
      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the text
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  static encryptMessage(message) {
    try {
      // Only encrypt sensitive parts of the message
      const sensitiveData = {
        content: message.content,
        sender: message.sender,
        receiver: message.receiver
      };

      const encrypted = this.encrypt(JSON.stringify(sensitiveData));

      return {
        ...encrypted,
        room: message.room, // Room ID doesn't need encryption
        timestamp: message.timestamp || new Date()
      };
    } catch (error) {
      throw new Error('Message encryption failed');
    }
  }

  static decryptMessage(encryptedMessage) {
    try {
      const decrypted = JSON.parse(this.decrypt({
        iv: encryptedMessage.iv,
        encrypted: encryptedMessage.encrypted,
        authTag: encryptedMessage.authTag
      }));

      return {
        ...decrypted,
        room: encryptedMessage.room,
        timestamp: encryptedMessage.timestamp
      };
    } catch (error) {
      throw new Error('Message decryption failed');
    }
  }
}
