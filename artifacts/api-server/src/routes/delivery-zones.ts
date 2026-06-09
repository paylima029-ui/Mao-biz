import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryZonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatZone(z: typeof deliveryZonesTable.$inferSelect) {
  return {
    ...z,
    price: Number(z.price),
    createdAt: z.createdAt.toISOString(),
  };
}

// PUBLIC — list active delivery zones
router.get("/", async (_req, res) => {
  const zones = await db
    .select()
    .from(deliveryZonesTable)
    .where(eq(deliveryZonesTable.isActive, true))
    .orderBy(deliveryZonesTable.price);
  return res.json(zones.map(formatZone));
});

export { formatZone };
export default router;
