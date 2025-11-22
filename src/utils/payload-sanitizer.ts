import { cloneDeep } from 'lodash';

export class PayloadSanitizer {
  private static readonly DEFAULT_REDACT_PATTERNS = [
    /wallet/i,
    /address/i,
    /publicKey/i,
    /privateKey/i,
    /signature/i,
    /transaction/i,
    /txHash/i,
    /amount/i,
    /email/i,
    /phone/i,
  ];

  static sanitize(payload: Record<string, any>, redactPatterns: RegExp[] = PayloadSanitizer.DEFAULT_REDACT_PATTERNS, maxLogLength: number = 1000): Record<string, any> {
    if (!payload) {
      return {};
    }

    const sanitizedPayload = cloneDeep(payload);

    const redact = (obj: any) => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];

          if (typeof value === 'object' && value !== null) {
            redact(value);
          } else {
            for (const pattern of redactPatterns) {
              if (pattern.test(key)) {
                obj[key] = '[REDACTED]';
                break;
              }
            }
          }
        }
      }
    };

    redact(sanitizedPayload);

    // Enforce max log length (simple truncation for now, can be more sophisticated)
    const payloadString = JSON.stringify(sanitizedPayload);
    if (payloadString.length > maxLogLength) {
      return { sanitized: payloadString.substring(0, maxLogLength) + '... [TRUNCATED]' };
    }

    return sanitizedPayload;
  }
}
