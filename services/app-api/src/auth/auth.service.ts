import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, UserRole } from '@routtes/shared';
import { FirebaseService } from './firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(idToken: string) {
    const decoded = await this.firebase.verifyIdToken(idToken);

    const user = await this.prisma.users.findUnique({
      where: { firebase_uid: decoded.uid },
      select: {
        id: true,
        tenant_id: true,
        role: true,
        name: true,
        email: true,
        status: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (user.status !== 'active') throw new UnauthorizedException('Account is inactive');
    if ((user.role as string) === 'superadmin') {
      throw new ForbiddenException('SuperAdmin cannot access this API');
    }
    if (!user.tenant_id) throw new UnauthorizedException('User has no tenant context');

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role as UserRole,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRY', '15m'),
    });

    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '7d') },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwt.verify<{ sub: string; type?: string }>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token type is not a refresh token');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: { id: true, tenant_id: true, role: true, status: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role as UserRole,
    };

    return {
      accessToken: this.jwt.sign(newPayload, {
        expiresIn: this.config.get<string>('JWT_EXPIRY', '15m'),
      }),
    };
  }
}
