import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { utilizadoresTable, motoristasTable } from "@workspace/db/schema";
import { eq, ne } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { criarNotificacao } from "./notificacoes";

const router = Router();
router.use(authMiddleware);

function isAdmin(req: AuthRequest, res: any): boolean {
  if (req.userPapel !== "administrador") {
    res.status(403).json({ error: "Apenas administradores podem gerir utilizadores" });
    return false;
  }
  return true;
}

router.get("/utilizadores", async (req: AuthRequest, res) => {
  if (!isAdmin(req, res)) return;
  try {
    const utilizadores = await db
      .select({
        id: utilizadoresTable.id,
        nome: utilizadoresTable.nome,
        email: utilizadoresTable.email,
        papel: utilizadoresTable.papel,
        motoristaNome: utilizadoresTable.motoristaNome,
        activo: utilizadoresTable.activo,
        criadoEm: utilizadoresTable.criadoEm,
      })
      .from(utilizadoresTable)
      .orderBy(utilizadoresTable.criadoEm);
    res.json(utilizadores);
  } catch {
    res.status(500).json({ error: "Erro ao carregar utilizadores" });
  }
});

router.post("/utilizadores", async (req: AuthRequest, res) => {
  if (!isAdmin(req, res)) return;
  const { nome, email, senha, papel, motoristaNome } = req.body;

  if (!nome || !email || !senha) {
    res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    return;
  }

  const papelValido = ["administrador", "operador", "entregador"].includes(papel);
  if (!papelValido) {
    res.status(400).json({ error: "Papel inválido" });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: utilizadoresTable.id })
      .from(utilizadoresTable)
      .where(eq(utilizadoresTable.email, email))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Já existe um utilizador com este email" });
      return;
    }

    const hash = await bcrypt.hash(senha, 10);
    const [novo] = await db
      .insert(utilizadoresTable)
      .values({
        nome,
        email,
        senha: hash,
        papel,
        motoristaNome: papel === "entregador" ? motoristaNome ?? null : null,
        activo: true,
      })
      .returning({
        id: utilizadoresTable.id,
        nome: utilizadoresTable.nome,
        email: utilizadoresTable.email,
        papel: utilizadoresTable.papel,
        motoristaNome: utilizadoresTable.motoristaNome,
        activo: utilizadoresTable.activo,
        criadoEm: utilizadoresTable.criadoEm,
      });

    await criarNotificacao({
      tipo: "info",
      titulo: "Novo utilizador criado",
      mensagem: `${nome} (${email}) foi adicionado como ${papel}.`,
      destinatario: "empresa",
    });

    res.status(201).json(novo);
  } catch {
    res.status(500).json({ error: "Erro ao criar utilizador" });
  }
});

router.patch("/utilizadores/:id", async (req: AuthRequest, res) => {
  if (!isAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { nome, email, papel, motoristaNome, activo } = req.body;

  if (id === req.userId && activo === false) {
    res.status(400).json({ error: "Não pode desactivar a sua própria conta" });
    return;
  }

  try {
    const updates: Partial<typeof utilizadoresTable.$inferInsert> = {};
    if (nome !== undefined) updates.nome = nome;
    if (email !== undefined) updates.email = email;
    if (papel !== undefined) updates.papel = papel;
    if (motoristaNome !== undefined) updates.motoristaNome = motoristaNome;
    if (activo !== undefined) updates.activo = activo;

    const [updated] = await db
      .update(utilizadoresTable)
      .set(updates)
      .where(eq(utilizadoresTable.id, id))
      .returning({
        id: utilizadoresTable.id,
        nome: utilizadoresTable.nome,
        email: utilizadoresTable.email,
        papel: utilizadoresTable.papel,
        motoristaNome: utilizadoresTable.motoristaNome,
        activo: utilizadoresTable.activo,
        criadoEm: utilizadoresTable.criadoEm,
      });

    if (!updated) {
      res.status(404).json({ error: "Utilizador não encontrado" });
      return;
    }

    if (activo !== undefined) {
      await criarNotificacao({
        tipo: activo ? "sucesso" : "aviso",
        titulo: activo ? "Utilizador activado" : "Utilizador desactivado",
        mensagem: `${updated.nome} (${updated.email}) foi ${activo ? "activado" : "desactivado"}.`,
        destinatario: "empresa",
      });
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao actualizar utilizador" });
  }
});

router.delete("/utilizadores/:id", async (req: AuthRequest, res) => {
  if (!isAdmin(req, res)) return;
  const id = Number(req.params.id);

  if (id === req.userId) {
    res.status(400).json({ error: "Não pode eliminar a sua própria conta" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(utilizadoresTable)
      .where(eq(utilizadoresTable.id, id))
      .returning({ nome: utilizadoresTable.nome, email: utilizadoresTable.email });

    if (!deleted) {
      res.status(404).json({ error: "Utilizador não encontrado" });
      return;
    }

    await criarNotificacao({
      tipo: "aviso",
      titulo: "Utilizador eliminado",
      mensagem: `${deleted.nome} (${deleted.email}) foi removido do sistema.`,
      destinatario: "empresa",
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao eliminar utilizador" });
  }
});

router.post("/auth/change-password", async (req: AuthRequest, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha) {
    res.status(400).json({ error: "Senha actual e nova senha são obrigatórias" });
    return;
  }
  if (novaSenha.length < 6) {
    res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
    return;
  }

  try {
    const [utilizador] = await db
      .select()
      .from(utilizadoresTable)
      .where(eq(utilizadoresTable.id, req.userId!))
      .limit(1);

    if (!utilizador) {
      res.status(404).json({ error: "Utilizador não encontrado" });
      return;
    }

    const valida = await bcrypt.compare(senhaAtual, utilizador.senha);
    if (!valida) {
      res.status(401).json({ error: "Senha actual incorrecta" });
      return;
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await db
      .update(utilizadoresTable)
      .set({ senha: hash })
      .where(eq(utilizadoresTable.id, req.userId!));

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao alterar senha" });
  }
});

router.get("/motoristas/lista-nomes", async (_req, res) => {
  try {
    const motoristas = await db
      .select({ nome: motoristasTable.nome, activo: motoristasTable.activo })
      .from(motoristasTable)
      .orderBy(motoristasTable.nome);
    res.json(motoristas);
  } catch {
    res.status(500).json({ error: "Erro ao carregar motoristas" });
  }
});

export default router;
