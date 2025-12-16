import { Test, TestingModule } from '@nestjs/testing';
import { GameLogicService } from '../game-logic.service';

describe('GameLogicService', () => {
  let service: GameLogicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameLogicService],
    }).compile();

    service = module.get<GameLogicService>(GameLogicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeGuess (private method)', () => {
    // Accessing private method for testing purposes
    const normalizeGuess = (guess: string) => (service as any).normalizeGuess(guess);

    it('should convert to lowercase', () => {
      expect(normalizeGuess('ANSWER')).toBe('answer');
      expect(normalizeGuess('AnSwEr')).toBe('answer');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(normalizeGuess('  answer  ')).toBe('answer');
      expect(normalizeGuess('\tanswer\n')).toBe('answer');
    });

    it('should handle multi-word inputs', () => {
      expect(normalizeGuess('  Multi Word Answer  ')).toBe('multi word answer');
    });

    it('should return empty string for only whitespace', () => {
      expect(normalizeGuess('   ')).toBe('');
      expect(normalizeGuess('\t\n')).toBe('');
    });

    it('should handle special characters', () => {
      expect(normalizeGuess('ans-wer!')).toBe('ans-wer!');
    });

    it('should return empty string for an empty string', () => {
      expect(normalizeGuess('')).toBe('');
    });
  });

  describe('checkGuess', () => {
    it('should return true for exact matches', async () => {
      expect(await service.checkGuess('answer', 'answer')).toBe(true);
    });

    it('should return true for matches with different casing and leading/trailing spaces', async () => {
      expect(await service.checkGuess('  Answer  ', 'answer')).toBe(true);
      expect(await service.checkGuess('answer', '  ANSWER  ')).toBe(true);
      expect(await service.checkGuess('  AnSwEr  ', 'aNsWeR')).toBe(true);
    });

    it('should return false for non-matches', async () => {
      expect(await service.checkGuess('wrong', 'answer')).toBe(false);
      expect(await service.checkGuess('answer', 'wrong')).toBe(false);
    });

    it('should return false for null or undefined inputs', async () => {
      expect(await service.checkGuess(null, 'answer')).toBe(false);
      expect(await service.checkGuess('answer', undefined)).toBe(false);
      expect(await service.checkGuess(undefined, null)).toBe(false);
    });

    it('should return false for empty strings after normalization', async () => {
      expect(await service.checkGuess('', 'answer')).toBe(false);
      expect(await service.checkGuess('answer', '')).toBe(false);
      expect(await service.checkGuess('   ', 'answer')).toBe(false);
      expect(await service.checkGuess('answer', '   ')).toBe(false);
    });

    it('should return false for answers of different lengths after normalization', async () => {
      expect(await service.checkGuess('short', 'longer')).toBe(false);
      expect(await service.checkGuess('longer', 'short')).toBe(false);
    });

    it('should handle special characters correctly after normalization', async () => {
      expect(await service.checkGuess('ans-wer', 'ans-wer')).toBe(true);
      expect(await service.checkGuess('ans wer', 'ans wer')).toBe(true);
      expect(await service.checkGuess('ans.wer', 'ans.wer')).toBe(true);
    });

    it('should return true for multi-word matches with various casing and spacing', async () => {
      expect(await service.checkGuess('  Multi Word Answer  ', 'multi word answer')).toBe(true);
      expect(await service.checkGuess('multi word answer', '  MULTI WORD ANSWER  ')).toBe(true);
      expect(await service.checkGuess('MULTI wOrD AnSwEr', 'multi WoRd aNsWeR')).toBe(true);
    });

    it('should return false for multi-word non-matches', async () => {
      expect(await service.checkGuess('multi word wrong', 'multi word answer')).toBe(false);
      expect(await service.checkGuess('multi answer', 'multi word answer')).toBe(false);
    });
  });
});