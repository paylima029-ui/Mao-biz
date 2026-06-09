import { pgTable, serial, text, numeric, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  items: jsonb("items").notNull().$type<{
    productId: number;
    productName: string;
    productImageUrl: string;
    quantity: number;
    unitPrice: number;
  }[]>(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  deliveryZoneId:   integer("delivery_zone_id"),
  deliveryZoneName: text("delivery_zone_name"),
  deliveryFee:      numeric("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, orderNumber: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
