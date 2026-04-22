import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port, host });
    app.log.info(`Backend iniciado em http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
