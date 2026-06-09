import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "maobiz2024";

router.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Données invalides" });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  (req.session as { adminLoggedIn?: boolean }).adminLoggedIn = true;
  return res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/me", requireAdmin, (_req, res) => {
  return res.json({ authenticated: true, username: process.env.ADMIN_USERNAME ?? "admin" });
});

export default router;
