import { Test, TestingModule } from '@nestjs/testing';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

describe('TicketController', () => {
  let controller: TicketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [
        {
          provide: TicketService,
          useValue: {
            createTicket: jest.fn(),
            getQueue: jest.fn(),
            getMyTickets: jest.fn(),
            getTicketById: jest.fn(),
            takeTicket: jest.fn(),
            updateTicketStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
