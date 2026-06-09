import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req.session as { adminLoggedIn?: boolean }).adminLoggedIn) {
    return next();
  }
  return res.status(401).json({ error: "Non autorisé" });
}
