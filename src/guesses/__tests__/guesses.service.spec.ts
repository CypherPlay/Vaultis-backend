import { Test, TestingModule } from '@nestjs/testing';
import { GuessesService } from '../guesses.service';
import { WalletService } from '../../wallet/wallet.service';
import { getModelToken } from '@nestjs/mongoose';
import { Riddle } from '../../schemas/riddle.schema';
import { Guess } from '../../schemas/guess.schema';
import { User } from '../../schemas/user.schema';
import { Model, Types, Connection } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

describe('GuessesService', () => {
  let service: GuessesService;
  let walletService: WalletService;
  let riddleModel: Model<Riddle>;
  let guessModel: Model<Guess>;
  let userModel: Model<User>;
  let connection: Connection;

  const mockWalletService = {
    deductEntryFee: jest.fn(),
  };

  const mockRiddleModel = {
    findById: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockGuessModel = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserModel = {
    updateOne: jest.fn(),
  };

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue(mockSession),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuessesService,
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: getModelToken(Riddle.name),
          useValue: mockRiddleModel,
        },
        {
          provide: getModelToken(Guess.name),
          useValue: mockGuessModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: 'DbConnection', // This token is used by @InjectConnection()
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<GuessesService>(GuessesService);
    walletService = module.get<WalletService>(WalletService);
    riddleModel = module.get<Model<Riddle>>(getModelToken(Riddle.name));
    guessModel = module.get<Model<Guess>>(getModelToken(Guess.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
    connection = module.get<Connection>('DbConnection');

    // Mock the constructor of Guess model to return the mockGuessModel
    jest.spyOn(service as any, 'guessModel', 'get').mockReturnValue(
      jest.fn().mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(data), // Each instance has its own save method
      })) as any
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitGuess', () => {
    const userId = new Types.ObjectId().toHexString();
    const walletAddress = '0xabc';
    const riddleId = new Types.ObjectId().toHexString();
    const entryFee = new Types.Decimal128('10');
    const prizePool = new Types.Decimal128('100');

    const mockRiddle = {
      _id: riddleId,
      entryFee: entryFee,
      answer: 'correct answer',
      prizePool: prizePool,
      status: 'active',
      select: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(this),
    };

    beforeEach(() => {
      mockRiddleModel.findById.mockReturnThis();
      mockRiddleModel.select.mockReturnThis();
      mockRiddleModel.session.mockReturnThis();
      mockRiddleModel.exec.mockResolvedValue(mockRiddle);
      mockWalletService.deductEntryFee.mockResolvedValue(undefined);
      mockGuessModel.save.mockResolvedValue(undefined);
      mockRiddleModel.updateOne.mockReturnThis();
      mockRiddleModel.exec.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
      mockUserModel.updateOne.mockReturnThis();
      mockUserModel.exec.mockResolvedValue({ nModified: 1 });
      mockConnection.startSession.mockResolvedValue(mockSession);
    });

    it('should successfully submit an incorrect guess after deducting entry fee', async () => {
      const submitGuessDto = { riddleId, guess: 'wrong answer' };

      const result = await service.submitGuess(userId, walletAddress, submitGuessDto);

      expect(mockWalletService.deductEntryFee).toHaveBeenCalledWith(userId, parseFloat(entryFee.toString()), mockSession);
      expect(mockGuessModel.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockRiddleModel.updateOne).not.toHaveBeenCalled(); // Should not update riddle for winning
      expect(mockUserModel.updateOne).not.toHaveBeenCalled(); // Should not update user for winning
      expect(result).toEqual({ message: 'Guess submitted successfully' });
    });

    it('should throw BadRequestException if riddle not found', async () => {
      mockRiddleModel.exec.mockResolvedValueOnce(null);

      await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
      expect(mockWalletService.deductEntryFee).not.toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw BadRequestException if riddle is already solved', async () => {
      mockRiddle.status = 'solved';
      mockRiddleModel.exec.mockResolvedValueOnce(mockRiddle);

      await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
      expect(mockWalletService.deductEntryFee).not.toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should rethrow BadRequestException from WalletService and abort transaction', async () => {
      mockWalletService.deductEntryFee.mockRejectedValueOnce(new BadRequestException('Insufficient funds'));

      await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
      expect(mockWalletService.deductEntryFee).toHaveBeenCalledWith(userId, parseFloat(entryFee.toString()), mockSession);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should successfully submit a correct guess, mark user as winner, and update riddle', async () => {
      const submitGuessDto = { riddleId, guess: 'correct answer' };

      const result = await service.submitGuess(userId, walletAddress, submitGuessDto);

      expect(mockWalletService.deductEntryFee).toHaveBeenCalledWith(userId, parseFloat(entryFee.toString()), mockSession);
      expect(mockGuessModel.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockRiddleModel.updateOne).toHaveBeenCalledWith(
        { _id: riddleId, status: 'active' },
        { $set: { winnerId: new Types.ObjectId(userId), status: 'solved' } },
        { session: mockSession }
      );
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        { $inc: { balance: prizePool.valueOf() }, $push: { solvedRiddles: riddleId } },
        { session: mockSession }
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Congratulations! You solved the riddle and won the prize!' });
    });

    it('should abort transaction if an error occurs during winning logic', async () => {
      const submitGuessDto = { riddleId, guess: 'correct answer' };
      mockUserModel.updateOne.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.submitGuess(userId, walletAddress, submitGuessDto)).rejects.toThrow('Database error');
      expect(mockWalletService.deductEntryFee).toHaveBeenCalled();
      expect(mockGuessModel.save).toHaveBeenCalled();
      expect(mockRiddleModel.updateOne).toHaveBeenCalled();
      expect(mockUserModel.updateOne).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
