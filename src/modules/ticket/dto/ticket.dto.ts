import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'Paket dari seller tidak kunjung sampai' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  subject!: string;

  @ApiProperty({ example: 'Saya sudah menunggu lebih dari 7 hari, resi tidak bergerak dan seller tidak merespons.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
    description: 'Status penanganan komplain paket',
  })
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}