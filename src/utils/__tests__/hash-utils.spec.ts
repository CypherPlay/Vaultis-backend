import { normalizeString, hashString } from '../hash-utils';

describe('Hash Utils', () => {
  describe('normalizeString', () => {
    it('should convert to lowercase', () => {
      expect(normalizeString('HELLO')).toBe('hello');
    });

    it('should remove leading/trailing whitespace', () => {
      expect(normalizeString('  hello  ')).toBe('hello');
    });

    it('should remove special characters', () => {
      expect(normalizeString('h@ll0 w0r!d')).toBe('hll0w0rd');
    });

    it('should handle a combination of changes', () => {
      expect(normalizeString('  HeLlO W0rLd!  ')).toBe('helloworld');
    });

    it('should return an empty string for an empty input', () => {
      expect(normalizeString('')).toBe('');
    });

    it('should return an empty string for only special characters and whitespace', () => {
      expect(normalizeString(' @#$%^&*() ')).toBe('');
    });
  });

  describe('hashString', () => {
    it('should return a consistent hash for the same input', () => {
      const input = 'teststring';
      const hash1 = hashString(input);
      const hash2 = hashString(input);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const input1 = 'teststring1';
      const input2 = 'teststring2';
      expect(hashString(input1)).not.toBe(hashString(input2));
    });

    it('should return a hash of the correct length (SHA256 is 64 chars)', () => {
      const input = 'anyrandomstring';
      expect(hashString(input).length).toBe(64);
    });

    it('should produce a consistent hash after normalization', () => {
      const normalizedInput = normalizeString('  HeLlO W0rLd!  ');
      const expectedHash = hashString('helloworld'); // Pre-calculated hash for 'helloworld'
      expect(hashString(normalizedInput)).toBe(expectedHash);
    });
  });
});
