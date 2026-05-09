import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "rotaflow-angola-secret-2026";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userPapel?: string;
  userMotoristaNome?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticação necessário" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; papel: string; motoristaNome?: string };
    req.userId = payload.id;
    req.userEmail = payload.email;
    req.userPapel = payload.papel;
    req.userMotoristaNome = payload.motoristaNome;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function signToken(payload: { id: number; email: string; papel: string; motoristaNome?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
