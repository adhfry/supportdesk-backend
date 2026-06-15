import { Injectable } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService, private readonly authService: AuthService) {}

    async getDashboardData(token: string) {
        // Logika untuk mengambil data dashboard, misalnya jumlah tiket, statistik, user saat ini, dll. ambil dari prisma
        const totalTickets = await this.prisma.ticket.count();
        const openTickets = await this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } });
        const assignedTickets = await this.prisma.ticket.count({ where: { status: TicketStatus.ASSIGNED } });
        const closedTickets = await this.prisma.ticket.count({ where: { status: TicketStatus.CLOSED } });
        const user = await this.authService.getCurrentUserFromToken(token ?? '');
        return {
            totalTickets,
            openTickets,
            assignedTickets,
            closedTickets,
            user
        };
        };
    }

