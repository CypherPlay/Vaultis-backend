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
    updateOne: jest.fn().mockReturnThis(),
    exec: jest.fn(),
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
    const sharedSaveMock = jest.fn().mockResolvedValue(undefined);
    mockGuessModel.save = sharedSaveMock;

    // Mock the constructor of Guess model to return the mockGuessModel
    jest.spyOn(service as any, 'guessModel', 'get').mockReturnValue(
      jest.fn().mockImplementation((data) => ({
        ...data,
        save: sharedSaveMock, // Each instance has its own save method
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
        exec: jest.fn(),
      };
  
      const mockUser = {
        _id: userId,
        balance: new Types.Decimal128('1000'),
        solvedRiddles: [],
        session: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      };
  
      beforeEach(() => {
        mockRiddle.status = 'active'; // Reset riddle status for each test
        mockRiddleModel.findById.mockReturnThis();
        mockRiddleModel.select.mockReturnThis();
        mockRiddleModel.session.mockReturnThis();
        mockRiddleModel.exec.mockResolvedValue(mockRiddle);
  
        mockUserModel.findById.mockReturnThis();
        mockUserModel.session.mockReturnThis();
        mockUserModel.exec.mockResolvedValue(mockUser);
  
        mockWalletService.deductEntryFee.mockResolvedValue(undefined);
        mockGuessModel.create.mockResolvedValue({ save: jest.fn().mockResolvedValue(undefined) }); // Mock create to return an object with a save method
        mockRiddleModel.updateOne.mockReturnThis();
        mockRiddleModel.exec.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
        mockUserModel.updateOne.mockReturnThis();
        mockUserModel.exec.mockResolvedValue({ nModified: 1 });
        mockConnection.startSession.mockResolvedValue(mockSession);
        mockSession.startTransaction.mockClear();
        mockSession.commitTransaction.mockClear();
        mockSession.abortTransaction.mockClear();
        mockSession.endSession.mockClear();
      });
  
      it('should successfully submit an incorrect guess after deducting entry fee', async () => {
        const submitGuessDto = { riddleId, guess: 'wrong answer' };
  
        const result = await service.submitGuess(userId, walletAddress, submitGuessDto);
  
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).toHaveBeenCalledWith(userId, parseFloat(entryFee.toString()), mockSession);
        expect(mockGuessModel.create).toHaveBeenCalledWith(
          {
            user: mockUser,
            riddle: mockRiddle,
            guess: 'wrong answer',
            isCorrect: false,
          },
          { session: mockSession }
        );
        expect(mockSession.commitTransaction).toHaveBeenCalled();
        expect(mockRiddleModel.updateOne).not.toHaveBeenCalled(); // Should not update riddle for winning
        expect(mockUserModel.updateOne).not.toHaveBeenCalled(); // Should not update user for winning
        expect(result).toEqual({ message: 'Guess submitted successfully' });
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should throw BadRequestException if riddle not found', async () => {
        mockRiddleModel.exec.mockResolvedValueOnce(null);
  
        await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).not.toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should throw BadRequestException if riddle is already solved', async () => {
        mockRiddle.status = 'solved';
        mockRiddleModel.exec.mockResolvedValueOnce(mockRiddle);
  
        await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).not.toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should throw BadRequestException if user not found', async () => {
        mockUserModel.exec.mockResolvedValueOnce(null);
  
        await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should rethrow BadRequestException from WalletService and abort transaction', async () => {
        mockWalletService.deductEntryFee.mockRejectedValueOnce(new BadRequestException('Insufficient funds'));
  
        await expect(service.submitGuess(userId, walletAddress, { riddleId, guess: 'any' })).rejects.toThrow(BadRequestException);
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).toHaveBeenCalledWith(userId, parseFloat(entryFee.toString()), mockSession);
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should successfully submit a correct guess, mark user as winner, and update riddle', async () => {
        const submitGuessDto = { riddleId, guess: 'correct answer' };
  
        const result = await service.submitGuess(userId, walletAddress, submitGuessDto);
  
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).toHaveBeenCalledWith(userId, parseFloat(entryFee.toString()), mockSession);
        expect(mockGuessModel.create).toHaveBeenCalledWith(
          {
            user: mockUser,
            riddle: mockRiddle,
            guess: 'correct answer',
            isCorrect: true,
          },
          { session: mockSession }
        );
        expect(mockRiddleModel.updateOne).toHaveBeenCalledWith(
          { _id: riddleId, status: 'active' },
          { $set: { winnerId: new Types.ObjectId(userId), status: 'solved' } },
          { session: mockSession }
        );
        expect(mockUserModel.updateOne).toHaveBeenCalledWith(
          { _id: userId },
          { $inc: { balance: parseFloat(prizePool.toString()) }, $push: { solvedRiddles: riddleId } },
          { session: mockSession }
        );
        expect(mockSession.commitTransaction).toHaveBeenCalled();
        expect(result).toEqual({ message: 'Congratulations! You solved the riddle and won the prize!' });
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should abort transaction if an error occurs during winning logic', async () => {
        const submitGuessDto = { riddleId, guess: 'correct answer' };
        mockUserModel.updateOne.mockReturnValueOnce({ exec: jest.fn().mockRejectedValueOnce(new Error('Database error')) });
  
        await expect(service.submitGuess(userId, walletAddress, submitGuessDto)).rejects.toThrow('Database error');
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).toHaveBeenCalled();
        expect(mockGuessModel.create).toHaveBeenCalled();
        expect(mockRiddleModel.updateOne).toHaveBeenCalled();
        expect(mockUserModel.updateOne).toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should abort transaction if riddle update fails due to concurrent solve', async () => {
        const submitGuessDto = { riddleId, guess: 'correct answer' };
        mockRiddleModel.exec.mockResolvedValueOnce({ ...mockRiddle, status: 'active' }); // Ensure riddle is active initially
        mockRiddleModel.updateOne.mockReturnThis();
        mockRiddleModel.exec.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 }); // Simulate no modification
  
        await expect(service.submitGuess(userId, walletAddress, submitGuessDto)).rejects.toThrow(BadRequestException);
        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockWalletService.deductEntryFee).toHaveBeenCalled();
        expect(mockGuessModel.create).toHaveBeenCalled();
        expect(mockRiddleModel.updateOne).toHaveBeenCalled();
        expect(mockUserModel.updateOne).not.toHaveBeenCalled(); // User update should not be called
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should handle correct guess with different casing and punctuation', async () => {
        const submitGuessDto = { riddleId, guess: 'Correct Answer!' };
        mockRiddle.answer = 'correct answer';
  
        const result = await service.submitGuess(userId, walletAddress, submitGuessDto);
  
        expect(mockGuessModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect: true,
          }),
          expect.anything()
        );
        expect(result).toEqual({ message: 'Congratulations! You solved the riddle and won the prize!' });
      });
  
      it('should handle incorrect guess with different casing and punctuation', async () => {
        const submitGuessDto = { riddleId, guess: 'Wrong Answer!' };
        mockRiddle.answer = 'correct answer';
  
        const result = await service.submitGuess(userId, walletAddress, submitGuessDto);
  
        expect(mockGuessModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect: false,
          }),
          expect.anything()
        );
        expect(result).toEqual({ message: 'Guess submitted successfully' });
      });
  
      it('should call leaderboardService.calculateDailyRankings after a correct guess, even if it fails', async () => {
        const submitGuessDto = { riddleId, guess: 'correct answer' };
        jest.spyOn(service as any, 'leaderboardService').mockImplementationOnce({
          calculateDailyRankings: jest.fn().mockRejectedValueOnce(new Error('Leaderboard error')),
        });
  
        const result = await service.submitGuess(userId, walletAddress, submitGuessDto);
  
        expect(mockSession.commitTransaction).toHaveBeenCalled(); // Main transaction should still commit
        expect(service['leaderboardService'].calculateDailyRankings).toHaveBeenCalled();
        expect(result).toEqual({ message: 'Congratulations! You solved the riddle and won the prize!' });
        expect(mockSession.endSession).toHaveBeenCalled();
      });
  
      it('should not call leaderboardService.calculateDailyRankings after an incorrect guess', async () => {
        const submitGuessDto = { riddleId, guess: 'wrong answer' };
        jest.spyOn(service as any, 'leaderboardService').mockImplementationOnce({
          calculateDailyRankings: jest.fn().mockResolvedValue(undefined),
        });
  
        await service.submitGuess(userId, walletAddress, submitGuessDto);
  
        expect(service['leaderboardService'].calculateDailyRankings).not.toHaveBeenCalled();
      });
    });
  });
