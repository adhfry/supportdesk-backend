import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CreateTicketDto, UpdateTicketStatusDto } from './dto/ticket.dto';

@ApiTags('Komplain Paket')
@ApiCookieAuth('access_token')
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  private getToken(req: Request): string {
    return req.cookies?.access_token ?? '';
  }

  @ApiOperation({ summary: 'Buat laporan paket bermasalah' })
  @ApiOkResponse({ description: 'Laporan paket berhasil dibuat' })
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(this.getToken(req), dto);
  }

  @ApiOperation({ summary: 'Lihat antrian komplain paket OPEN untuk admin' })
  @ApiOkResponse({ description: 'Daftar komplain paket OPEN' })
  @Get('queue')
  async getQueue(@Req() req: Request) {
    return this.ticketService.getQueue(this.getToken(req));
  }

  @ApiOperation({
    summary: 'Lihat komplain paket milik user atau yang ditangani admin',
  })
  @ApiOkResponse({ description: 'Daftar komplain paket sesuai akun login' })
  @Get('me')
  async getMyTickets(@Req() req: Request) {
    return this.ticketService.getMyTickets(this.getToken(req));
  }

  @ApiOperation({ summary: 'Lihat detail komplain paket berdasarkan id' })
  @ApiOkResponse({ description: 'Detail komplain paket' })
  @Get(':id')
  async getTicketById(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketService.getTicketById(this.getToken(req), id);
  }

  @ApiOperation({ summary: 'Ambil komplain paket OPEN oleh admin' })
  @ApiOkResponse({ description: 'Komplain paket berhasil di-assign ke admin' })
  @Post(':id/take')
  async takeTicket(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.ticketService.takeTicket(this.getToken(req), id);
  }

  @ApiOperation({ summary: 'Ubah status komplain paket' })
  @ApiOkResponse({ description: 'Status komplain paket berhasil diperbarui' })
  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketService.updateTicketStatus(this.getToken(req), id, dto);
  }
}
