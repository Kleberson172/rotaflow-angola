import { Router } from "express";
import { db } from "@workspace/db";
import { notificacoesTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/notificacoes", async (req: AuthRequest, res) => {
  try {
    const notificacoes = await db
      .select()
      .from(notificacoesTable)
      .orderBy(desc(notificacoesTable.criadoEm))
      .limit(50);
    res.json(notificacoes);
  } catch {
    res.status(500).json({ error: "Erro ao carregar notificações" });
  }
});

router.get("/notificacoes/nao-lidas", async (_req, res) => {
  try {
    const count = await db.$count(notificacoesTable, eq(notificacoesTable.lida, false));
    res.json({ count });
  } catch {
    res.status(500).json({ error: "Erro ao contar notificações" });
  }
});

router.patch("/notificacoes/:id/ler", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [updated] = await db
      .update(notificacoesTable)
      .set({ lida: true })
      .where(eq(notificacoesTable.id, id))
      .returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao marcar notificação" });
  }
});

router.patch("/notificacoes/ler-todas", async (_req, res) => {
  try {
    await db
      .update(notificacoesTable)
      .set({ lida: true })
      .where(eq(notificacoesTable.lida, false));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao marcar notificações" });
  }
});

router.delete("/notificacoes/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.delete(notificacoesTable).where(eq(notificacoesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao eliminar notificação" });
  }
});

export async function criarNotificacao(data: {
  tipo?: string;
  titulo: string;
  mensagem: string;
  destinatario?: string;
  motoristaId?: number;
  entregaId?: number;
}) {
  try {
    await db.insert(notificacoesTable).values({
      tipo: data.tipo ?? "info",
      titulo: data.titulo,
      mensagem: data.mensagem,
      destinatario: data.destinatario ?? "empresa",
      motoristaId: data.motoristaId ?? null,
      entregaId: data.entregaId ?? null,
      lida: false,
    });
  } catch (err) {
    console.error("Erro ao criar notificação:", err);
  }
}

export default router;
