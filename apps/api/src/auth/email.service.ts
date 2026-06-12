import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@nih/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async sendConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY' as keyof Env, { infer: true } as any);
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — skipping email send');
      return;
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey as string);
      await resend.emails.send({
        from: 'NIH <noreply@nih-app.com>',
        to,
        subject: 'Підтвердіть email — News Intelligence Hub',
        html: `
          <h2>Ласкаво просимо до News Intelligence Hub</h2>
          <p>Натисніть кнопку нижче, щоб підтвердити вашу адресу email:</p>
          <a href="http://localhost:3001${confirmUrl}"
             style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
            Підтвердити email
          </a>
          <p style="color:#888;font-size:12px">Якщо ви не реєструвались — проігноруйте цей лист.</p>
        `,
      });
      this.logger.log({ event: 'email_sent', to, type: 'confirmation' });
    } catch (err) {
      this.logger.error({ event: 'email_send_failed', to, error: String(err) });
    }
  }
}
