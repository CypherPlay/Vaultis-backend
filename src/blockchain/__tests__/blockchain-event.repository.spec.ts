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
          useValue: (() => {
            const mockBlockchainEventInstance = {
              save: jest.fn().mockResolvedValue(mockBlockchainEvent),
            };
            const mockBlockchainEventModel = {
              findOne: jest.fn(),
              find: jest.fn(),
              sort: jest.fn().mockReturnThis(),
              exec: jest.fn(),
              aggregate: jest.fn(),
            };
            const mockModel = jest.fn(() => mockBlockchainEventInstance);
            Object.assign(mockModel, mockBlockchainEventModel);
            return mockModel;
          })(),
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
    const createdEvent = await repository.create(mockBlockchainEvent);
    expect(model).toHaveBeenCalledWith(mockBlockchainEvent);
    const savedInstance = model.mock.results[0].value;
    expect(savedInstance.save).toHaveBeenCalled();
    expect(createdEvent).toEqual(mockBlockchainEvent);
  });

  it('should find an event by txHash', async () => {
    expect(model.find).toHaveBeenCalledWith({ txHash: '0x123' });
    (model.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([mockBlockchainEvent]) });
    const result = await repository.findByTxHash('0x123');
    expect(result).toEqual([mockBlockchainEvent]);
  });

  it('should find events by userId', async () => {
    expect(model.find).toHaveBeenCalledWith({ userId: 'user123' });
    (model.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([mockBlockchainEvent]) });
    const result = await repository.findByUserId('user123');
    expect(result).toEqual([mockBlockchainEvent]);
  });

  it('should find events by blockNumber', async () => {
    expect(model.find).toHaveBeenCalledWith({ blockNumber: 123 });
    (model.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([mockBlockchainEvent]) });
    const result = await repository.findByBlockNumber(123);
    expect(result).toEqual([mockBlockchainEvent]);
  });

  it('should find the latest block number', async () => {
    expect(model.findOne).toHaveBeenCalledWith({});
    expect(model.sort).toHaveBeenCalledWith({ blockNumber: -1 });
    (model.findOne as jest.Mock).mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mockBlockchainEvent) });
    const result = await repository.findLatestBlockNumber();
    expect(result).toEqual(123);
  });

  it('should return null if no latest block number', async () => {
    expect(model.findOne).toHaveBeenCalledWith({});
    expect(model.sort).toHaveBeenCalledWith({ blockNumber: -1 });
    (model.findOne as jest.Mock).mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) });
    const result = await repository.findLatestBlockNumber();
    expect(result).toBeNull();
  });
});
