import { Test, TestingModule } from '@nestjs/testing';
import { RiddleService, UpdateRiddleDto } from '../riddle.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { RiddleDocument } from '../../schemas/riddle.schema';

describe('RiddleService', () => {
  let service: RiddleService;
  let model: Model<RiddleDocument>;

  const mockRiddle: RiddleDocument = {
    _id: '654321098765432109876543',
    question: 'Test Question',
    entryFee: 10,
    prizePool: 100,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: null,
  } as RiddleDocument;

  const mockRiddleWithSensitive: RiddleDocument = {
    ...mockRiddle,
    answer: 'Test Answer',
    answerHash: 'hashedAnswer',
  } as RiddleDocument;

  const mockRiddle2: RiddleDocument = {
    _id: '123456789012345678901234',
    question: 'Test Question 2',
    entryFee: 20,
    prizePool: 200,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: new Date(Date.now() - 86400000 * 10), // 10 days ago
  } as RiddleDocument;

  const mockRiddle3: RiddleDocument = {
    _id: 'abcdefabcdefabcdefabcdef',
    question: 'Test Question 3',
    entryFee: 30,
    prizePool: 300,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: new Date(), // Used recently
  } as RiddleDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiddleService,
        {
          provide: getModelToken('Riddle'),
          useValue: {
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            aggregate: jest.fn(() => ({
              exec: jest.fn().mockResolvedValue([mockRiddle]),
            })),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RiddleService>(RiddleService);
    model = module.get<Model<RiddleDocument>>(getModelToken('Riddle'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a riddle by ID without sensitive fields by default', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRiddle),
      } as any);

      const result = await service.findOne(mockRiddle._id.toString());
      expect(result).toEqual(mockRiddle);
      // Verify that sensitive fields are not present (due to select: false in schema)
      expect(result.answer).toBeUndefined();
      expect(result.answerHash).toBeUndefined();
    });

    it('should return null if riddle is not found', async () => {
      jest
        .spyOn(model, 'findById')
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

      const result = await service.findOne('nonexistentId');
      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a riddle by ID without sensitive fields by default', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRiddleWithSensitive),
      } as any);

      const result = await service.findOne(mockRiddle._id.toString());
      expect(result).toEqual(mockRiddleWithSensitive);
      // Verify that sensitive fields are not present (due to select: false in schema)
      expect(result.answer).toBeUndefined();
      expect(result.answerHash).toBeUndefined();
    });

    it('should return null if riddle is not found', async () => {
      jest
        .spyOn(model, 'findById')
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

      const result = await service.findOne('nonexistentId');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all riddles without sensitive fields by default', async () => {
      jest.spyOn(model, 'find').mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValue([mockRiddleWithSensitive, mockRiddle2]),
      } as any);

      const result = await service.findAll();
      expect(result).toEqual([mockRiddleWithSensitive, mockRiddle2]);
      expect(result[0].answer).toBeUndefined();
      expect(result[0].answerHash).toBeUndefined();
      expect(result[1].answer).toBeUndefined();
      expect(result[1].answerHash).toBeUndefined();
    });
  });

  describe('findOneEligibleRiddle', () => {
    it('should return a random eligible riddle excluding specified IDs', async () => {
      jest.spyOn(model, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRiddle2]),
      } as any);

      const result = await service.findOneEligibleRiddle(true, [
        mockRiddle._id.toString(),
      ]);
      expect(result).toEqual(mockRiddle2);
      expect(model.aggregate).toHaveBeenCalledWith([
        {
          $match: expect.objectContaining({
            _id: { $nin: [mockRiddle._id.toString()] },
            disabled: { $ne: true },
          }),
        },
        { $sample: { size: 1 } },
      ]);
    });

    it('should return an eligible riddle that has not been used recently', async () => {
      jest.spyOn(model, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRiddle2]),
      } as any);

      const result = await service.findOneEligibleRiddle(true, []);
      expect(result).toEqual(mockRiddle2);
      expect(model.aggregate).toHaveBeenCalledWith([
        {
          $match: expect.objectContaining({
            $or: [
              { lastUsedAt: { $lt: expect.any(Date) } },
              { lastUsedAt: null },
            ],
          }),
        },
        { $sample: { size: 1 } },
      ]);
    });

    it('should return null if no eligible riddle is found', async () => {
      jest.spyOn(model, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.findOneEligibleRiddle(true, []);
      expect(result).toBeNull();
    });
  });

  describe('updateRiddleMetadata', () => {
    it('should update riddle metadata and return the updated document', async () => {
      const updateDto: UpdateRiddleDto = {
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      };
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(mockRiddle);

      const result = await service.updateRiddleMetadata(
        mockRiddle._id.toString(),
        updateDto,
      );
      expect(result).toEqual(mockRiddle);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        updateDto,
        { new: true, session: null },
      );
    });

    it('should return null if the riddle to update is not found', async () => {
      const updateDto: UpdateRiddleDto = {
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      };
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(null);

      const result = await service.updateRiddleMetadata(
        mockRiddle._id.toString(),
        updateDto,
      );
      expect(result).toBeNull();
    });

    it('should pass the session to findByIdAndUpdate if provided', async () => {
      const updateDto: UpdateRiddleDto = {
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      };
      const mockSession = { some: 'session' };
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(mockRiddle);

      await service.updateRiddleMetadata(
        mockRiddle._id.toString(),
        updateDto,
        mockSession,
      );
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        updateDto,
        { new: true, session: mockSession },
      );
    });
  });
});
