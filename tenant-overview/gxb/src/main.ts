import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, "..", "public"), {
    index: "index.html",
    redirect: false
  });
  const port = Number(process.env.PORT ?? 3102);
  await app.listen(port, "0.0.0.0");
}

bootstrap();
