import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RouteCancelledHandler {
  private readonly logger = new Logger(RouteCancelledHandler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { routeName, guardianPhones } = payload as {
      routeName: string;
      guardianPhones: string[];
    };

    if (!guardianPhones?.length) {
      this.logger.warn(`ROUTE_CANCELLED: no guardian phones to notify for route "${routeName}"`);
      return;
    }

    this.logger.log(
      `ROUTE_CANCELLED: notifying ${guardianPhones.length} guardians for route "${routeName}"`,
    );

    await Promise.allSettled(
      guardianPhones.map((phone) =>
        this.whatsapp.sendTemplate({
          phone,
          templateName: 'cancelamento_viagem',
          languageCode: 'pt_BR',
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: routeName }],
            },
          ],
        }),
      ),
    );
  }
}
