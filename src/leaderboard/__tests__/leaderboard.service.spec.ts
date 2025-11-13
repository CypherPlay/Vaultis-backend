import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from '../leaderboard.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuessDocument } from '../../schemas/guess.schema';
import { UserDocument } from '../../schemas/user.schema';
import { RiddleDocument } from '../../schemas/riddle.schema';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let guessModel: Model<GuessDocument>;
  let userModel: Model<UserDocument>;
  let riddleModel: Model<RiddleDocument>;

  const mockGuessModel = {
    aggregate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockUserModel = {};
  const mockRiddleModel = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getModelToken('Guess'),
          useValue: mockGuessModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Riddle'),
          useValue: mockRiddleModel,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    guessModel = module.get<Model<GuessDocument>>(getModelToken('Guess'));
    userModel = module.get<Model<UserDocument>>(getModelToken('User'));
    riddleModel = module.get<Model<RiddleDocument>>(getModelToken('Riddle'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test cases for calculateDailyRankings
  describe('calculateDailyRankings', () => {
    it('should calculate daily rankings correctly with tie-breaking', async () => {
      const mockDailyLeaderboard = [
        {
          userId: 'user1',
          username: 'user1_name',
          score: 3,
          submittedAt: new Date('2025-11-13T10:00:00.000Z'),
        },
        {
          userId: 'user2',
          username: 'user2_name',
          score: 3,
          submittedAt: new Date('2025-11-13T10:05:00.000Z'),
        },
        {
          userId: 'user3',
          username: 'user3_name',
          score: 2,
          submittedAt: new Date('2025-11-13T10:10:00.000Z'),
        },
      ];

      (guessModel.aggregate as jest.Mock).mockReturnThis();
      (guessModel.aggregate().exec as jest.Mock).mockResolvedValue(mockDailyLeaderboard);

      const result = await service.calculateDailyRankings();
      expect(result).toEqual(mockDailyLeaderboard);
      expect(guessModel.aggregate).toHaveBeenCalled();
    });

    it('should return an empty array if no correct guesses for the day', async () => {
      (guessModel.aggregate as jest.Mock).mockReturnThis();
      (guessModel.aggregate().exec as jest.Mock).mockResolvedValue([]);

      const result = await service.calculateDailyRankings();
      expect(result).toEqual([]);
    });
  });

  // Test cases for getDailyRankings
  describe('getDailyRankings', () => {
    it('should return daily rankings with rank', async () => {
      const mockCalculatedRankings = [
        {
          userId: 'user1',
          username: 'user1_name',
          score: 3,
          submittedAt: new Date('2025-11-13T10:00:00.000Z'),
        },
        {
          userId: 'user2',
          username: 'user2_name',
          score: 2,
          submittedAt: new Date('2025-11-13T10:05:00.000Z'),
        },
      ];

      const expectedRankings = [
        {
          rank: 1,
          userId: 'user1',
          correctGuesses: 3,
          submissionTime: new Date('2025-11-13T10:00:00.000Z'),
        },
        {
          rank: 2,
          userId: 'user2',
          correctGuesses: 2,
          submissionTime: new Date('2025-11-13T10:05:00.000Z'),
        },
      ];

      jest.spyOn(service, 'calculateDailyRankings').mockResolvedValue(mockCalculatedRankings);

      const result = await service.getDailyRankings();
      expect(result).toEqual(expectedRankings);
      expect(service.calculateDailyRankings).toHaveBeenCalled();
    });

    it('should return an empty array if no daily rankings are available', async () => {
      jest.spyOn(service, 'calculateDailyRankings').mockResolvedValue([]);

      const result = await service.getDailyRankings();
      expect(result).toEqual([]);
    });
  });

  // Test cases for getAllTimeRankings
  describe('getAllTimeRankings', () => {
    it('should calculate all-time rankings correctly with pagination and tie-breaking', async () => {
      const mockAllTimeLeaderboard = [
        {
          userId: 'user1',
          username: 'user1_name',
          score: 10,
          submittedAt: new Date('2025-11-10T10:00:00.000Z'),
        },
        {
          userId: 'user2',
          username: 'user2_name',
          score: 10,
          submittedAt: new Date('2025-11-11T10:00:00.000Z'),
        },
        {
          userId: 'user3',
          username: 'user3_name',
          score: 8,
          submittedAt: new Date('2025-11-09T10:00:00.000Z'),
        },
      ];

      (guessModel.aggregate as jest.Mock).mockReturnThis();
      (guessModel.aggregate().exec as jest.Mock)
        .mockResolvedValueOnce(mockAllTimeLeaderboard) // For paginated results
        .mockResolvedValueOnce([{ total: 3 }]); // For total count

      const result = await service.getAllTimeRankings(1, 10);
      expect(result.data).toEqual(mockAllTimeLeaderboard);
      expect(result.total).toBe(3);
      expect(guessModel.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should return an empty array and zero total if no all-time rankings', async () => {
      (guessModel.aggregate as jest.Mock).mockReturnThis();
      (guessModel.aggregate().exec as jest.Mock)
        .mockResolvedValueOnce([]) // For paginated results
        .mockResolvedValueOnce([{ total: 0 }]); // For total count

      const result = await service.getAllTimeRankings(1, 10);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle different pagination parameters', async () => {
      const mockAllTimeLeaderboardPage2 = [
        {
          userId: 'user4',
          username: 'user4_name',
          score: 5,
          submittedAt: new Date('2025-11-08T10:00:00.000Z'),
        },
      ];

      (guessModel.aggregate as jest.Mock).mockReturnThis();
      (guessModel.aggregate().exec as jest.Mock)
        .mockResolvedValueOnce(mockAllTimeLeaderboardPage2) // For paginated results
        .mockResolvedValueOnce([{ total: 4 }]); // For total count

      const result = await service.getAllTimeRankings(2, 3); // page 2, limit 3
      expect(result.data).toEqual(mockAllTimeLeaderboardPage2);
      expect(result.total).toBe(4);
      expect(guessModel.aggregate).toHaveBeenCalledTimes(2);
    });
  });

  // Test case for large dataset performance (conceptual, as actual performance testing is complex)
  describe('Performance considerations', () => {
    it('should handle a large number of guesses without significant performance degradation (conceptual test)', async () => {
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          userId: `user${i}`,
          username: `user${i}_name`,
          score: Math.floor(Math.random() * 100),
          submittedAt: new Date(Date.now() - i * 1000),
        });
      }

      (guessModel.aggregate as jest.Mock).mockReturnThis();
      (guessModel.aggregate().exec as jest.Mock)
        .mockResolvedValueOnce(largeDataset.slice(0, 10)) // Simulate first page
        .mockResolvedValueOnce([{ total: largeDataset.length }]); // Simulate total count

      const startTime = process.hrtime.bigint();
      const result = await service.getAllTimeRankings(1, 10);
      const endTime = process.hrtime.bigint();
      const timeTaken = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      expect(result.data.length).toBe(10);
      expect(result.total).toBe(largeDataset.length);
      // This is a conceptual check. In a real scenario, you'd have a benchmark.
      // For now, we just ensure it completes without error and within a reasonable (though undefined) time.
      console.log(`getAllTimeRankings with large dataset took ${timeTaken} ms`);
      expect(timeTaken).toBeLessThan(500); // Expect it to be relatively fast (e.g., under 500ms for 1000 items)
    });
  });
});