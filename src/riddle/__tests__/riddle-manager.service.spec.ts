import { Test, TestingModule } from '@nestjs/testing';
import { RiddleManagerService } from '../riddle-manager.service';
import { RiddleService } from '../riddle.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { RiddleDocument } from '../../schemas/riddle.schema';
import mongoose, { ClientSession, Connection, Model, Query, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { GuessDocument } from '../../schemas/guess.schema';

describe('RiddleManagerService', () => {
  let service: RiddleManagerService;
  let riddleService: RiddleService;
  let schedulerRegistry: SchedulerRegistry;
  let connection: Connection;
  let guessModel: Model<GuessDocument>;

  const mockRiddle: RiddleDocument = {
    _id: '654321098765432109876543',
    question: 'Test Question',
    answerHash: 'hashedAnswer',
            entryFee: Types.Decimal128.fromString('10'),    prizePool: Types.Decimal128.fromString('100'),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: null,
  } as RiddleDocument;

  const mockRiddle2: RiddleDocument = {
    _id: '123456789012345678901234',
    question: 'Test Question 2',
    answerHash: 'hashedAnswer2',
        entryFee: Types.Decimal128.fromString('5'),
    prizePool: new Decimal128('200'),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    lastUsedAt: null,
  } as RiddleDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiddleManagerService,
        {
          provide: RiddleService,
          useValue: {
            findOneEligibleRiddle: jest.fn(),
            updateRiddleMetadata: jest.fn(),
            findCurrentRiddle: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: jest.fn(),
            getCronJob: jest.fn(),
          },
        },
        {
          provide: Connection,
          useValue: {
            startSession: jest.fn().mockResolvedValue({
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              abortTransaction: jest.fn(),
              endSession: jest.fn(),
            }),
          },
        },
        {
          provide: getModelToken('Guess'),
          useValue: {
            countDocuments: jest.fn().mockResolvedValue(5),
          },
        },
        {
          provide: getModelToken('Riddle'),
          useValue: {
            new: jest.fn().mockResolvedValue(mockRiddle),
            constructor: jest.fn().mockResolvedValue(mockRiddle),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
            exec: jest.fn(),
            aggregate: jest.fn(() => ({
              exec: jest.fn().mockResolvedValue([mockRiddle]),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<RiddleManagerService>(RiddleManagerService);
    riddleService = module.get<RiddleService>(RiddleService);
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
    connection = module.get<Connection>(Connection);
    guessModel = module.get<Model<GuessDocument>>(getModelToken('Guess'));

    (service as any).logger = { // Mock the logger
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('rotateRiddle', () => {
    it('should activate a new riddle when no active riddle exists', async () => {
      jest.spyOn(riddleService, 'findCurrentRiddle').mockResolvedValue(null);
      jest.spyOn(riddleService, 'findOneEligibleRiddle').mockResolvedValue(mockRiddle);
      jest.spyOn(riddleService, 'updateRiddleMetadata').mockResolvedValue(mockRiddle);

      await service.rotateRiddle();

      expect(connection.startSession).toHaveBeenCalled();
      expect(connection.startSession().startTransaction).toHaveBeenCalled();
      expect(riddleService.findOneEligibleRiddle).toHaveBeenCalledWith(true, []);
      expect(riddleService.updateRiddleMetadata).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        expect.objectContaining({ expiresAt: expect.any(Date), lastUsedAt: expect.any(Date) }),
        expect.anything(),
      );
      expect(connection.startSession().commitTransaction).toHaveBeenCalled();
      expect(service.getActiveRiddle()).toEqual(mockRiddle);
    });

    it('should expire the current riddle and activate a new one', async () => {
      (service as any).activeRiddle = mockRiddle;
      jest.spyOn(riddleService, 'findOneEligibleRiddle').mockResolvedValue(mockRiddle2);
      jest.spyOn(riddleService, 'updateRiddleMetadata')
        .mockResolvedValueOnce({ ...mockRiddle, expiresAt: new Date(), lastUsedAt: new Date() } as RiddleDocument)
        .mockResolvedValueOnce(mockRiddle2);

      await service.rotateRiddle();

      expect(connection.startSession).toHaveBeenCalled();
      expect(connection.startSession().startTransaction).toHaveBeenCalled();
      expect(riddleService.updateRiddleMetadata).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        expect.objectContaining({ expiresAt: expect.any(Date), lastUsedAt: expect.any(Date) }),
        expect.anything(),
      );
      expect(riddleService.findOneEligibleRiddle).toHaveBeenCalledWith(true, [mockRiddle._id.toString()]);
      expect(riddleService.updateRiddleMetadata).toHaveBeenCalledWith(
        mockRiddle2._id.toString(),
        expect.objectContaining({ expiresAt: expect.any(Date), lastUsedAt: expect.any(Date) }),
        expect.anything(),
      );
      expect(connection.startSession().commitTransaction).toHaveBeenCalled();
      expect(service.getActiveRiddle()).toEqual(mockRiddle2);
    });

    it('should call updatePrizePool with the active session and update prize pool correctly', async () => {
      (service as any).activeRiddle = mockRiddle;
      jest.spyOn(riddleService, 'findOneEligibleRiddle').mockResolvedValue(mockRiddle2);
      jest.spyOn(riddleService, 'updateRiddleMetadata')
        .mockResolvedValueOnce({ ...mockRiddle, expiresAt: new Date(), lastUsedAt: new Date() } as RiddleDocument)
        .mockResolvedValueOnce(mockRiddle2);
      jest.spyOn(riddleService, 'findOne').mockResolvedValue(mockRiddle);
      jest.spyOn(guessModel, 'countDocuments').mockResolvedValue(5);

      await service.rotateRiddle();

      const session = (connection.startSession as jest.Mock).mock.results[0].value; // Get the mocked session

      expect(riddleService.findOne).toHaveBeenCalledWith(mockRiddle._id.toString(), session);
      expect(guessModel.countDocuments).toHaveBeenCalledWith(
        { riddleId: mockRiddle._id },
        { session },
      );
      expect(riddleService.updateRiddleMetadata).toHaveBeenCalledWith(
        mockRiddle._id.toString(),
        { prizePool: Types.Decimal128.fromString((5 * Number(mockRiddle.entryFee.toString())).toString()) },
        session,
      );
      expect(riddleService.findOne).toHaveBeenCalledWith(mockRiddle2._id.toString(), session);
      expect(guessModel.countDocuments).toHaveBeenCalledWith(
        { riddleId: mockRiddle2._id },
        { session },
      );
      expect(riddleService.updateRiddleMetadata).toHaveBeenCalledWith(
        mockRiddle2._id.toString(),
        { prizePool: Types.Decimal128.fromString((5 * Number(mockRiddle2.entryFee.toString())).toString()) },
        session,
      );
    });

    it('should rollback if expiring the current riddle fails', async () => {
      (service as any).activeRiddle = mockRiddle;
      jest.spyOn(riddleService, 'updateRiddleMetadata').mockResolvedValueOnce(null);

      await service.rotateRiddle();

      expect(connection.startSession().abortTransaction).toHaveBeenCalled();
      expect(service.getActiveRiddle()).toBeNull();
    });

    it('should rollback if activating a new riddle fails', async () => {
      jest.spyOn(riddleService, 'findOneEligibleRiddle').mockResolvedValue(mockRiddle);
      jest.spyOn(riddleService, 'updateRiddleMetadata').mockResolvedValueOnce(null);

      await service.rotateRiddle();

      expect(connection.startSession().abortTransaction).toHaveBeenCalled();
      expect(service.getActiveRiddle()).toBeNull();
    });

    it('should rollback if no eligible riddle is found', async () => {
      jest.spyOn(riddleService, 'findOneEligibleRiddle').mockResolvedValue(null);

      await service.rotateRiddle();

      expect(connection.startSession().abortTransaction).toHaveBeenCalled();
      expect(service.getActiveRiddle()).toBeNull();
    });

    it('should handle unexpected errors and rollback', async () => {
      jest.spyOn(riddleService, 'findOneEligibleRiddle').mockRejectedValue(new Error('DB connection lost'));

      await service.rotateRiddle();

      expect(connection.startSession().abortTransaction).toHaveBeenCalled();
      expect(service.getActiveRiddle()).toBeNull();
      expect((service as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error rotating riddle: DB connection lost'),
        expect.any(String),
      );
    });
  });

  describe('onModuleInit', () => {
    it('should call rotateRiddle and schedule cron job on module initialization', async () => {
      const rotateRiddleSpy = jest.spyOn(service, 'rotateRiddle').mockResolvedValue(undefined);
      const addCronJobSpy = jest.spyOn(schedulerRegistry, 'addCronJob');

      await service.onModuleInit();

      expect(rotateRiddleSpy).toHaveBeenCalled();
    });
  });
});
