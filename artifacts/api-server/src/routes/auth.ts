import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { utilizadoresTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  try {
    const [utilizador] = await db
      .select()
      .from(utilizadoresTable)
      .where(eq(utilizadoresTable.email, email))
      .limit(1);

    if (!utilizador) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const senhaValida = await bcrypt.compare(senha, utilizador.senha);
    if (!senhaValida) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const token = signToken({
      id: utilizador.id,
      email: utilizador.email,
      papel: utilizador.papel,
      motoristaNome: utilizador.motoristaNome ?? undefined,
    });

    res.json({
      token,
      utilizador: {
        id: utilizador.id,
        nome: utilizador.nome,
        email: utilizador.email,
        papel: utilizador.papel,
        motoristaNome: utilizador.motoristaNome ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [utilizador] = await db
      .select({
        id: utilizadoresTable.id,
        nome: utilizadoresTable.nome,
        email: utilizadoresTable.email,
        papel: utilizadoresTable.papel,
        motoristaNome: utilizadoresTable.motoristaNome,
      })
      .from(utilizadoresTable)
      .where(eq(utilizadoresTable.id, req.userId!))
      .limit(1);

    if (!utilizador) {
      res.status(404).json({ error: "Utilizador não encontrado" });
      return;
    }
    res.json({ ...utilizador, motoristaNome: utilizador.motoristaNome ?? null });
  } catch {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
