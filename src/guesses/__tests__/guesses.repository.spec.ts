import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuessesRepository } from '../guesses.repository';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { UserDocument } from '../schemas/user.schema';
import { RiddleDocument } from '../schemas/riddle.schema';

describe('GuessesRepository', () => {
  let repository: GuessesRepository;
  let guessModel: Model<GuessDocument>;

  const mockGuess = {
    _id: '654321098765432109876543',
    user: '123456789012345678901234',
    riddle: '098765432109876543210987',
    guessText: 'test guess',
    isCorrect: true,
    timestamp: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUser = {
    _id: '123456789012345678901234',
  } as unknown as UserDocument;

  const mockRiddle = {
    _id: '098765432109876543210987',
  } as unknown as RiddleDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuessesRepository,
        {
          provide: getModelToken(Guess.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockGuess),
            constructor: jest.fn().mockResolvedValue(mockGuess),
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<GuessesRepository>(GuessesRepository);
    guessModel = module.get<Model<GuessDocument>>(getModelToken(Guess.name));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createGuess', () => {
    it('should create and return a new guess', async () => {
      jest.spyOn(guessModel, 'create').mockResolvedValue(mockGuess as any);

      const result = await repository.createGuess(
        mockUser,
        mockRiddle,
        'test guess',
        true,
      );

      expect(result).toEqual(mockGuess);
      expect(guessModel.create).toHaveBeenCalledWith({
        user: mockUser._id,
        riddle: mockRiddle._id,
        guessText: 'test guess',
        isCorrect: true,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('findByUserAndRiddle', () => {
    it('should find a guess by user and riddle ID', async () => {
      jest.spyOn(guessModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGuess),
      } as any);

      const result = await repository.findByUserAndRiddle(
        mockUser._id,
        mockRiddle._id,
      );

      expect(result).toEqual(mockGuess);
      expect(guessModel.findOne).toHaveBeenCalledWith({
        user: mockUser._id,
        riddle: mockRiddle._id,
      });
    });

    it('should return null if guess not found', async () => {
      jest.spyOn(guessModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.findByUserAndRiddle(
        mockUser._id,
        mockRiddle._id,
      );

      expect(result).toBeNull();
    });
  });

  describe('updateWinnerStatus', () => {
    it('should update the winner status of a guess', async () => {
      jest.spyOn(guessModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGuess),
      } as any);

      const result = await repository.updateWinnerStatus(mockGuess._id, true);

      expect(result).toEqual(mockGuess);
      expect(guessModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGuess._id,
        { isWinner: true },
        { new: true },
      );
    });

    it('should return null if guess not found for update', async () => {
      jest.spyOn(guessModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await repository.updateWinnerStatus(mockGuess._id, true);

      expect(result).toBeNull();
    });
  });
});
