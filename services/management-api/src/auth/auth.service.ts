import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, UserRole } from '@routtes/shared';
import { FirebaseService } from './firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

interface SuperadminRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

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

    const rows = await this.prisma.$queryRaw<SuperadminRow[]>`
      SELECT id, name, email, role, status
      FROM app.users
      WHERE firebase_uid = ${decoded.uid}
        AND role = 'superadmin'
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException('Superadmin account not found');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: null,
      role: UserRole.SUPERADMIN,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: UserRole.SUPERADMIN,
      },
    };
  }
}
