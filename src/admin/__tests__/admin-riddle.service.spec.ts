import { Test, TestingModule } from '@nestjs/testing';
import { AdminRiddleService } from '../admin-riddle.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Riddle, RiddleDocument } from '../../schemas/riddle.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AdminCreateRiddleDto } from '../dto/admin-create-riddle.dto';
import { AdminUpdateRiddleDto } from '../dto/admin-update-riddle.dto';
import { FinalizePrizeDto } from '../dto/finalize-prize.dto';

// Mock RiddleDocument and UserDocument interfaces
const mockRiddle: (status?: string, winnerId?: string | null, winnerAddress?: string | null) => Partial<RiddleDocument> = (
  status = 'active',
  winnerId = null,
  winnerAddress = null,
) => ({
  _id: new Types.ObjectId().toHexString(),
  question: 'Test Question',
  answerHash: 'hashedAnswer',
  entryFee: Types.Decimal128.fromString('10'),
  prizePool: Types.Decimal128.fromString('0'),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
  status: status,
  winnerId: winnerId,
  winnerAddress: winnerAddress,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
});

const mockUser: (walletAddress?: string) => Partial<UserDocument> = (walletAddress = '0xWinnerAddress') => ({
  _id: new Types.ObjectId().toHexString(),
  walletAddress: walletAddress,
  username: 'testuser',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
});

