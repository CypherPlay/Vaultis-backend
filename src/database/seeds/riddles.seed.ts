import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Riddle, RiddleDocument } from '../../schemas/riddle.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

function validateAndConvertDecimal(
  value: string,
  riddleQuestion: string,
  fieldName: string,
): Types.Decimal128 {
  const trimmedValue = value.trim();
  const numericPattern = /^\d+(?:\.\d+)?$/;
  if (!trimmedValue || !numericPattern.test(trimmedValue)) {
    throw new Error(
      `Invalid ${fieldName} format for riddle "${riddleQuestion}": "${value}". Must be a non-empty numeric string.`,
    );
  }
  return Types.Decimal128.fromString(trimmedValue);
}

async function seed() {
  const app = await NestFactory.create(AppModule);

  const riddleModel: Model<RiddleDocument> = app.get(
    getModelToken(Riddle.name),
  );

  const saltRounds = 10;

  const riddlesData = [
    {
      question: 'What has an eye, but cannot see?',
      answer: 'A needle',
      entryFee: '10.00',
      prizePool: '100.00',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    {
      question: 'What is full of holes but still holds water?',
      answer: 'A sponge',
      entryFee: '5.00',
      prizePool: '50.00',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  ];

  try {
    for (const riddle of riddlesData) {
      try {
        const existingRiddle = await riddleModel.findOne({
          question: riddle.question,
        });
        if (existingRiddle) {
          console.info(
            `Riddle already exists: "${riddle.question}" - skipping`,
          );
          continue;
        }

        const answerHash = await bcrypt.hash(riddle.answer, saltRounds);
        await riddleModel.create({
          question: riddle.question,
          answer: riddle.answer,
          answerHash,
          entryFee: validateAndConvertDecimal(
            riddle.entryFee,
            riddle.question,
            'entryFee',
          ),
          prizePool: validateAndConvertDecimal(
            riddle.prizePool,
            riddle.question,
            'prizePool',
          ),
          expiresAt: riddle.expiresAt,
          seeded: true,
        });
        console.info(`Successfully seeded riddle: "${riddle.question}"`);
      } catch (error) {
        console.error(
          `Failed to seed riddle "${riddle.question}":`,
          error.message,
        );
      }
    }

    console.info('Riddles seeding process completed.');
  } finally {
    await app.close();
  }
}

async function unseed() {
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.ALLOW_DB_SEED !== 'true'
  ) {
    throw new Error(
      'Refusing to run unseed in non-development environment. Set NODE_ENV=development or ALLOW_DB_SEED=true to proceed.',
    );
  }

  const app = await NestFactory.create(AppModule);
  try {
    const riddleModel: Model<RiddleDocument> = app.get(
      getModelToken(Riddle.name),
    );

    const result = await riddleModel.deleteMany({ seeded: true });
    console.info(`Deleted ${result.deletedCount} seeded riddles.`);
  } finally {
    await app.close();
  }
}

// Execute seed or unseed based on command line arguments
const args = process.argv.slice(2);
if (args.includes('--seed')) {
  seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
} else if (args.includes('--unseed')) {
  unseed().catch((err) => {
    console.error('Unseeding failed:', err);
    process.exit(1);
  });
} else {
  console.log('Please provide --seed or --unseed argument.');
  process.exit(1);
}
