import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || user.password !== pass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async register(userData: any) {
    if (!userData || !userData.email) {
      throw new UnauthorizedException('Email is required');
    }
    const normalizedEmail = userData.email.toLowerCase();
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new UnauthorizedException('User already exists');
    }

    // In production, HASH THIS PASSWORD!
    const newUser = await this.usersService.create({
      email: normalizedEmail,
      password: userData.password,
      fullName: userData.fullName,
      role: userData.role || 'user',
      firebaseUid: `local_${Date.now()}`, // Mock UID for compatibility
    });

    return this.login(newUser.email, newUser.password);
  }
}
