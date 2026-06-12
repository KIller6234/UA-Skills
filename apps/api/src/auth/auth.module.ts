import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { type Env } from '@nih/config';
import { JwtStrategy } from '@nih/auth';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailService } from './email.service';
import { GitHubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL', { infer: true }) },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, EmailService, JwtStrategy, GitHubStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [JwtStrategy, JwtModule],
})
export class AuthModule {}
