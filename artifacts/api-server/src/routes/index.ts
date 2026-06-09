import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import authRouter from "./auth";
import uploadRouter from "./upload";
import paymentRouter from "./payment";
import deliveryZonesRouter from "./delivery-zones";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/orders", ordersRouter);          // auth handled per-route inside
router.use("/admin/auth", authRouter);
router.use("/admin", requireAdmin, adminRouter);
router.use("/upload", uploadRouter);
router.use("/payment", paymentRouter);
router.use("/delivery-zones", deliveryZonesRouter);

export default router;
