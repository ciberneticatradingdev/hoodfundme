import { config } from "./config.js";
import { initSchema } from "./db.js";
import { createApi } from "./api.js";
import { startIndexer } from "./indexer.js";
import { startKeeper } from "./keeper.js";

async function main() {
  await initSchema();
  const app = createApi();
  app.listen(config.port, () => {
    console.log(`[api] listening on :${config.port}`);
  });
  startIndexer();
  startKeeper();
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
