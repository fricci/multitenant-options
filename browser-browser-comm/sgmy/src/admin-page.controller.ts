import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { join } from "path";

@Controller()
export class AdminPageController {
  @Get("admin")
  admin(@Res() res: Response) {
    res.sendFile(join(__dirname, "..", "public", "admin", "index.html"));
  }
}
