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
    answerHash: 'hashedAnswer',
    entryFee: 10,
    prizePool: 100,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: null,
  } as RiddleDocument;

  const mockRiddle2: RiddleDocument = {
    _id: '123456789012345678901234',
    question: 'Test Question 2',
    answerHash: 'hashedAnswer2',
    entryFee: 20,
    prizePool: 200,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: new Date(Date.now() - 86400000 * 10), // 10 days ago
  } as RiddleDocument;

  const mockRiddle3: RiddleDocument = {
    _id: 'abcdefabcdefabcdefabcdef',
    question: 'Test Question 3',
    answerHash: 'hashedAnswer3',
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

  describe('findOneEligibleRiddle', () => {
    it('should return a random eligible riddle excluding specified IDs', async () => {
      jest.spyOn(model, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRiddle2]),
      } as any);

      const result = await service.findOneEligibleRiddle(true, [mockRiddle._id.toString()]);
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
      const updateDto: UpdateRiddleDto = { expiresAt: new Date(), lastUsedAt: new Date() };
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(mockRiddle);

      const result = await service.updateRiddleMetadata(mockRiddle._id.toString(), updateDto);
      expect(result).toEqual(mockRiddle);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        updateDto,
        { new: true, session: null },
      );
    });

    it('should return null if the riddle to update is not found', async () => {
      const updateDto: UpdateRiddleDto = { expiresAt: new Date(), lastUsedAt: new Date() };
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(null);

      const result = await service.updateRiddleMetadata(mockRiddle._id.toString(), updateDto);
      expect(result).toBeNull();
    });

    it('should pass the session to findByIdAndUpdate if provided', async () => {
      const updateDto: UpdateRiddleDto = { expiresAt: new Date(), lastUsedAt: new Date() };
      const mockSession = { some: 'session' };
      jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(mockRiddle);

      await service.updateRiddleMetadata(mockRiddle._id.toString(), updateDto, mockSession);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        updateDto,
        { new: true, session: mockSession },
      );
    });
  });
});
