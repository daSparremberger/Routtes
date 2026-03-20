import { UserRole } from './user-role.enum';

export interface JwtPayload {
  sub: string;       // user.id (uuid)
  tenantId: string | null;  // null para superadmin
  role: UserRole;
  iat?: number;
  exp?: number;
}
