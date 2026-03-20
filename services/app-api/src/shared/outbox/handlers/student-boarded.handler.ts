import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class StudentBoardedHandler {
  private readonly logger = new Logger(StudentBoardedHandler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { studentName, guardianPhone, guardianName, boardedAt } = payload;

    if (!guardianPhone) {
      this.logger.warn(`STUDENT_BOARDED: no guardian phone for student "${studentName}"`);
      return;
    }

    const time = new Date(boardedAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    await this.whatsapp.sendTemplate({
      phone: guardianPhone,
      templateName: 'embarque_confirmado',
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
