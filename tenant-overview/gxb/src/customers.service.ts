import { Injectable } from "@nestjs/common";
import { Customer } from "./customer";
import { CUSTOMERS } from "./customers";

@Injectable()
export class CustomersService {
  findAll(): Customer[] {
    return CUSTOMERS;
  }

  findByAccount(account: string): Customer | undefined {
    return CUSTOMERS.find((row) => row.account === account);
  }
}