describe('AdminRiddleService', () => {
  let service: AdminRiddleService;
  let riddleModel: Model<RiddleDocument>;
  let userModel: Model<UserDocument>;

  const mockRiddleModel = {
    new: jest.fn().mockImplementation(dto => ({
      ...dto,
      save: jest.fn().mockResolvedValue(dto),
    })),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    exec: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRiddleService,
        {
          provide: getModelToken(Riddle.name),
          useValue: mockRiddleModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<AdminRiddleService>(AdminRiddleService);
    riddleModel = module.get<Model<RiddleDocument>>(getModelToken(Riddle.name));
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRiddle', () => {
    const createRiddleDto: AdminCreateRiddleDto = {
      question: 'New Riddle Question',
      answer: 'New Answer',
      value: 100,
      expiresAt: new Date().toISOString(),
    };

    it('should successfully create a riddle', async () => {
      const newRiddle = mockRiddle();
      jest.spyOn(riddleModel, 'new').mockReturnValue(newRiddle as any);

      const result = await service.createRiddle(createRiddleDto);

      expect(riddleModel.new).toHaveBeenCalledWith(
        expect.objectContaining({
          question: createRiddleDto.question,
          answerHash: crypto.createHash('sha256').update(createRiddleDto.answer).digest('hex'),
          entryFee: Types.Decimal128.fromString(createRiddleDto.value.toString()),
          prizePool: Types.Decimal128.fromString('0'),
          status: 'active',
        }),
      );
      expect(newRiddle.save).toHaveBeenCalled();
      expect(result).toEqual(newRiddle);
    });
  });

  describe('updateRiddle', () => {
    const riddleId = new Types.ObjectId().toHexString();
    const updateRiddleDto: AdminUpdateRiddleDto = {
      question: 'Updated Question',
      value: 200,
    };

    it('should successfully update a riddle', async () => {
      const existingRiddle = mockRiddle() as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingRiddle),
      } as any);

      const result = await service.updateRiddle(riddleId, updateRiddleDto);

      expect(riddleModel.findById).toHaveBeenCalledWith(riddleId);
      expect(existingRiddle.question).toBe(updateRiddleDto.question);
      expect(existingRiddle.entryFee).toEqual(Types.Decimal128.fromString(updateRiddleDto.value.toString()));
      expect(existingRiddle.save).toHaveBeenCalled();
      expect(result).toEqual(existingRiddle);
    });

    it('should throw NotFoundException if riddle does not exist', async () => {
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.updateRiddle(riddleId, updateRiddleDto)).rejects.toThrow(
        new NotFoundException(`Riddle with ID ${riddleId} not found`),
      );
    });

    it('should throw BadRequestException if riddle is completed', async () => {
      const existingRiddle = mockRiddle('completed') as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingRiddle),
      } as any);

      await expect(service.updateRiddle(riddleId, updateRiddleDto)).rejects.toThrow(
        new BadRequestException(`Riddle with ID ${riddleId} cannot be updated as it is already completed`),
      );
    });

    it('should throw BadRequestException if riddle is solved', async () => {
      const existingRiddle = mockRiddle('solved') as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingRiddle),
      } as any);

      await expect(service.updateRiddle(riddleId, updateRiddleDto)).rejects.toThrow(
        new BadRequestException(`Riddle with ID ${riddleId} cannot be updated as it is already solved`),
      );
    });

    it('should update answerHash if answer is provided', async () => {
      const existingRiddle = mockRiddle() as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingRiddle),
      } as any);

      const updateDtoWithAnswer: AdminUpdateRiddleDto = {
        answer: 'New Updated Answer',
      };

      await service.updateRiddle(riddleId, updateDtoWithAnswer);

      expect(existingRiddle.answerHash).toBe(
        crypto.createHash('sha256').update(updateDtoWithAnswer.answer).digest('hex'),
      );
      expect(existingRiddle.save).toHaveBeenCalled();
    });

    it('should update entryFee if value is provided', async () => {
      const existingRiddle = mockRiddle() as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingRiddle),
      } as any);

      const updateDtoWithValue: AdminUpdateRiddleDto = {
        value: 300,
      };

      await service.updateRiddle(riddleId, updateDtoWithValue);

      expect(existingRiddle.entryFee).toEqual(Types.Decimal128.fromString(updateDtoWithValue.value.toString()));
      expect(existingRiddle.save).toHaveBeenCalled();
    });
  });

  describe('finalizePrize', () => {
    const riddleId = new Types.ObjectId().toHexString();
    const winnerUserId = new Types.ObjectId().toHexString();
    const finalizePrizeDto: FinalizePrizeDto = {
      winnerAddress: '0xWinnerAddress',
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
      date: new Date().toISOString(),
    };

    it('should successfully finalize a prize', async () => {
      const solvedRiddle = mockRiddle('solved', winnerUserId, null) as any;
      const winnerUser = mockUser(finalizePrizeDto.winnerAddress) as any;

      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(solvedRiddle),
      } as any);
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(winnerUser),
      } as any);

      const result = await service.finalizePrize(riddleId, finalizePrizeDto);

      expect(riddleModel.findById).toHaveBeenCalledWith(riddleId);
      expect(userModel.findById).toHaveBeenCalledWith(winnerUserId);
      expect(solvedRiddle.prizePayoutHash).toBe(finalizePrizeDto.transactionHash);
      expect(solvedRiddle.status).toBe('completed');
      expect(solvedRiddle.winnerAddress).toBe(finalizePrizeDto.winnerAddress);
      expect(solvedRiddle.completedAt).toEqual(new Date(finalizePrizeDto.date));
      expect(solvedRiddle.save).toHaveBeenCalled();
      expect(result).toEqual(solvedRiddle);
    });

    it('should throw NotFoundException if riddle does not exist', async () => {
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.finalizePrize(riddleId, finalizePrizeDto)).rejects.toThrow(
        new NotFoundException(`Riddle with ID ${riddleId} not found`),
      );
    });

    it('should throw BadRequestException if riddle is not in solved status', async () => {
      const activeRiddle = mockRiddle('active', winnerUserId, null) as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(activeRiddle),
      } as any);

      await expect(service.finalizePrize(riddleId, finalizePrizeDto)).rejects.toThrow(
        new BadRequestException(`Riddle with ID ${riddleId} is not in 'solved' status.`),
      );
    });

    it('should throw BadRequestException if riddle does not have a winner ID', async () => {
      const solvedRiddleNoWinner = mockRiddle('solved', null, null) as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(solvedRiddleNoWinner),
      } as any);

      await expect(service.finalizePrize(riddleId, finalizePrizeDto)).rejects.toThrow(
        new BadRequestException(`Riddle with ID ${riddleId} does not have a winner ID.`),
      );
    });

    it('should throw BadRequestException if winner user not found', async () => {
      const solvedRiddle = mockRiddle('solved', winnerUserId, null) as any;
      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(solvedRiddle),
      } as any);
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.finalizePrize(riddleId, finalizePrizeDto)).rejects.toThrow(
        new BadRequestException(`Winner user with ID ${solvedRiddle.winnerId} not found.`),
      );
    });

    it('should throw BadRequestException if provided winner address does not match stored winner address', async () => {
      const solvedRiddle = mockRiddle('solved', winnerUserId, null) as any;
      const winnerUser = mockUser('0xMismatchAddress') as any; // Mismatch address

      jest.spyOn(riddleModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(solvedRiddle),
      } as any);
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(winnerUser),
      } as any);

      await expect(service.finalizePrize(riddleId, finalizePrizeDto)).rejects.toThrow(
        new BadRequestException(
          `Provided winner address ${finalizePrizeDto.winnerAddress} does not match the stored winner address for user ${winnerUser._id}.`,
        ),
      );
    });
  });
});
