import { Test, TestingModule } from '@nestjs/testing';
import { RetryInventoryService } from '../retry-inventory.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RetryInventory, RetryInventoryDocument } from '../../schemas/retry-inventory.schema';
import { BadRequestException } from '@nestjs/common';

const mockRetryInventory = (retries: number = 0): RetryInventoryDocument => ({
  _id: 'someRetryInventoryId',
  userId: 'someUserId',
  retries,
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
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            db: { startSession: jest.fn() },
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
      jest.spyOn(retryInventoryModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(retryInventory),
      } as any);
      jest.spyOn(retryInventoryModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      const result = await service.addRetries('someUserId', 3);
      expect(result).toEqual(retryInventory);
      expect(retryInventoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'someUserId',
        { $inc: { retries: 3 } },
        { new: true, session: expect.any(Object) }
      );
    });

    it('should throw BadRequestException if retry inventory not found', async () => {
      jest.spyOn(retryInventoryModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(retryInventoryModel.db, 'startSession').mockReturnValue({
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
      const retryInventory = mockRetryInventory(5);
      jest.spyOn(retryInventoryModel, 'findById').mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(retryInventory),
      } as any);
      jest.spyOn(retryInventoryModel.db, 'startSession').mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      } as any);

      const result = await service.deductRetries('someUserId', 3);
      expect(retryInventory.retries).toBe(2);
      expect(retryInventory.save).toHaveBeenCalled();
      expect(result).toEqual(retryInventory);
    });

    it('should throw BadRequestException if retry inventory not found', async () => {
      jest.spyOn(retryInventoryModel, 'findById').mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(retryInventoryModel.db, 'startSession').mockReturnValue({
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
      const retryInventory = mockRetryInventory(2);
      jest.spyOn(retryInventoryModel, 'findById').mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(retryInventory),
      } as any);
      jest.spyOn(retryInventoryModel.db, 'startSession').mockReturnValue({
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
      const retryInventory = mockRetryInventory(10);
      jest.spyOn(retryInventoryModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(retryInventory),
      } as any);

      const result = await service.getRetries('someUserId');
      expect(result).toBe(10);
    });

    it('should throw BadRequestException if retry inventory not found', async () => {
      jest.spyOn(retryInventoryModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.getRetries('nonExistentUser')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
