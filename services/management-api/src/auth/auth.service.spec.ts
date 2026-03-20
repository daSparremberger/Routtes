import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@routtes/shared';

describe('AuthService (management-api)', () => {
  let service: AuthService;
  let firebase: jest.Mocked<FirebaseService>;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockSuperadmin = {
    id: 'user-uuid-1',
    name: 'Admin Routtes',
    email: 'admin@routtes.app',
    role: 'superadmin',
    status: 'active',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: FirebaseService,
          useValue: { verifyIdToken: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    firebase = module.get(FirebaseService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  it('should return accessToken for valid superadmin', async () => {
    firebase.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-1' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockSuperadmin]);
    jwtService.sign.mockReturnValue('signed-jwt');

    const result = await service.login('valid-idtoken');

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.user.role).toBe(UserRole.SUPERADMIN);
    expect(firebase.verifyIdToken).toHaveBeenCalledWith('valid-idtoken');
  });

  it('should throw UnauthorizedException when user not found in DB', async () => {
    firebase.verifyIdToken.mockResolvedValue({ uid: 'unknown-uid' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    await expect(service.login('valid-idtoken')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when Firebase token is invalid', async () => {
    firebase.verifyIdToken.mockRejectedValue(new UnauthorizedException());

    await expect(service.login('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when superadmin is inactive', async () => {
    firebase.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-1' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ ...mockSuperadmin, status: 'inactive' }]);

    await expect(service.login('valid-idtoken')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when a manager tries login (query returns empty — role filter)', async () => {
    firebase.verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-manager' } as any);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    await expect(service.login('manager-idtoken')).rejects.toThrow(UnauthorizedException);
  });
});
