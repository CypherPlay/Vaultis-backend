import { Test, TestingModule } from '@nestjs/testing';
import { RetryInventoryService } from '../retry-inventory.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RetryInventory, RetryInventoryDocument } from '../../schemas/retry-inventory.schema';
import { BadRequestException } from '@nestjs/common';

const mockRetryInventory = (retryCount: number = 0): RetryInventoryDocument => ({
  _id: 'someRetryInventoryId',
  userId: 'someUserId',
  retryCount,
  save: jest.fn().mockResolvedValue(true),
} as any);

describe('RetryInventoryService', () => {
  let service: RetryInventoryService;
  let retryInventoryModel: Model<RetryInventoryDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryInventoryService,
        {
          provide: getModelToken(RetryInventory.name),
          useValue: {
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RetryInventoryService>(RetryInventoryService);
    retryInventoryModel = module.get<Model<RetryInventoryDocument>>(getModelToken(RetryInventory.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addRetries', () => {
    it('should add retries to a user', async () => {
      const retryInventory = mockRetryInventory(5);
      jest.spyOn(retryInventoryModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(retryInventory),
      } as any);

      const result = await service.addRetries('someUserId', 3);
      expect(result).toEqual(retryInventory);
      expect(retryInventoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'someUserId' },
        { $inc: { retryCount: 3 }, updatedAt: expect.any(Date) },
        { new: true, upsert: true }
      );
    });

    it('should throw BadRequestException if retry inventory not found', async () => {
      jest.spyOn(retryInventoryModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.addRetries('nonExistentUser', 1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('deductRetries', () => {
    it('should deduct retries from a user', async () => {
      const retryInventory = mockRetryInventory(5);
      jest.spyOn(retryInventoryModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRetryInventory(2)),
      } as any);

      const result = await service.deductRetries('someUserId', 3);
      expect(retryInventoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'someUserId', retryCount: { $gte: 3 } },
        { $inc: { retryCount: -3 }, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result.retryCount).toBe(2);
    });

    it('should throw BadRequestException if retry inventory not found', async () => {
      jest.spyOn(retryInventoryModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(retryInventoryModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.deductRetries('nonExistentUser', 1)).rejects.toThrow(
        new BadRequestException('Retry inventory not found for user'),
      );
    });

    it('should throw BadRequestException if insufficient retries', async () => {
      jest.spyOn(retryInventoryModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(retryInventoryModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRetryInventory(2)),
      } as any);

      await expect(service.deductRetries('someUserId', 3)).rejects.toThrow(
        new BadRequestException('Insufficient retry tokens'),
      );
    });
  });

  describe('getRetries', () => {
    it('should return the current retry count for a user', async () => {
      const retryInventory = mockRetryInventory(10);
      jest.spyOn(retryInventoryModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(retryInventory),
      } as any);

      const result = await service.getRetries('someUserId');
      expect(retryInventoryModel.findOne).toHaveBeenCalledWith({ userId: 'someUserId' });
      expect(result).toBe(10);
    });

    it('should return 0 if retry inventory not found', async () => {
      jest.spyOn(retryInventoryModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.getRetries('nonExistentUser');
      expect(result).toBe(0);
    });
  });

  describe('verifyOnChainPurchase', () => {
    it('should add retries after successful on-chain verification', async () => {
      const userId = 'testUserId';
      const transactionHash = '0x123abc';
      const expectedAmount = 5;
      const updatedRetryInventory = mockRetryInventory(15);

      jest.spyOn(service, 'addRetries').mockResolvedValue(updatedRetryInventory);

      const result = await service.verifyOnChainPurchase(
        userId,
        transactionHash,
        expectedAmount,
      );

      expect(service.addRetries).toHaveBeenCalledWith(userId, expectedAmount);
      expect(result).toEqual(updatedRetryInventory);
    });

    it('should throw BadRequestException for negative expectedAmount', async () => {
      const userId = 'testUserId';
      const transactionHash = '0x123abc';
      const expectedAmount = -1;

      await expect(
        service.verifyOnChainPurchase(userId, transactionHash, expectedAmount),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero expectedAmount', async () => {
      const userId = 'testUserId';
      const transactionHash = '0x123abc';
      const expectedAmount = 0;

      await expect(
        service.verifyOnChainPurchase(userId, transactionHash, expectedAmount),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-integer expectedAmount', async () => {
      const userId = 'testUserId';
      const transactionHash = '0x123abc';
      const expectedAmount = 2.5;

      await expect(
        service.verifyOnChainPurchase(userId, transactionHash, expectedAmount),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle double crediting by throwing ConflictException if transaction already processed', async () => {
      const userId = 'testUserId';
      const transactionHash = '0xalreadyProcessed';
      const expectedAmount = 5;

      jest.spyOn(service, 'addRetries').mockRejectedValue(
        new ConflictException(`Transaction ${transactionHash} has already been processed.`),
      );

      await expect(
        service.verifyOnChainPurchase(userId, transactionHash, expectedAmount),
      ).rejects.toThrow(ConflictException);
      expect(service.addRetries).toHaveBeenCalledWith(userId, expectedAmount, transactionHash);
    });

    it('should propagate errors from addRetries during on-chain verification', async () => {
      const userId = 'testUserId';
      const transactionHash = '0xerrorTransaction';
      const expectedAmount = 5;
      const errorMessage = 'Database connection lost';

      jest.spyOn(service, 'addRetries').mockRejectedValue(new Error(errorMessage));

      await expect(
        service.verifyOnChainPurchase(userId, transactionHash, expectedAmount),
      ).rejects.toThrow(errorMessage);
      expect(service.addRetries).toHaveBeenCalledWith(userId, expectedAmount, transactionHash);
    });
  });
});
