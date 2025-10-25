import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { Riddle, RiddleDocument } from '../../../schemas/riddle.schema';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

// Mock the seed and unseed functions from the actual file
const mockSeed = jest.fn();
const mockUnseed = jest.fn();

jest.mock('../riddles.seed', () => ({
  seed: () => mockSeed(),
  unseed: () => mockUnseed(),
}));

describe('Riddles Seed', () => {
  let riddleModel: Model<RiddleDocument>;
  let app;

  const riddlesData = [
    {
      question: 'What has an eye, but cannot see?',
      answer: 'A needle',
      entryFee: '10.00',
      prizePool: '100.00',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      question: 'What is full of holes but still holds water?',
      answer: 'A sponge',
      entryFee: '5.00',
      prizePool: '50.00',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  ];

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock NestFactory and AppModule to get a mock riddleModel
    app = {
      get: jest.fn().mockImplementation((token) => {
        if (token === getModelToken(Riddle.name)) {
          return {
            findOne: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
          };
        }
        return null;
      }),
      close: jest.fn(),
    };
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as any);

    riddleModel = app.get(getModelToken(Riddle.name));

    // Mock bcrypt hash
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedAnswer');

    // Dynamically import the actual seed function to test it
    const { seed } = require('../riddles.seed');
    mockSeed.mockImplementation(seed);
  });

  it('should seed riddles if they do not exist', async () => {
    (riddleModel.findOne as jest.Mock).mockResolvedValue(null); // No existing riddles

    await mockSeed();

    expect(riddleModel.create).toHaveBeenCalledTimes(riddlesData.length);
    expect(riddleModel.create).toHaveBeenCalledWith(expect.objectContaining({
      question: riddlesData[0].question,
      answer: riddlesData[0].answer,
      answerHash: 'hashedAnswer',
      seeded: true,
    }));
    expect(riddleModel.create).toHaveBeenCalledWith(expect.objectContaining({
      question: riddlesData[1].question,
      answer: riddlesData[1].answer,
      answerHash: 'hashedAnswer',
      seeded: true,
    }));
    expect(app.close).toHaveBeenCalled();
  });

  it('should skip riddles that already exist', async () => {
    (riddleModel.findOne as jest.Mock)
      .mockResolvedValueOnce(riddlesData[0]) // First riddle exists
      .mockResolvedValueOnce(null); // Second riddle does not exist

    await mockSeed();

    expect(riddleModel.create).toHaveBeenCalledTimes(1);
    expect(riddleModel.create).toHaveBeenCalledWith(expect.objectContaining({
      question: riddlesData[1].question,
    }));
    expect(app.close).toHaveBeenCalled();
  });

  it('should handle errors during riddle creation', async () => {
    (riddleModel.findOne as jest.Mock).mockResolvedValue(null);
    (riddleModel.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    await mockSeed();

    expect(riddleModel.create).toHaveBeenCalledTimes(riddlesData.length);
    expect(app.close).toHaveBeenCalled();
  });

  it('should unseed riddles', async () => {
    // Dynamically import the actual unseed function to test it
    const { unseed } = require('../riddles.seed');
    mockUnseed.mockImplementation(unseed);

    process.env.NODE_ENV = 'development'; // Allow unseed in test environment
    (riddleModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });

    await mockUnseed();

    expect(riddleModel.deleteMany).toHaveBeenCalledWith({ seeded: true });
    expect(app.close).toHaveBeenCalled();
  });

  it('should not unseed in non-development environment without ALLOW_DB_SEED', async () => {
    // Dynamically import the actual unseed function to test it
    const { unseed } = require('../riddles.seed');
    mockUnseed.mockImplementation(unseed);

    process.env.NODE_ENV = 'production'; // Simulate production environment
    process.env.ALLOW_DB_SEED = 'false';

    await expect(mockUnseed()).rejects.toThrow('Refusing to run unseed in non-development environment. Set NODE_ENV=development or ALLOW_DB_SEED=true to proceed.');
    expect(app.close).not.toHaveBeenCalled();
  });
});