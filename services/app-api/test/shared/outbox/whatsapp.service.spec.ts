import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { WhatsAppService } from '../../../src/shared/outbox/whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                WHATSAPP_API_TOKEN: 'test-token',
                WHATSAPP_PHONE_NUMBER_ID: '123456789',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(WhatsAppService);
    httpService = module.get(HttpService);
  });

  it('should POST to Meta Cloud API with correct payload', async () => {
    const mockResponse: AxiosResponse = {
      data: { messages: [{ id: 'wamid.abc' }] },
      status: 200,
    } as any;
    (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

    await service.sendTemplate({
      phone: '5511999998888',
      templateName: 'embarque_confirmado',
      languageCode: 'pt_BR',
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'João' }] }],
    });

    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v18.0/123456789/messages',
      expect.objectContaining({
        messaging_product: 'whatsapp',
        to: '5511999998888',
        type: 'template',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('should not throw on WhatsApp API error — log and continue', async () => {
    (httpService.post as jest.Mock).mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    await expect(
      service.sendTemplate({
        phone: '5511999998888',
        templateName: 'cancelamento_viagem',
        languageCode: 'pt_BR',
        components: [],
      }),
    ).resolves.not.toThrow();
  });
});
