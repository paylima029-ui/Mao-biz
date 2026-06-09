import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }
  const { category, search, featured, onSale, isNew } = parsed.data;

  const conditions = [];
  if (category) conditions.push(eq(productsTable.categorySlug, category));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured === true) conditions.push(eq(productsTable.isFeatured, true));
  if (onSale === true) conditions.push(eq(productsTable.onSale, true));
  if (isNew === true) conditions.push(eq(productsTable.isNew, true));

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return res.json(
    products.map((p) => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice !== null ? Number(p.originalPrice) : null,
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const { isFeatured, isNew, onSale, stock, price, originalPrice, ...rest } = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      price: price.toString(),
      originalPrice: originalPrice != null ? originalPrice.toString() : null,
      stock: stock ?? 0,
      isFeatured: isFeatured ?? false,
      isNew: isNew ?? false,
      onSale: onSale ?? false,
    })
    .returning();
  return res.status(201).json({
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice !== null ? Number(product.originalPrice) : null,
    createdAt: product.createdAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, parsed.data.id));

  if (!product) return res.status(404).json({ error: "Not found" });

  return res.json({
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice !== null ? Number(product.originalPrice) : null,
    createdAt: product.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const paramsParsed = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateProductBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid body" });

  const { price: updPrice, originalPrice: updOriginalPrice, ...restUpdate } = bodyParsed.data;
  const [product] = await db
    .update(productsTable)
    .set({
      ...restUpdate,
      ...(updPrice !== undefined ? { price: updPrice.toString() } : {}),
      ...(updOriginalPrice !== undefined ? { originalPrice: updOriginalPrice != null ? updOriginalPrice.toString() : null } : {}),
    })
    .where(eq(productsTable.id, paramsParsed.data.id))
    .returning();

  if (!product) return res.status(404).json({ error: "Not found" });

  return res.json({
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice !== null ? Number(product.originalPrice) : null,
    createdAt: product.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(productsTable).where(eq(productsTable.id, parsed.data.id));
  return res.status(204).send();
});

export default router;
