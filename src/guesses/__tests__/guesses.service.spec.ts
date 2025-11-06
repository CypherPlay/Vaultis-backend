import { Test, TestingModule } from '@nestjs/testing';
import { GuessesService } from '../guesses.service';
import { WalletService } from '../../wallet/wallet.service';
import { getModelToken } from '@nestjs/mongoose';
import { Riddle } from '../../schemas/riddle.schema';
import { Model, Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

describe('GuessesService', () => {
  let service: GuessesService;
  let walletService: WalletService;
  let riddleModel: Model<Riddle>;

  const mockWalletService = {
    deductEntryFee: jest.fn(),
  };

  const mockRiddleModel = {
    findById: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<GuessesService>(GuessesService);
    walletService = module.get<WalletService>(WalletService);
    riddleModel = module.get<Model<Riddle>>(getModelToken(Riddle.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitGuess', () => {
    const userId = 'user123';
    const walletAddress = '0xabc';
    const riddleId = new Types.ObjectId().toHexString();
    const submitGuessDto = { riddleId, guess: 'test_guess' };
    const entryFee = 10;

    it('should successfully submit a guess after deducting entry fee', async () => {
      mockRiddleModel.exec.mockResolvedValueOnce({ _id: riddleId, entryFee: entryFee });
      mockWalletService.deductEntryFee.mockResolvedValueOnce(undefined);

      const result = await service.submitGuess(userId, walletAddress, submitGuessDto);

      expect(riddleModel.findById).toHaveBeenCalledWith(riddleId);
      expect(walletService.deductEntryFee).toHaveBeenCalledWith(userId, entryFee);
      expect(result).toEqual({ message: 'Guess submitted successfully (service placeholder)' });
    });

    it('should throw BadRequestException if riddle not found', async () => {
      mockRiddleModel.exec.mockResolvedValueOnce(null);

      await expect(service.submitGuess(userId, walletAddress, submitGuessDto)).rejects.toThrow(BadRequestException);
      expect(walletService.deductEntryFee).not.toHaveBeenCalled();
    });

    it('should rethrow BadRequestException from WalletService', async () => {
      mockRiddleModel.exec.mockResolvedValueOnce({ _id: riddleId, entryFee: entryFee });
      mockWalletService.deductEntryFee.mockRejectedValueOnce(new BadRequestException('Insufficient funds'));

      await expect(service.submitGuess(userId, walletAddress, submitGuessDto)).rejects.toThrow(BadRequestException);
      expect(walletService.deductEntryFee).toHaveBeenCalledWith(userId, entryFee);
    });
  });
});
