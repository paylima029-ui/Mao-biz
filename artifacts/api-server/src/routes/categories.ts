import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await db.select().from(categoriesTable);
  return res.json(categories);
});

export default router;
