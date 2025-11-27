import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('LeaderboardController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/leaderboard/daily (GET) should return 200 without authentication', () => {
    return request(app.getHttpServer())
      .get('/leaderboard/daily')
      .expect(200);
  });

  it('/leaderboard/all-time (GET) should return 200 without authentication', () => {
    return request(app.getHttpServer())
      .get('/leaderboard/all-time')
      .expect(200);
  });
});
