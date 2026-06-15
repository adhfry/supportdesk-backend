import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Login dan simpan access token di cookie' })
  @ApiOkResponse({
    description: 'Login berhasil dan cookie access_token diset',
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.login(dto); // Logika login di service

    // Set token ke HttpOnly Cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 hari
    });

    return { message: 'Login berhasil' };
  }

  // buat resgiter route
  @ApiOperation({ summary: 'Register user baru' })
  @ApiOkResponse({ description: 'User berhasil didaftarkan' })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.authService.register(dto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 hari
    });

    return { message: 'Registrasi berhasil' };
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Cek sesi login dari cookie access_token' })
  @ApiOkResponse({ description: 'Data user aktif dari cookie access_token' })
  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.access_token as string | undefined;
    return this.authService.getCurrentUserFromToken(token ?? '');
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Logout dan hapus cookie access_token' })
  @ApiOkResponse({ description: 'Cookie access_token dihapus' })
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logout berhasil' };
  }
}
