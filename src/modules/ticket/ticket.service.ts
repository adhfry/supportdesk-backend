import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, Ticket, TicketStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto, UpdateTicketStatusDto } from './dto/ticket.dto';

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private formatTicketNumber(ticketId: number): string {
    return `TCK-${String(ticketId).padStart(4, '0')}`;
  }

  private async getCurrentUser(token: string) {
    if (!token) {
      throw new UnauthorizedException('Sesi login tidak ditemukan');
    }

    return this.authService.getCurrentUserFromToken(token);
  }

  private async getTicketOrThrow(ticketId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Komplain paket tidak ditemukan');
    }

    return ticket;
  }

  private canAccessTicket(
    ticket: Ticket & { user_id: number; assigned_admin_id: number | null },
    userId: number,
    role: Role,
  ) {
    if (role === Role.ADMIN) {
      return true;
    }

    return ticket.user_id === userId || ticket.assigned_admin_id === userId;
  }

  async createTicket(token: string, dto: CreateTicketDto) {
    const currentUser = await this.getCurrentUser(token);

    if (currentUser.role !== Role.USER) {
      throw new ForbiddenException(
        'Hanya user yang dapat membuat laporan paket',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({
        data: {
          ticket_number: `TCK-${Date.now()}`,
          subject: dto.subject,
          description: dto.description,
          room_id: randomUUID(),
          status: TicketStatus.OPEN,
          user_id: currentUser.id,
        },
      });

      return tx.ticket.update({
        where: { id: createdTicket.id },
        data: {
          ticket_number: this.formatTicketNumber(createdTicket.id),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assigned_admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  }

  async getQueue(token: string) {
    const currentUser = await this.getCurrentUser(token);

    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Hanya admin yang dapat melihat antrian komplain paket',
      );
    }

    return this.prisma.ticket.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getMyTickets(token: string) {
    const currentUser = await this.getCurrentUser(token);

    return this.prisma.ticket.findMany({
      where:
        currentUser.role === Role.ADMIN
          ? {
              OR: [
                { user_id: currentUser.id },
                { assigned_admin_id: currentUser.id },
              ],
            }
          : { user_id: currentUser.id },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getTicketById(token: string, ticketId: number) {
    const currentUser = await this.getCurrentUser(token);
    const ticket = await this.getTicketOrThrow(ticketId);

    if (!this.canAccessTicket(ticket, currentUser.id, currentUser.role)) {
      throw new ForbiddenException(
        'Anda tidak punya akses ke komplain paket ini',
      );
    }

    let queuePosition = 0;

    // Jika tiket masih dalam antrian, hitung posisi real-time nya
    if (ticket.status === TicketStatus.OPEN) {
      // Hitung jumlah tiket OPEN yang dibuat SEBELUM tiket pengguna ini
      const aheadCount = await this.prisma.ticket.count({
        where: {
          status: TicketStatus.OPEN,
          created_at: {
            lt: ticket.created_at, // less than (lebih lama dari tiket ini)
          },
        },
      });

      // Posisi saat ini = jumlah antrian di depannya + 1 (dirinya sendiri)
      queuePosition = aheadCount + 1;
    }

    // Kembalikan objek tiket beserta tambahan data queue_position
    return {
      ...ticket,
      queue_position: queuePosition,
    };
  }

  async takeTicket(token: string, ticketId: number) {
    const currentUser = await this.getCurrentUser(token);

    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Hanya admin yang dapat mengambil komplain paket',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.updateMany({
        where: {
          id: ticketId,
          status: TicketStatus.OPEN,
          assigned_admin_id: null,
        },
        data: {
          assigned_admin_id: currentUser.id,
          status: TicketStatus.ASSIGNED,
        },
      });

      if (updated.count === 0) {
        throw new ConflictException(
          'Komplain paket sudah diambil atau tidak tersedia',
        );
      }

      return tx.ticket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assigned_admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    if (!result) {
      throw new NotFoundException('Komplain paket tidak ditemukan');
    }

    return result;
  }

  async updateTicketStatus(
    token: string,
    ticketId: number,
    dto: UpdateTicketStatusDto,
  ) {
    if (dto.status === TicketStatus.OPEN) {
      throw new ForbiddenException('Status OPEN hanya untuk laporan baru');
    }

    const currentUser = await this.getCurrentUser(token);
    const ticket = await this.getTicketOrThrow(ticketId);

    if (!this.canAccessTicket(ticket, currentUser.id, currentUser.role)) {
      throw new ForbiddenException(
        'Anda tidak punya akses untuk mengubah komplain paket ini',
      );
    }

    if (
      dto.status === TicketStatus.IN_PROGRESS &&
      ticket.status === TicketStatus.OPEN &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Komplain paket harus diambil admin sebelum masuk IN_PROGRESS',
      );
    }

    if (
      (dto.status === TicketStatus.RESOLVED ||
        dto.status === TicketStatus.CLOSED) &&
      ticket.status === TicketStatus.OPEN
    ) {
      throw new ForbiddenException(
        'Komplain paket OPEN tidak bisa langsung ditutup',
      );
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: dto.status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assigned_admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
