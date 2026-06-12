import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';
import type { Env } from '@nih/config';

export interface OAuthProfile {
  provider: 'github' | 'google';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID: config.get('GITHUB_CLIENT_ID', { infer: true }) || 'not-configured',
      clientSecret: config.get('GITHUB_CLIENT_SECRET', { infer: true }) || 'not-configured',
      callbackURL: `${config.get('FRONTEND_URL', { infer: true })}/api/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user: OAuthProfile | false) => void,
  ): void {
    const email =
      profile.emails?.[0]?.value ??
      `${profile.username ?? profile.id}@github.oauth`;

    done(null, {
      provider: 'github',
      providerId: profile.id,
      email,
      displayName: profile.displayName ?? profile.username ?? email,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
