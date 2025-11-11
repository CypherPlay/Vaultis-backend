import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService, DailyRankingEntry } from '../leaderboard.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuessDocument } from '../../schemas/guess.schema';
import { UserDocument } from '../../schemas/user.schema';
import { RiddleDocument } from '../../schemas/riddle.schema';
import { LeaderboardEntryDocument } from '../../schemas/leaderboard-entry.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let guessModel: Model<GuessDocument>;
  let userModel: Model<UserDocument>;
  let riddleModel: Model<RiddleDocument>;
  let leaderboardEntryModel: Model<LeaderboardEntryDocument>;
  let cacheManager: any;

  const mockGuessModel = () => ({
    aggregate: jest.fn(() => ({
      match: jest.fn().mockReturnThis(),
      group: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lookup: jest.fn().mockReturnThis(),
      unwind: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
  });

  const mockUserModel = {};
  const mockRiddleModel = {};
  const mockLeaderboardEntryModel = {};
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getModelToken('Guess'),
          useFactory: mockGuessModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Riddle'),
          useValue: mockRiddleModel,
        },
        {
          provide: getModelToken('LeaderboardEntry'),
          useValue: mockLeaderboardEntryModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    guessModel = module.get<Model<GuessDocument>>(getModelToken('Guess'));
    userModel = module.get<Model<UserDocument>>(getModelToken('User'));
    riddleModel = module.get<Model<RiddleDocument>>(getModelToken('Riddle'));
    leaderboardEntryModel = module.get<Model<LeaderboardEntryDocument>>(getModelToken('LeaderboardEntry'));
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllTimeRankings', () => {
    it('should return paginated all-time rankings and total count', async () => {
      const mockAggregatedData = Array.from({ length: 20 }, (_, i) => ({
        userId: `user${i}`,
        username: `username${i}`,
        score: 100 - i,
        submittedAt: new Date(),
      }));

      (guessModel.aggregate().exec as jest.Mock)
        .mockResolvedValueOnce(mockAggregatedData.slice(0, 10)) // First page
        .mockResolvedValueOnce([{ total: 20 }]); // Total count

      const result = await service.getAllTimeRankings(1, 10);

      expect(result).toBeDefined();
      expect(result.data.length).toBe(10);
      expect(result.total).toBe(20);
      expect(result.data[0]).toHaveProperty('username');
      expect(result.data[0]).toHaveProperty('score');
    });

    it('should return an empty array and zero total if no rankings', async () => {
      (guessModel.aggregate().exec as jest.Mock)
        .mockResolvedValueOnce([]) // No data
        .mockResolvedValueOnce([{ total: 0 }]); // Total count

      const result = await service.getAllTimeRankings(1, 10);

      expect(result).toBeDefined();
      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
