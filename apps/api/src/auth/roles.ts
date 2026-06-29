import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from './jwt-auth.guard';

export function ensureOwnerOrAdmin(user: AuthenticatedUser, action = 'perform this action') {
  if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
    throw new ForbiddenException(`Only owners and admins can ${action}`);
  }
}

export function ensureManagerOrAbove(user: AuthenticatedUser, action = 'perform this action') {
  if (user.role !== Role.OWNER && user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    throw new ForbiddenException(`Only managers, admins, and owners can ${action}`);
  }
}
