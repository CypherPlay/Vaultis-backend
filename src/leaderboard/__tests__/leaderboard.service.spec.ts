import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService, DailyRankingResult } from '../leaderboard.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuessDocument, Guess } from '../../schemas/guess.schema';
import { UserDocument, User } from '../../schemas/user.schema';
import { RiddleDocument, Riddle } from '../../schemas/riddle.schema';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let guessModel: Model<GuessDocument>;
  let userModel: Model<UserDocument>;
  let riddleModel: Model<RiddleDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getModelToken(Guess.name),
          useValue: {
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Riddle.name),
          useValue: {
            aggregate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    guessModel = module.get<Model<GuessDocument>>(getModelToken(Guess.name));
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    riddleModel = module.get<Model<RiddleDocument>>(getModelToken(Riddle.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateDailyRankings', () => {
    it('should return daily rankings ordered by score and then submission time', async () => {
      const mockGuesses = [
        { userId: 'user1', isCorrect: true, submittedAt: new Date('2025-12-18T10:00:00Z') },
        { userId: 'user2', isCorrect: true, submittedAt: new Date('2025-12-18T10:05:00Z') },
        { userId: 'user1', isCorrect: true, submittedAt: new Date('2025-12-18T10:10:00Z') },
        { userId: 'user3', isCorrect: true, submittedAt: new Date('2025-12-18T10:01:00Z') },
        { userId: 'user2', isCorrect: true, submittedAt: new Date('2025-12-18T10:02:00Z') },
      ];

      const mockUsers = [
        { _id: 'user1', username: 'User One' },
        { _id: 'user2', username: 'User Two' },
        { _id: 'user3', username: 'User Three' },
      ];

      jest.spyOn(guessModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce([
          { userId: 'user2', username: 'User Two', score: 2, submittedAt: new Date('2025-12-18T10:02:00Z') },
          { userId: 'user1', username: 'User One', score: 2, submittedAt: new Date('2025-12-18T10:00:00Z') },
          { userId: 'user3', username: 'User Three', score: 1, submittedAt: new Date('2025-12-18T10:01:00Z') },
        ]),
      } as any);


      const result = await service.calculateDailyRankings();

      expect(result).toEqual([
        { userId: 'user2', username: 'User Two', score: 2, submittedAt: new Date('2025-12-18T10:02:00Z') },
        { userId: 'user1', username: 'User One', score: 2, submittedAt: new Date('2025-12-18T10:00:00Z') },
        { userId: 'user3', username: 'User Three', score: 1, submittedAt: new Date('2025-12-18T10:01:00Z') },
      ]);
    });

    it('should handle no correct guesses for the day', async () => {
      jest.spyOn(guessModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce([]),
      } as any);

      const result = await service.calculateDailyRankings();
      expect(result).toEqual([]);
    });

    it('should correctly handle ties in score by using submission time', async () => {
      // User1: 2 correct guesses, first at 10:00:00
      // User2: 2 correct guesses, first at 10:01:00
      // User3: 1 correct guess, first at 10:02:00
      jest.spyOn(guessModel, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce([
          { userId: 'user1', username: 'User One', score: 2, submittedAt: new Date('2025-12-18T10:00:00Z') },
          { userId: 'user2', username: 'User Two', score: 2, submittedAt: new Date('2025-12-18T10:01:00Z') },
          { userId: 'user3', username: 'User Three', score: 1, submittedAt: new Date('2025-12-18T10:02:00Z') },
        ]),
      } as any);

      const result = await service.calculateDailyRankings();

      expect(result[0].userId).toBe('user1'); // User1 wins tie-break due to earlier submission
      expect(result[1].userId).toBe('user2');
      expect(result[2].userId).toBe('user3');
    });
  });

  describe('getAllTimeRankings', () => {
    it('should return all-time rankings ordered by score and then submission time', async () => {
      jest.spyOn(guessModel, 'aggregate').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([
          { userId: 'user2', username: 'User Two', score: 5, submittedAt: new Date('2025-12-10T10:00:00Z') },
          { userId: 'user1', username: 'User One', score: 5, submittedAt: new Date('2025-12-05T10:00:00Z') },
          { userId: 'user3', username: 'User Three', score: 3, submittedAt: new Date('2025-12-15T10:00:00Z') },
        ]),
      } as any).mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([{ total: 3 }]),
      } as any);

      const result = await service.getAllTimeRankings();

      expect(result.data).toEqual([
        { userId: 'user2', username: 'User Two', score: 5, submittedAt: new Date('2025-12-10T10:00:00Z') },
        { userId: 'user1', username: 'User One', score: 5, submittedAt: new Date('2025-12-05T10:00:00Z') },
        { userId: 'user3', username: 'User Three', score: 3, submittedAt: new Date('2025-12-15T10:00:00Z') },
      ]);
      expect(result.total).toBe(3);
    });

    it('should handle pagination correctly for all-time rankings', async () => {
      jest.spyOn(guessModel, 'aggregate').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([
          { userId: 'user3', username: 'User Three', score: 3, submittedAt: new Date('2025-12-15T10:00:00Z') },
        ]),
      } as any).mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([{ total: 3 }]),
      } as any);

      const result = await service.getAllTimeRankings(2, 1); // Get second page, 1 item per page

      expect(result.data).toEqual([
        { userId: 'user3', username: 'User Three', score: 3, submittedAt: new Date('2025-12-15T10:00:00Z') },
      ]);
      expect(result.total).toBe(3);
    });

    it('should correctly handle ties in score by using submission time for all-time rankings', async () => {
      // User1: 5 correct guesses, first at 2025-12-05T10:00:00Z
      // User2: 5 correct guesses, first at 2025-12-10T10:00:00Z
      jest.spyOn(guessModel, 'aggregate').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([
          { userId: 'user1', username: 'User One', score: 5, submittedAt: new Date('2025-12-05T10:00:00Z') },
          { userId: 'user2', username: 'User Two', score: 5, submittedAt: new Date('2025-12-10T10:00:00Z') },
        ]),
      } as any).mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([{ total: 2 }]),
      } as any);

      const result = await service.getAllTimeRankings();

      expect(result.data[0].userId).toBe('user1'); // User1 wins tie-break due to earlier submission
      expect(result.data[1].userId).toBe('user2');
    });
  });
});