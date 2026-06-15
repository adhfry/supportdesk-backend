import { Controller, Get, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import type { Request } from 'express';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}
    

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Cek sesi login dari cookie access_token' })
  @ApiOkResponse({ description: 'Data user aktif dari cookie access_token' })
  @Get()
  async dashboard(@Req() req: Request) {
    const token = req.cookies?.access_token as string | undefined;
    return this.dashboardService.getDashboardData(token ?? '');
  }
}
