import { Injectable } from '@nestjs/common';
import { user_role } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const [
      studentsTotal,
      studentsActive,
      routesTotal,
      routesActive,
      driversTotal,
      driversActive,
      vehiclesTotal,
    ] = await this.prisma.$transaction([
      this.prisma.students.count({ where: { tenant_id: tenantId } }),
      this.prisma.students.count({ where: { tenant_id: tenantId, status: 'active' } }),
      this.prisma.routes.count({ where: { tenant_id: tenantId } }),
      this.prisma.routes.count({ where: { tenant_id: tenantId, status: { in: ['active', 'approved'] } } }),
      this.prisma.users.count({ where: { tenant_id: tenantId, role: 'driver' as user_role } }),
      this.prisma.users.count({ where: { tenant_id: tenantId, role: 'driver' as user_role, status: 'active' } }),
      this.prisma.vehicles.count({ where: { tenant_id: tenantId } }),
    ]);

    return {
      students: { total: studentsTotal, active: studentsActive },
      routes:   { total: routesTotal,   active: routesActive },
      drivers:  { total: driversTotal,  active: driversActive },
      vehicles: { total: vehiclesTotal },
    };
  }
}
