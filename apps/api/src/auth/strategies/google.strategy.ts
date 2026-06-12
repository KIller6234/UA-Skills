import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import type { Env } from '@nih/config';
import type { OAuthProfile } from './github.strategy';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID', { infer: true }) || 'not-configured',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }) || 'not-configured',
      callbackURL: `${config.get('FRONTEND_URL', { infer: true })}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user: OAuthProfile | false) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email from Google'), false);
      return;
    }

    done(null, {
      provider: 'google',
      providerId: profile.id,
      email,
      displayName: profile.displayName ?? email,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
