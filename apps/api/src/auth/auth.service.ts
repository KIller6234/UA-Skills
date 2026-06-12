/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { Response, Request } from 'express';
import { PrismaService } from '@nih/database';
import { type Env } from '@nih/config';
import { type JwtPayload } from '@nih/auth';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<{ confirmUrl: string }> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {throw new ConflictException('Email already registered');}

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const confirmToken = randomBytes(32).toString('hex');
    const rawId = randomBytes(12).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        id: rawId,
        tenantId: rawId,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        emailConfirmToken: confirmToken,
        emailConfirmExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.seedDefaultData(user.id);

    return { confirmUrl: `/confirm?token=${user.emailConfirmToken}` };
  }

  async confirmEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { emailConfirmToken: token },
    });

    if (!user) {throw new BadRequestException('Invalid or expired confirmation token');}
    if (user.emailConfirmExpiresAt && user.emailConfirmExpiresAt < new Date()) {
      throw new BadRequestException('Confirmation token has expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailConfirmedAt: new Date(),
        emailConfirmToken: null,
        emailConfirmExpiresAt: null,
      },
    });
  }

  async login(
    dto: LoginDto,
    res: Response,
  ): Promise<{ id: string; email: string; displayName: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {throw new UnauthorizedException('Invalid credentials');}

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {throw new UnauthorizedException('Invalid credentials');}

    if (!user.emailConfirmedAt) {
      throw new ForbiddenException('Please confirm your email before logging in');
    }

    await this.setTokenCookies(res, {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });

    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.['refresh_token'];
    if (!rawToken) {throw new UnauthorizedException('Missing refresh token');}

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      this.clearCookies(res);
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    await this.setTokenCookies(res, {
      sub: stored.user.id,
      email: stored.user.email,
      tenantId: stored.user.tenantId,
    });
  }

  async oauthLogin(
    profile: { provider: string; providerId: string; email: string; displayName: string },
    res: Response,
  ): Promise<{ id: string; email: string; displayName: string | null }> {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      const rawId = randomBytes(12).toString('hex');
      const randomPw = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
      user = await this.prisma.user.create({
        data: {
          id: rawId,
          tenantId: rawId,
          email: profile.email,
          passwordHash: randomPw,
          displayName: profile.displayName,
          emailConfirmedAt: new Date(),
        },
      });
      await this.seedDefaultData(user.id);
    } else if (!user.emailConfirmedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailConfirmedAt: new Date() },
      });
    }

    await this.setTokenCookies(res, {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });

    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async getProfile(userId: string): Promise<{ id: string; email: string; displayName: string | null; createdAt: Date }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<{ id: string; email: string; displayName: string | null }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: dto.displayName },
    });
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async logout(req: Request, res: Response): Promise<void> {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.['refresh_token'];
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    this.clearCookies(res);
  }

  private async setTokenCookies(res: Response, payload: JwtPayload): Promise<void> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';

    const accessToken = this.jwt.sign(payload, { expiresIn: accessTtl });
    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    const cookieBase = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };
    res.cookie('access_token', accessToken, { ...cookieBase, maxAge: accessTtl * 1000 });
    res.cookie('refresh_token', rawRefresh, {
      ...cookieBase,
      maxAge: refreshTtl * 1000,
      path: '/api/auth',
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth' });
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async seedDefaultData(userId: string): Promise<void> {
    const DEFAULT_AXES = [
      { key: 'content_type', label: 'Тип контенту', values: ['Новина','Аналіз','Туторіал','Реліз','Думка'] },
      { key: 'reader_level', label: 'Рівень читача', values: ['Junior','Middle','Senior'] },
      { key: 'region',       label: 'Регіон',        values: ['UA','EU','US','Global'] },
      { key: 'tone',         label: 'Тональність',   values: ['Нейтральна','Промоційна','Критична'] },
    ];
    const DEFAULT_CATEGORIES = [
      { name: 'AI-інфра', color: '#6366f1' },
      { name: 'Безпека',  color: '#ef4444' },
      { name: 'DevTools', color: '#10b981' },
      { name: 'Стартапи', color: '#f59e0b' },
    ];

    await Promise.all([
      ...DEFAULT_AXES.map((axis, i) =>
        this.prisma.categorizationAxis.create({
          data: {
            userId,
            key: axis.key,
            label: axis.label,
            isSystemDefault: true,
            sortOrder: i,
            values: {
              create: axis.values.map((v, j) => ({ value: v.toLowerCase().replace(/\s/g, '_'), label: v, sortOrder: j })),
            },
          },
        }),
      ),
      ...DEFAULT_CATEGORIES.map((cat, i) =>
        this.prisma.userCategory.create({
          data: {
            userId,
            name: cat.name,
            slug: `${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${userId.slice(-4)}`,
            color: cat.color,
            sortOrder: i,
          },
        }),
      ),
    ]);
  }
}
