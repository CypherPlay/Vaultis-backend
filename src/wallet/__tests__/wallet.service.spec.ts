import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../../schemas/user.schema';
import { REDIS_CLIENT } from '../../database/redis.module';
import { RetryInventoryService } from '../../retry/retry-inventory.service';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let userModel: Model<User>;
  let redisClient: Redis;
  let retryInventoryService: RetryInventoryService;

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    save: jest.fn(),
  };

  const mockRedisClient = {
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRetryInventoryService = {
    deductRetries: jest.fn(),
    addRetries: jest.fn(),
    getRetries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
        {
          provide: RetryInventoryService,
          useValue: mockRetryInventoryService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    redisClient = module.get<Redis>(REDIS_CLIENT);
    retryInventoryService = module.get<RetryInventoryService>(RetryInventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deductEntryFee', () => {
    const userId = 'user123';
    const entryFee = 10;

    it('should deduct from balance if sufficient', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');
      mockUserModel.exec.mockResolvedValueOnce({
        _id: userId,
        balance: 100,
        save: mockUserModel.save,
      });
      mockUserModel.save.mockResolvedValueOnce(true);

      await service.deductEntryFee(userId, entryFee, null);

      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.save).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `lock:user:${userId}:deduct`,
      );
    });

    it('should deduct a retry token if balance is insufficient but tokens are available', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');
      mockUserModel.exec.mockResolvedValueOnce({
        _id: userId,
        balance: 5,
        save: mockUserModel.save,
      });
      mockRetryInventoryService.deductRetries.mockResolvedValueOnce(true);

      await service.deductEntryFee(userId, entryFee, null);

      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.save).not.toHaveBeenCalled(); // Should not save user model if retry tokens are used
      expect(mockRetryInventoryService.deductRetries).toHaveBeenCalledWith(userId, 1, null);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `lock:user:${userId}:deduct`,
      );
    });

    it('should throw BadRequestException if insufficient balance and no retry tokens', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');
      mockUserModel.exec.mockResolvedValueOnce({
        _id: userId,
        balance: 5,
        save: mockUserModel.save,
      });
      mockRetryInventoryService.deductRetries.mockResolvedValueOnce(false);

      await expect(service.deductEntryFee(userId, entryFee, null)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserModel.save).not.toHaveBeenCalled();
      expect(mockRetryInventoryService.deductRetries).toHaveBeenCalledWith(userId, 1, null);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `lock:user:${userId}:deduct`,
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');
      mockUserModel.exec.mockResolvedValueOnce(null);

      await expect(service.deductEntryFee(userId, entryFee, null)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserModel.save).not.toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `lock:user:${userId}:deduct`,
      );
    });

    it('should throw BadRequestException if lock cannot be acquired', async () => {
      mockRedisClient.set.mockResolvedValueOnce(null);

      await expect(service.deductEntryFee(userId, entryFee, null)).rejects.toThrow(
        BadRequestException,
      );
      expect(userModel.findById).not.toHaveBeenCalled();
      expect(mockUserModel.save).not.toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on other errors and release lock', async () => {
      mockRedisClient.set.mockResolvedValueOnce('OK');
      mockUserModel.exec.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.deductEntryFee(userId, entryFee, null)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `lock:user:${userId}:deduct`,
      );
    });
  });

  describe('creditBalance', () => {
    const userId = 'user123';
    const amount = 50;

    it('should credit balance to user', async () => {
      const user = {
        _id: userId,
        balance: 100,
        save: mockUserModel.save,
      };
      mockUserModel.exec.mockResolvedValueOnce(user);
      mockUserModel.save.mockResolvedValueOnce(true);

      await service.creditBalance(userId, amount);

      expect(user.balance).toBe(150);
      expect(mockUserModel.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.exec.mockResolvedValueOnce(null);

      await expect(service.creditBalance(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserModel.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserBalance', () => {
    const userId = 'user123';

    it('should return user balance', async () => {
      const user = {
        _id: userId,
        balance: 100,
        save: mockUserModel.save,
      };
      mockUserModel.exec.mockResolvedValueOnce(user);

      const result = await service.getUserBalance(userId);

      expect(result).toEqual({ balance: 100 });
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.exec.mockResolvedValueOnce(null);

      await expect(service.getUserBalance(userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
