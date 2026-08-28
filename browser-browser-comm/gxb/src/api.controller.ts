import { Body, Controller, Get, NotFoundException, Post } from "@nestjs/common";
import { CallsService } from "./calls.service";
import { CustomersService } from "./customers.service";

type IncomingCallBody = {
  account?: string;
};

@Controller("api")
export class ApiController {
  constructor(
    private readonly customers: CustomersService,
    private readonly calls: CallsService
  ) {}

  @Get("customers")
  listCustomers() {
    return this.customers.findAll();
  }

  @Get("current-call")
  currentCall() {
    return { call: this.calls.current() };
  }

  @Post("incoming-call")
  incomingCall(@Body() body: IncomingCallBody) {
    const account = String(body?.account ?? "").trim();
    const customer = this.customers.findByAccount(account);
    if (!customer) {
      throw new NotFoundException(`Unknown account: ${account || "(empty)"}`);
    }
    return { ok: true, call: this.calls.ring(customer) };
  }

  @Post("clear-call")
  clearCall() {
    this.calls.clear();
    return { ok: true };
  }
}
