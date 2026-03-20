import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class StudentDeliveredHandler {
  private readonly logger = new Logger(StudentDeliveredHandler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { studentName, guardianPhone, guardianName, deliveredAt } = payload;

    if (!guardianPhone) {
      this.logger.warn(`STUDENT_DELIVERED: no guardian phone for student "${studentName}"`);
      return;
    }

    const time = new Date(deliveredAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    await this.whatsapp.sendTemplate({
      phone: guardianPhone,
      templateName: 'desembarque_confirmado',
      languageCode: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName ?? 'Responsável' },
            { type: 'text', text: studentName },
            { type: 'text', text: time },
          ],
        },
      ],
    });
  }
}
