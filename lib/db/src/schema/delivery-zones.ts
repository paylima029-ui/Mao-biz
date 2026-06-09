import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryZonesTable = pgTable("delivery_zones", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  price:       numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliveryZoneSchema = createInsertSchema(deliveryZonesTable).omit({ id: true, createdAt: true });
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;
export type DeliveryZone = typeof deliveryZonesTable.$inferSelect;
