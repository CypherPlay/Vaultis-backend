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
  });
});
