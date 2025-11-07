import * as crypto from 'crypto';

export function normalizeString(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
