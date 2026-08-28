import { Module } from "@nestjs/common";
import { AdminPageController } from "./admin-page.controller";
import { ApiController } from "./api.controller";
import { CallsService } from "./calls.service";
import { CustomersService } from "./customers.service";

@Module({
  controllers: [ApiController, AdminPageController],
  providers: [CustomersService, CallsService]
})
export class AppModule {}
