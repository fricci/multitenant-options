import { Injectable } from "@nestjs/common";
import { Customer } from "./customer";

export type PendingCall = {
  id: number;
  customer: Customer;
  at: string;
};

@Injectable()
export class CallsService {
  private pending: PendingCall | null = null;
  private nextId = 1;

  current(): PendingCall | null {
    return this.pending;
  }

  ring(customer: Customer): PendingCall {
    this.pending = {
      id: this.nextId++,
      customer,
      at: new Date().toISOString()
    };
    return this.pending;
  }

  clear(): void {
    this.pending = null;
  }
}
