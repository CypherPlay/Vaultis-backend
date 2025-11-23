import { EventParser } from '../event-parser';

describe('EventParser', () => {
  describe('validateBlockConfirmation', () => {
    it('should return true if block has enough confirmations', () => {
      expect(EventParser.validateBlockConfirmation(100, 90, 10)).toBe(true);
    });

    it('should return false if block does not have enough confirmations', () => {
      expect(EventParser.validateBlockConfirmation(100, 95, 10)).toBe(false);
    });

    it('should throw error if currentBlock is not a finite integer', () => {
      expect(() => EventParser.validateBlockConfirmation(NaN, 90, 10)).toThrow('Current block must be a non-negative finite integer.');
      expect(() => EventParser.validateBlockConfirmation(100.5, 90, 10)).toThrow('Current block must be a non-negative finite integer.');
      expect(() => EventParser.validateBlockConfirmation(-1, 90, 10)).toThrow('Current block must be a non-negative finite integer.');
    });

    it('should throw error if eventBlock is not a finite integer', () => {
      expect(() => EventParser.validateBlockConfirmation(100, NaN, 10)).toThrow('Event block must be a non-negative finite integer.');
      expect(() => EventParser.validateBlockConfirmation(100, 90.5, 10)).toThrow('Event block must be a non-negative finite integer.');
      expect(() => EventParser.validateBlockConfirmation(100, -1, 10)).toThrow('Event block must be a non-negative finite integer.');
    });

    it('should throw error if requiredConfirmations is not a finite integer', () => {
      expect(() => EventParser.validateBlockConfirmation(100, 90, NaN)).toThrow('Required confirmations must be a non-negative finite integer.');
      expect(() => EventParser.validateBlockConfirmation(100, 90, 10.5)).toThrow('Required confirmations must be a non-negative finite integer.');
      expect(() => EventParser.validateBlockConfirmation(100, 90, -1)).toThrow('Required confirmations must be a non-negative finite integer.');
    });

    it('should throw error if eventBlock is greater than currentBlock', () => {
      expect(() => EventParser.validateBlockConfirmation(90, 100, 10)).toThrow('Event block cannot be greater than current block.');
    });
  });
});
