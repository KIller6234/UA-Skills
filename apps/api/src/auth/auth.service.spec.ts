/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn(),
  argon2id: 0,
}));

import * as argon2 from 'argon2';

const mockArgon2 = argon2 as jest.Mocked<typeof argon2>;

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  categorizationAxis: { create: jest.fn() },
  userCategory: { create: jest.fn() },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, unknown> = {
      JWT_ACCESS_TTL: 900,
      JWT_REFRESH_TTL: 604800,
      NODE_ENV: 'test',
    };
    return cfg[key];
  }),
};

const mockRes = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

const mockReq = {
  cookies: {} as Record<string, string>,
};

const BASE_USER = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'test@example.com',
  displayName: 'Test User',
  passwordHash: 'hashed-password',
  emailConfirmedAt: new Date(),
  emailConfirmToken: null,
  emailConfirmExpiresAt: null,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockPrisma as any, mockJwt as any, mockConfig as any);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('mock-access-token');
    mockPrisma.categorizationAxis.create.mockResolvedValue({});
    mockPrisma.userCategory.create.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(BASE_USER);

      await expect(
        service.register({ email: 'test@example.com', password: 'Pass123!', displayName: 'User' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user with hashed password and returns confirmUrl', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({
        ...BASE_USER,
        emailConfirmToken: 'tok-abc123',
      });

      const result = await service.register({
        email: 'new@example.com',
        password: 'Pass123!',
        displayName: 'New User',
      });

      expect(result.confirmUrl).toContain('/confirm?token=');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@example.com' }),
        }),
      );
    });

    it('seeds default categories and axes after user creation', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({
        ...BASE_USER,
        emailConfirmToken: 'tok',
      });

      await service.register({ email: 'new@example.com', password: 'Pass123!', displayName: 'User' });

      expect(mockPrisma.categorizationAxis.create).toHaveBeenCalled();
      expect(mockPrisma.userCategory.create).toHaveBeenCalled();
    });
  });

  describe('confirmEmail', () => {
    it('throws BadRequestException for unknown token', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.confirmEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        ...BASE_USER,
        emailConfirmToken: 'tok',
        emailConfirmExpiresAt: new Date(Date.now() - 1000),
        emailConfirmedAt: null,
      });

      await expect(service.confirmEmail('tok')).rejects.toThrow(BadRequestException);
    });

    it('clears token and sets confirmedAt on valid token', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        ...BASE_USER,
        emailConfirmToken: 'tok',
        emailConfirmExpiresAt: new Date(Date.now() + 60_000),
        emailConfirmedAt: null,
      });
      mockPrisma.user.update.mockResolvedValueOnce(BASE_USER);

      await service.confirmEmail('tok');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emailConfirmToken: null }),
        }),
      );
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'p' }, mockRes as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(BASE_USER);
      (mockArgon2.verify as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }, mockRes as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when email not confirmed', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...BASE_USER, emailConfirmedAt: null });
      (mockArgon2.verify as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'Pass123!' }, mockRes as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns user data and sets auth cookies on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(BASE_USER);
      (mockArgon2.verify as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'Pass123!' },
        mockRes as any,
      );

      expect(result.email).toBe('test@example.com');
      expect(result.id).toBe('user-1');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('deletes stored refresh token and clears cookies', async () => {
      mockReq.cookies = { refresh_token: 'raw-token' };
      mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({});

      await service.logout(mockReq as any, mockRes as any);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token');
    });

    it('clears cookies even without refresh token cookie', async () => {
      mockReq.cookies = {};

      await service.logout(mockReq as any, mockRes as any);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });
});
