import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockchainEventRepository } from '../blockchain-event.repository';
import { BlockchainEvent, BlockchainEventDocument } from '../../schemas/blockchain-event.schema';

const mockBlockchainEvent = {
  txHash: '0x123',
  eventType: 'TestEvent',
  userId: 'user123',
  data: { value: 'test' },
  blockNumber: 123,
};

describe('BlockchainEventRepository', () => {
  let repository: BlockchainEventRepository;
  let model: Model<BlockchainEventDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainEventRepository,
        {
          provide: getModelToken(BlockchainEvent.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockBlockchainEvent),
            constructor: jest.fn().mockResolvedValue(mockBlockchainEvent),
            findOne: jest.fn(),
            find: jest.fn(),
            sort: jest.fn().mockReturnThis(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<BlockchainEventRepository>(BlockchainEventRepository);
    model = module.get<Model<BlockchainEventDocument>>(
      getModelToken(BlockchainEvent.name),
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should create a blockchain event', async () => {
    jest.spyOn(model, 'save').mockResolvedValue(mockBlockchainEvent as BlockchainEventDocument);
    jest.spyOn(model, 'constructor').mockImplementation(() => ({ save: jest.fn().mockResolvedValue(mockBlockchainEvent) }));

    const result = await repository.create(mockBlockchainEvent);
    expect(result).toEqual(mockBlockchainEvent);
  });

  it('should find an event by txHash', async () => {
    jest.spyOn(model, 'findOne').mockReturnValue({ exec: jest.fn().mockResolvedValue(mockBlockchainEvent) } as any);
    const result = await repository.findByTxHash('0x123');
    expect(result).toEqual(mockBlockchainEvent);
  });

  it('should find events by userId', async () => {
    jest.spyOn(model, 'find').mockReturnValue({ exec: jest.fn().mockResolvedValue([mockBlockchainEvent]) } as any);
    const result = await repository.findByUserId('user123');
    expect(result).toEqual([mockBlockchainEvent]);
  });

  it('should find events by blockNumber', async () => {
    jest.spyOn(model, 'find').mockReturnValue({ exec: jest.fn().mockResolvedValue([mockBlockchainEvent]) } as any);
    const result = await repository.findByBlockNumber(123);
    expect(result).toEqual([mockBlockchainEvent]);
  });

  it('should find the latest block number', async () => {
    jest.spyOn(model, 'findOne').mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mockBlockchainEvent) } as any);
    const result = await repository.findLatestBlockNumber();
    expect(result).toEqual(123);
  });

  it('should return null if no latest block number', async () => {
    jest.spyOn(model, 'findOne').mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) } as any);
    const result = await repository.findLatestBlockNumber();
    expect(result).toBeNull();
  });
});
