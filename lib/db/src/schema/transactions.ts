import { pgTable, serial, text, numeric, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const transactionsTable = pgTable("transactions", {
  id:              serial("id").primaryKey(),
  transactionId:   text("transaction_id").unique(),
  chargeId:        text("charge_id"),
  clientReference: text("client_reference").unique().notNull(),
  orderId:         integer("order_id").references(() => ordersTable.id),
  customerName:    text("customer_name").notNull(),
  customerPhone:   text("customer_phone").notNull(),
  amount:          numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency:        text("currency").notNull().default("XOF"),
  paymentMethod:   text("payment_method").notNull(),
  status:          text("status").notNull().default("pending"),
  paymentUrl:      text("payment_url"),
  webhookData:     jsonb("webhook_data"),
  errorMessage:    text("error_message"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
