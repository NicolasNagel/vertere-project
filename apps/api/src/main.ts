import 'dotenv/config';
import { buildApp } from './app';

async function main() {
  const app = buildApp();
  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`API rodando em http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
