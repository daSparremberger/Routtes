import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { BulkGenerateDto } from './dto/bulk-generate.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateInvoiceDto, actorId: string) {
    try {
      const invoice = await this.prisma.invoices.create({
        data: {
          contract_id: dto.contractId,
          competence_month: new Date(dto.competenceMonth),
          value: dto.value,
          status: 'pending',
        },
      });
      await this.audit.log({
        actorId,
        action: 'invoice.created',
        resourceType: 'invoice',
        resourceId: invoice.id,
        metadata: dto as unknown as Record<string, unknown>,
      });
      return invoice;
    } catch (err) {
      if (err.code === 'P2002')
        throw new ConflictException(
          'Invoice already exists for this contract and competence month',
        );
      throw err;
    }
  }

  async bulkGenerate(dto: BulkGenerateDto, actorId: string) {
    const activeContracts = await this.prisma.contracts.findMany({
      where: { status: 'active' },
    });
    const competenceMonth = new Date(dto.competenceMonth);
    let generated = 0;
    let skipped = 0;

    for (const contract of activeContracts) {
      const exists = await this.prisma.invoices.findFirst({
        where: { contract_id: contract.id, competence_month: competenceMonth },
      });
      if (exists) {
        skipped++;
        continue;
      }

      await this.prisma.invoices.create({
        data: {
          contract_id: contract.id,
          competence_month: competenceMonth,
          value: contract.monthly_value,
          status: 'pending',
        },
      });
      generated++;
    }

    await this.audit.log({
      actorId,
      action: 'invoice.bulk_generated',
      resourceType: 'invoice',
      resourceId: dto.competenceMonth,
      metadata: { generated, skipped },
    });
    return { generated, skipped, competenceMonth: dto.competenceMonth };
  }

  async findAll(filters?: { status?: string; contractId?: string }) {
    return this.prisma.invoices.findMany({
      where: {
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.contractId ? { contract_id: filters.contractId } : {}),
      },
      include: { contracts: { include: { organizations: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoices.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async markPaid(id: string, actorId: string) {
    await this.findOne(id);
    const invoice = await this.prisma.invoices.update({
      where: { id },
      data: { status: 'paid', paid_at: new Date(), paid_by: actorId },
    });
    await this.audit.log({
      actorId,
      action: 'invoice.paid',
      resourceType: 'invoice',
      resourceId: id,
    });
    return invoice;
  }

  async cancel(id: string, actorId: string) {
    await this.findOne(id);
    const invoice = await this.prisma.invoices.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    await this.audit.log({
      actorId,
      action: 'invoice.cancelled',
      resourceType: 'invoice',
      resourceId: id,
    });
    return invoice;
  }
}
