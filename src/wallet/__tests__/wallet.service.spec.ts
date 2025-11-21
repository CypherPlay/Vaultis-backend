import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../../schemas/user.schema';
import { RetryInventoryService } from '../../retry/retry-inventory.service';
import { Model } from 'mongoose';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let userModel: Model<User>;
  let retryInventoryService: RetryInventoryService;

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    save: jest.fn(),
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
          provide: RetryInventoryService,
          useValue: mockRetryInventoryService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    retryInventoryService = module.get<RetryInventoryService>(RetryInventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deductEntryFee', () => {
    const userId = 'user123';
    const entryFee = 10;

    it('should deduct from balance if sufficient', async () => {
      mockUserModel.exec.mockResolvedValueOnce({
        _id: userId,
        balance: 100,
        save: mockUserModel.save,
      });
      mockUserModel.save.mockResolvedValueOnce(true);

      await service.deductEntryFee(userId, entryFee);

      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.save).toHaveBeenCalled();
    });

    it('should deduct a retry token if balance is insufficient but tokens are available', async () => {
      mockUserModel.exec.mockResolvedValueOnce({
        _id: userId,
        balance: 5,
        save: mockUserModel.save,
      });
      mockRetryInventoryService.deductRetries.mockResolvedValueOnce(true);

      await service.deductEntryFee(userId, entryFee);

      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.save).not.toHaveBeenCalled(); // Should not save user model if retry tokens are used
      expect(mockRetryInventoryService.deductRetries).toHaveBeenCalledWith(userId, 1, null);
    });

    it('should throw BadRequestException if insufficient balance and no retry tokens', async () => {
      mockUserModel.exec.mockResolvedValueOnce({
        _id: userId,
        balance: 5,
        save: mockUserModel.save,
      });
      mockRetryInventoryService.deductRetries.mockResolvedValueOnce(false);

      await expect(service.deductEntryFee(userId, entryFee)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserModel.save).not.toHaveBeenCalled();
      expect(mockRetryInventoryService.deductRetries).toHaveBeenCalledWith(userId, 1, null);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.exec.mockResolvedValueOnce(null);

      await expect(service.deductEntryFee(userId, entryFee)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserModel.save).not.toHaveBeenCalled();
    });



    it('should throw InternalServerErrorException on other errors', async () => {
      mockUserModel.exec.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.deductEntryFee(userId, entryFee)).rejects.toThrow(
        InternalServerErrorException,
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
