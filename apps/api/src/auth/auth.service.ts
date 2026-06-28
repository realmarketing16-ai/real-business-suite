import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account already exists for this email');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { name: input.companyName.trim() } });
      return tx.user.create({
        data: {
          email,
          passwordHash: await hash(input.password, 12),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: 'OWNER',
          companyId: company.id,
        },
        include: { company: true },
      });
    });

    return this.session(user);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { company: true },
    });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    return this.session(user);
  }

  private async session(user: { id: string; email: string; firstName: string; lastName: string; role: string; companyId: string; company: { id: string; name: string } }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, companyId: user.companyId, role: user.role });
    return {
      accessToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      company: user.company,
    };
  }
}
