import { Test, TestingModule } from '@nestjs/testing';
import { UserHistoryService } from '../user-history.service';
import { UserHistoryRepository } from '../user-history.repository';
import { RiddleService } from '../../riddle/riddle.service';
import { Types } from 'mongoose';
import { Riddle } from '../../schemas/riddle.schema';
import { Guess } from '../../schemas/guess.schema';

describe('UserHistoryService', () => {
  let service: UserHistoryService;
  let userHistoryRepository: UserHistoryRepository;
  let riddleService: RiddleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserHistoryService,
        {
          provide: UserHistoryRepository,
          useValue: {
            getPaginatedUserGuesses: jest.fn(),
          },
        },
        {
          provide: RiddleService,
          useValue: {
            findRiddlesByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserHistoryService>(UserHistoryService);
    userHistoryRepository = module.get<UserHistoryRepository>(
      UserHistoryRepository,
    );
    riddleService = module.get<RiddleService>(RiddleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserHistory', () => {
    const userId = new Types.ObjectId().toHexString();
    const riddleId1 = new Types.ObjectId();
    const riddleId2 = new Types.ObjectId();

    const mockRiddles: Riddle[] = [
      {
        _id: riddleId1,
        question: 'Question 1',
        answer: 'Answer 1',
        value: 10,
        hint: 'Hint 1',
        solutionTxHash: '0x123',
        blockNumber: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Riddle,
      {
        _id: riddleId2,
        question: 'Question 2',
        answer: 'Answer 2',
        value: 20,
        hint: 'Hint 2',
        solutionTxHash: '0x456',
        blockNumber: 2,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Riddle,
    ];

    const mockGuesses: Guess[] = [
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        riddleId: riddleId1,
        guess: 'Guess 1',
        isCorrect: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Guess,
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        riddleId: riddleId2,
        guess: 'Guess 2',
        isCorrect: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Guess,
    ];

    it('should return paginated user guess history', async () => {
      const page = 1;
      const limit = 10;
      const total = 2;

      jest
        .spyOn(userHistoryRepository, 'getPaginatedUserGuesses')
        .mockResolvedValue({ guesses: mockGuesses, total });
      jest
        .spyOn(riddleService, 'findRiddlesByIds')
        .mockResolvedValue(mockRiddles);

      const result = await service.getUserHistory(userId, page, limit);

      expect(userHistoryRepository.getPaginatedUserGuesses).toHaveBeenCalledWith(
        userId,
        page,
        limit,
      );
      expect(riddleService.findRiddlesByIds).toHaveBeenCalledWith([
        riddleId1,
        riddleId2,
      ]);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(total);
      expect(result.page).toBe(page);
      expect(result.limit).toBe(limit);
      expect(result.data[0].riddleQuestion).toBe(mockRiddles[0].question);
      expect(result.data[0].userGuess).toBe(mockGuesses[0].guess);
      expect(result.data[0].isCorrect).toBe(mockGuesses[0].isCorrect);
    });

    it('should handle empty guess history', async () => {
      jest
        .spyOn(userHistoryRepository, 'getPaginatedUserGuesses')
        .mockResolvedValue({ guesses: [], total: 0 });
      jest.spyOn(riddleService, 'findRiddlesByIds').mockResolvedValue([]);

      const result = await service.getUserHistory(userId, 1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should correctly join riddles with guesses', async () => {
      jest
        .spyOn(userHistoryRepository, 'getPaginatedUserGuesses')
        .mockResolvedValue({ guesses: mockGuesses, total: 2 });
      jest
        .spyOn(riddleService, 'findRiddlesByIds')
        .mockResolvedValue(mockRiddles);

      const result = await service.getUserHistory(userId, 1, 10);

      expect(result.data[0].riddleQuestion).toBe(mockRiddles[0].question);
      expect(result.data[0].riddleValue).toBe(mockRiddles[0].value);
      expect(result.data[0].userGuess).toBe(mockGuesses[0].guess);
      expect(result.data[0].isCorrect).toBe(mockGuesses[0].isCorrect);

      expect(result.data[1].riddleQuestion).toBe(mockRiddles[1].question);
      expect(result.data[1].riddleValue).toBe(mockRiddles[1].value);
      expect(result.data[1].userGuess).toBe(mockGuesses[1].guess);
      expect(result.data[1].isCorrect).toBe(mockGuesses[1].isCorrect);
    });

    it('should return correct guess history entries', async () => {
      jest
        .spyOn(userHistoryRepository, 'getPaginatedUserGuesses')
        .mockResolvedValue({ guesses: mockGuesses, total: 2 });
      jest
        .spyOn(riddleService, 'findRiddlesByIds')
        .mockResolvedValue(mockRiddles);

      const result = await service.getUserHistory(userId, 1, 10);

      expect(result.data[0]).toEqual({
        riddleId: riddleId1.toHexString(),
        riddleQuestion: 'Question 1',
        riddleValue: 10,
        userGuess: 'Guess 1',
        isCorrect: true,
        guessedAt: mockGuesses[0].createdAt,
      });

      expect(result.data[1]).toEqual({
        riddleId: riddleId2.toHexString(),
        riddleQuestion: 'Question 2',
        riddleValue: 20,
        userGuess: 'Guess 2',
        isCorrect: false,
        guessedAt: mockGuesses[1].createdAt,
      });
    });
  });
});
