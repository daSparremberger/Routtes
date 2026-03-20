import { Test } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@routtes/shared';

describe('AuthService (app-api)', () => {
  let service: AuthService;
  let firebase: jest.Mocked<FirebaseService>;
  let prisma: { users: { findUnique: jest.Mock } };
  let jwtService: jest.Mocked<JwtService>;

  const mockManager = {
    id: 'user-uuid-2',
    tenant_id: 'tenant-uuid-1',
    firebase_uid: 'firebase-uid-2',
    role: 'manager',
    name: 'João Gestor',
    email: 'joao@empresa.com',
    status: 'active',
  };

  beforeEach(async () => {
    prisma = { users: { findUnique: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: { verifyIdToken: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    firebase = module.get(FirebaseService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return accessToken and refreshToken for active manager', async () => {
      firebase.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-2' } as any);
      prisma.users.findUnique.mockResolvedValue(mockManager);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login('valid-idtoken');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.tenantId).toBe('tenant-uuid-1');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      firebase.verifyIdToken.mockResolvedValue({ uid: 'unknown' } as any);
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(service.login('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when superadmin tries to login', async () => {
      firebase.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-sa' } as any);
      prisma.users.findUnique.mockResolvedValue({ ...mockManager, role: 'superadmin', tenant_id: null });

      await expect(service.login('token')).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      firebase.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-2' } as any);
      prisma.users.findUnique.mockResolvedValue({ ...mockManager, status: 'inactive' });

      await expect(service.login('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new accessToken for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-2', type: 'refresh' });
      prisma.users.findUnique.mockResolvedValue(mockManager);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('expired'); });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-2', type: 'access' });

      await expect(service.refresh('access-token-used-as-refresh')).rejects.toThrow(UnauthorizedException);
    });
  });
});
