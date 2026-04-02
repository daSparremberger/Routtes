import { Test } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: any;

  const tenantId = 'tenant-uuid-1';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      students: { count: jest.fn() },
      routes: { count: jest.fn() },
      users: { count: jest.fn() },
      vehicles: { count: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(StatsService);
  });

  it('should return counts for all entities in one transaction', async () => {
    prisma.$transaction.mockResolvedValue([42, 38, 10, 7, 8, 6, 5]);

    const result = await service.getStats(tenantId);

    expect(result).toEqual({
      students: { total: 42, active: 38 },
      routes:   { total: 10, active: 7 },
      drivers:  { total: 8,  active: 6 },
      vehicles: { total: 5 },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
