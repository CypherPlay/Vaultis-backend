import { Test, TestingModule } from '@nestjs/testing';
import { SystemService } from '../system.service';
import { Connection } from 'mongoose';
import { BlockchainPollerService } from '../../blockchain/blockchain-poller.service';
import { Redis } from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';

describe('SystemService', () => {
  let service: SystemService;
  let schedulerRegistry: SchedulerRegistry;

  const mockConnection = {
    readyState: 1,
  };

  const mockBlockchainPollerService = {
    isHealthy: jest.fn(() => true),
    getLastPollAt: jest.fn(() => new Date()),
  };

  const mockRedis = {
    ping: jest.fn(() => Promise.resolve('PONG')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemService,
        {
          provide: 'Connection',
          useValue: mockConnection,
        },
        {
          provide: BlockchainPollerService,
          useValue: mockBlockchainPollerService,
        },
        {
          provide: 'Redis',
          useValue: mockRedis,
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            getCronJobs: jest.fn(),
            getIntervals: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemService>(SystemService);
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkSchedulerHealth', () => {
    it('should return up if there are active cron jobs', () => {
      jest.spyOn(schedulerRegistry, 'getCronJobs').mockReturnValue(new Map([['job1', {} as any]]));
      jest.spyOn(schedulerRegistry, 'getIntervals').mockReturnValue([]);
      const result = service['checkSchedulerHealth']();
      expect(result.status).toBe('up');
      expect(result.message).toContain('1 cron jobs');
      expect(result.message).toContain('0 intervals');
    });

    it('should return up if there are active intervals', () => {
      jest.spyOn(schedulerRegistry, 'getCronJobs').mockReturnValue(new Map());
      jest.spyOn(schedulerRegistry, 'getIntervals').mockReturnValue(['interval1']);
      const result = service['checkSchedulerHealth']();
      expect(result.status).toBe('up');
      expect(result.message).toContain('0 cron jobs');
      expect(result.message).toContain('1 intervals');
    });

    it('should return up if there are both active cron jobs and intervals', () => {
      jest.spyOn(schedulerRegistry, 'getCronJobs').mockReturnValue(new Map([['job1', {} as any]]));
      jest.spyOn(schedulerRegistry, 'getIntervals').mockReturnValue(['interval1']);
      const result = service['checkSchedulerHealth']();
      expect(result.status).toBe('up');
      expect(result.message).toContain('1 cron jobs');
      expect(result.message).toContain('1 intervals');
    });

    it('should return down if there are no active cron jobs or intervals', () => {
      jest.spyOn(schedulerRegistry, 'getCronJobs').mockReturnValue(new Map());
      jest.spyOn(schedulerRegistry, 'getIntervals').mockReturnValue([]);
      const result = service['checkSchedulerHealth']();
      expect(result.status).toBe('down');
      expect(result.message).toBe('Scheduler has no active jobs');
    });
  });
});
