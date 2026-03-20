import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface WhatsAppTemplateParams {
  phone: string;
  templateName: string;
  languageCode: string;
  components: WhatsAppComponent[];
}

export interface WhatsAppComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiToken = this.config.get<string>('WHATSAPP_API_TOKEN')!;
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')!;
  }

  async sendTemplate(params: WhatsAppTemplateParams): Promise<void> {
    const { phone, templateName, languageCode, components } = params;
    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    try {
      await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`WhatsApp sent template "${templateName}" to ${phone}`);
    } catch (err: any) {
      this.logger.error(
        `WhatsApp send failed for ${phone}: ${err?.message ?? String(err)}`,
      );
    }
  }
}
