import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const DEFAULT_CATEGORIES = [
  { name: "Parfums",     slug: "parfums",     icon: "🌸" },
  { name: "Maillots",    slug: "maillots",    icon: "👕" },
  { name: "Chaussures",  slug: "chaussures",  icon: "👟" },
  { name: "Bracelets",   slug: "bracelets",   icon: "📿" },
  { name: "Accessoires", slug: "accessoires", icon: "💎" },
];

async function seedCategories() {
  try {
    const existing = await db.select().from(categoriesTable);
    if (existing.length === 0) {
      await db.insert(categoriesTable).values(DEFAULT_CATEGORIES);
      logger.info("Catégories seedées automatiquement");
    }
  } catch (err) {
    logger.warn({ err }, "Seed catégories ignoré (DB peut-être pas encore prête)");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  await seedCategories();
});
