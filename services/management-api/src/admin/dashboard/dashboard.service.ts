import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [tenantsActive, tenantsNewLast30d, tenantsSuspended] = await Promise.all([
      this.prisma.tenants.count({ where: { status: 'active' } }),
      this.prisma.tenants.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
      this.prisma.tenants.count({ where: { status: 'suspended' } }),
    ]);

    return {
      tenantsActive,
      tenantsNewLast30d,
      tenantsSuspended,
      alerts: tenantsSuspended,
    };
  }

  async getCommercialKpis() {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [activeContracts, revenueAgg, pendingInvoices, expiringContracts] = await Promise.all([
      this.prisma.contracts.count({ where: { status: 'active' } }),
      this.prisma.contracts.aggregate({
        where: { status: 'active' },
        _sum: { monthly_value: true },
      }),
      this.prisma.invoices.count({ where: { status: 'pending' } }),
      this.prisma.contracts.findMany({
        where: {
          status: 'active',
          ends_at: { lte: thirtyDaysFromNow, not: null },
        },
        include: { organizations: { include: { tenants: true } } },
        orderBy: { ends_at: 'asc' },
        take: 10,
      }),
    ]);

    return {
      activeContracts,
      monthlyRevenue: revenueAgg._sum.monthly_value ?? 0,
      pendingInvoices,
      expiringContracts,
    };
  }

  async getTenantUsage() {
    const tenants = await this.prisma.tenants.findMany({
      where: { status: 'active' },
      include: { licenses: true },
    });

    return tenants.map((t) => ({
      tenantId: t.id,
      city: t.city,
      state: t.state,
      license: t.licenses ?? null,
    }));
  }
}
