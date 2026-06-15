import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

type AccessTokenPayload = {
  sub: number;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Cek email duplicate di DB
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // 2. Hash password dengan bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 3. Simpan via Prisma
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
    });

    // Jangan kembalikan password di response
    const { password, ...result } = user;

    // generate jwt
    const token = await this.jwtService.signAsync({
      sub: result.id,
      role: result.role,
    });
    return { ...result, token };
  }

  async login(dto: LoginDto) {
    // 1. Cari user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 2. Bandingkan password
    const isPasswordMatch = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // 3. Generate JWT
    const payload = { sub: user.id, role: user.role };
    return await this.jwtService.signAsync(payload);
  }

  async getCurrentUserFromToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Sesi Login tidak ditemukan');
    }

    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
      token,
      {
        secret: process.env.JWT_SECRET || 'dev_jwt_secret',
      },
    );

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    return user;
  }
}
