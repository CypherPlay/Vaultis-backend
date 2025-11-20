import { Test, TestingModule } from '@nestjs/testing';
import { RetryInventoryService } from '../retry-inventory.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { BadRequestException } from '@nestjs/common';

const mockUser = (retryTokens: number = 0): UserDocument => ({
  _id: 'someUserId',
  walletAddress: '0x123',
  username: 'testuser',
  email: 'test@example.com',
  guesses: [],
  leaderboardEntries: [],
  balance: 0,
  retryTokens,
  solvedRiddles: [],
  save: jest.fn().mockResolvedValue(true),
} as any);

describe('RetryInventoryService', () => {
  let service: RetryInventoryService;
  let userModel: Model<UserDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryInventoryService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            db: { startSession: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<RetryInventoryService>(RetryInventoryService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addRetries', () => {
    it('should add retries to a user', async () => {
      const user = mockUser(5);
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      } as any);
      jest.spyOn(userModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      const result = await service.addRetries('someUserId', 3);
      expect(result).toEqual(user);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'someUserId',
        { $inc: { retryTokens: 3 } },
        { new: true, session: expect.any(Object) }
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(userModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      await expect(service.addRetries('nonExistentUser', 1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('deductRetries', () => {
    it('should deduct retries from a user', async () => {
      const user = mockUser(5);
      jest.spyOn(userModel, 'findById').mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      } as any);
      jest.spyOn(userModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      const result = await service.deductRetries('someUserId', 3);
      expect(user.retryTokens).toBe(2);
      expect(user.save).toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it('should throw BadRequestException if user not found', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(userModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      await expect(service.deductRetries('nonExistentUser', 1)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if insufficient retries', async () => {
      const user = mockUser(2);
      jest.spyOn(userModel, 'findById').mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      } as any);
      jest.spyOn(userModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      await expect(service.deductRetries('someUserId', 3)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getRetries', () => {
    it('should return the current retry count for a user', async () => {
      const user = mockUser(10);
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      } as any);

      const result = await service.getRetries('someUserId');
      expect(result).toBe(10);
    });

    it('should throw BadRequestException if user not found', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.getRetries('nonExistentUser')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
