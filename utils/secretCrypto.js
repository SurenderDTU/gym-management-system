const crypto = require('crypto');

const deriveKey = () => {
    const secret = process.env.APP_SECRET_ENC_KEY || process.env.JWT_SECRET || '';
    if (!secret) {
        throw new Error('APP_SECRET_ENC_KEY (or JWT_SECRET fallback) is required for secret encryption.');
    }
    return crypto.createHash('sha256').update(secret).digest();
};

const encryptSecret = (plainText) => {
    const value = String(plainText || '').trim();
    if (!value) return '';

    const key = deriveKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSecret = (encodedValue) => {
    const raw = String(encodedValue || '').trim();
    if (!raw) return '';

    const [ivHex, tagHex, encryptedHex] = raw.split(':');
    if (!ivHex || !tagHex || !encryptedHex) return '';

    try {
        const key = deriveKey();
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch (_err) {
        return '';
    }
};

module.exports = {
    encryptSecret,
    decryptSecret,
};
