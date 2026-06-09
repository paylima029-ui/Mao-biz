import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";

const router = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    ...o,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
  };
}

// PUBLIC — customer order lookup by phone number
router.get("/my-orders", async (req, res) => {
  const phone = (req.query.phone as string | undefined)?.trim();
  if (!phone) return res.status(400).json({ error: "Numéro de téléphone requis" });

  // Normalize: keep only digits and leading +
  const normalized = phone.replace(/\s/g, "");

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerPhone, normalized))
    .orderBy(ordersTable.createdAt);

  return res.json(orders.map(formatOrder));
});

// PUBLIC — list orders (admin only)
router.get("/", requireAdmin, async (req, res) => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });

  let query = db.select().from(ordersTable).$dynamic();
  if (parsed.data.status) {
    query = query.where(eq(ordersTable.status, parsed.data.status));
  }

  const orders = await query.orderBy(ordersTable.createdAt);
  return res.json(orders.map(formatOrder));
});

// PUBLIC — create order (any customer)
router.post("/", async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { items, paymentMethod, customerName, customerPhone, customerAddress, deliveryZoneId, deliveryZoneName, deliveryFee } = parsed.data;

  const itemsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fee = deliveryFee ?? 0;
  const total = itemsTotal + fee;
  const orderNumber = `MAO-${Date.now().toString(36).toUpperCase()}`;

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber,
      customerName,
      customerPhone,
      customerAddress,
      items,
      total: total.toString(),
      paymentMethod,
      status: "pending",
      deliveryZoneId: deliveryZoneId ?? null,
      deliveryZoneName: deliveryZoneName ?? null,
      deliveryFee: fee.toString(),
    })
    .returning();

  // Decrease stock
  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (product && product.stock > 0) {
      await db
        .update(productsTable)
        .set({ stock: Math.max(0, product.stock - item.quantity) })
        .where(eq(productsTable.id, item.productId));
    }
  }

  return res.status(201).json(formatOrder(order));
});

// PUBLIC — get single order (customer needs to see their order confirmation)
router.get("/:id", async (req, res) => {
  const parsed = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.id));
  if (!order) return res.status(404).json({ error: "Not found" });

  return res.json(formatOrder(order));
});

// ADMIN — update order status
router.patch("/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateOrderStatusParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid body" });

  const [order] = await db
    .update(ordersTable)
    .set({ status: bodyParsed.data.status })
    .where(eq(ordersTable.id, paramsParsed.data.id))
    .returning();

  if (!order) return res.status(404).json({ error: "Not found" });

  return res.json(formatOrder(order));
});

export default router;
