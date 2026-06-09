import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable, deliveryZonesTable } from "@workspace/db";
import { sql, gte, eq } from "drizzle-orm";
import { z } from "zod";
import { formatZone } from "./delivery-zones";

const router = Router();

router.get("/stats", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${ordersTable.total}::numeric), 0)::numeric`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, today));

  const statusCounts = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const [lowStock] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(sql`${productsTable.stock} <= 5`);

  const totalSoldResult = await db.execute(
    sql`SELECT coalesce(sum(jsonb_array_length(items)), 0)::int AS total FROM orders`
  );
  const totalSoldRow = totalSoldResult.rows[0] as { total: number } | undefined;

  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) {
    statusMap[row.status] = Number(row.count);
  }

  return res.json({
    todayOrders: Number(todayStats?.count ?? 0),
    todayRevenue: Number(todayStats?.revenue ?? 0),
    totalProductsSold: Number(totalSoldRow?.total ?? 0),
    lowStockCount: Number(lowStock?.count ?? 0),
    pendingOrders: statusMap["pending"] ?? 0,
    confirmedOrders: statusMap["confirmed"] ?? 0,
    deliveredOrders: statusMap["delivered"] ?? 0,
  });
});

// ─── Delivery Zones Admin CRUD ─────────────────────────────────────────────

const deliveryZoneInputSchema = z.object({
  name:        z.string().min(1),
  description: z.string().nullable().optional(),
  price:       z.coerce.number().min(0),
  isActive:    z.boolean().optional().default(true),
});

router.get("/delivery-zones", async (_req, res) => {
  const zones = await db
    .select()
    .from(deliveryZonesTable)
    .orderBy(deliveryZonesTable.price);
  return res.json(zones.map(formatZone));
});

router.post("/delivery-zones", async (req, res) => {
  const parsed = deliveryZoneInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { price, ...rest } = parsed.data;
  const [zone] = await db
    .insert(deliveryZonesTable)
    .values({ ...rest, price: price.toString() })
    .returning();
  return res.status(201).json(formatZone(zone));
});

router.put("/delivery-zones/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = deliveryZoneInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { price, ...rest } = parsed.data;
  const [zone] = await db
    .update(deliveryZonesTable)
    .set({ ...rest, price: price.toString() })
    .where(eq(deliveryZonesTable.id, id))
    .returning();

  if (!zone) return res.status(404).json({ error: "Not found" });
  return res.json(formatZone(zone));
});

router.delete("/delivery-zones/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(deliveryZonesTable).where(eq(deliveryZonesTable.id, id));
  return res.status(204).send();
});

export default router;
