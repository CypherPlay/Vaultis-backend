import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Riddle, RiddleDocument } from '../../schemas/riddle.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Decimal128 } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

async function seed() {
  const app = await NestFactory.create(AppModule);

  const riddleModel: Model<RiddleDocument> = app.get(getModelToken(Riddle.name));

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

  for (const riddle of riddlesData) {
    const answerHash = await bcrypt.hash(riddle.answer, saltRounds);
    await riddleModel.create({
      question: riddle.question,
      answerHash,
      entryFee: Decimal128.fromString(riddle.entryFee),
      prizePool: Decimal128.fromString(riddle.prizePool),
      expiresAt: riddle.expiresAt,
    });
  }

  console.log('Riddles seeded!');

  await app.close();
}

async function unseed() {
  const app = await NestFactory.create(AppModule);
  const riddleModel: Model<RiddleDocument> = app.get(getModelToken(Riddle.name));

  await riddleModel.deleteMany({});
  console.log('Riddles unseeded!');

  await app.close();
}

// Execute seed or unseed based on command line arguments
const args = process.argv.slice(2);
if (args.includes('--seed')) {
  seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
} else if (args.includes('--unseed')) {
  unseed().catch(err => {
    console.error('Unseeding failed:', err);
    process.exit(1);
  });
} else {
  console.log('Please provide --seed or --unseed argument.');
  process.exit(1);
}
