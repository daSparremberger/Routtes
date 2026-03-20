import { Test } from '@nestjs/testing';
import { DashboardService } from '../../src/admin/dashboard/dashboard.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  tenant: { count: jest.fn() },
  contract: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  invoice: { count: jest.fn() },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  it('should return general KPIs', async () => {
    prismaMock.tenant.count
      .mockResolvedValueOnce(10) // active
      .mockResolvedValueOnce(2)  // new last 30d
      .mockResolvedValueOnce(1); // suspended
    const result = await service.getKpis();
    expect(result).toHaveProperty('tenantsActive');
    expect(result).toHaveProperty('tenantsNewLast30d');
    expect(result).toHaveProperty('tenantsSuspended');
    expect(result).toHaveProperty('alerts');
  });

  it('should return commercial KPIs', async () => {
    prismaMock.contract.count.mockResolvedValue(8);
    prismaMock.contract.aggregate.mockResolvedValue({ _sum: { monthly_value: 4000 } });
    prismaMock.invoice.count.mockResolvedValue(3);
    prismaMock.contract.findMany.mockResolvedValue([]);
    const result = await service.getCommercialKpis();
    expect(result).toHaveProperty('activeContracts');
    expect(result).toHaveProperty('monthlyRevenue');
    expect(result).toHaveProperty('pendingInvoices');
    expect(result).toHaveProperty('expiringContracts');
  });
});
