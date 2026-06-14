import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

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
    return result;
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
}
