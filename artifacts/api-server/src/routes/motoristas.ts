import { Router } from "express";
import { db } from "@workspace/db";
import { motoristasTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { criarNotificacao } from "./notificacoes";

const router = Router();

router.use(authMiddleware);

router.get("/motoristas", async (_req, res) => {
  try {
    const motoristas = await db.select().from(motoristasTable).orderBy(desc(motoristasTable.criadoEm));
    res.json(motoristas);
  } catch {
    res.status(500).json({ error: "Erro ao carregar motoristas" });
  }
});

router.post("/motoristas", async (req, res) => {
  const { nome, telefone, zona, veiculo } = req.body;
  if (!nome || !telefone) {
    res.status(400).json({ error: "Nome e telefone são obrigatórios" });
    return;
  }

  try {
    const count = await db.$count(motoristasTable);
    const codigo = `M-${String(count + 1).padStart(3, "0")}`;

    const [novo] = await db
      .insert(motoristasTable)
      .values({
        codigo,
        nome,
        telefone,
        zona: zona || "Luanda",
        veiculo: veiculo || "Moto",
        activo: true,
        entregasTotal: 0,
        taxaSucesso: 100,
      })
      .returning();

    await criarNotificacao({
      tipo: "info",
      titulo: "Novo motorista registado",
      mensagem: `${nome} (${codigo}) foi adicionado à equipa. Zona: ${zona || "Luanda"}, Veículo: ${veiculo || "Moto"}.`,
      destinatario: "empresa",
      motoristaId: novo.id,
    });

    res.status(201).json(novo);
  } catch {
    res.status(500).json({ error: "Erro ao criar motorista" });
  }
});

router.patch("/motoristas/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { activo, nome, telefone, zona, veiculo } = req.body;

  try {
    const [existing] = await db.select().from(motoristasTable).where(eq(motoristasTable.id, id)).limit(1);

    const updates: Partial<typeof motoristasTable.$inferInsert> = {};
    if (activo !== undefined) updates.activo = activo;
    if (nome) updates.nome = nome;
    if (telefone) updates.telefone = telefone;
    if (zona) updates.zona = zona;
    if (veiculo) updates.veiculo = veiculo;

    const [updated] = await db
      .update(motoristasTable)
      .set(updates)
      .where(eq(motoristasTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Motorista não encontrado" });
      return;
    }

    if (activo !== undefined && existing && existing.activo !== activo) {
      await criarNotificacao({
        tipo: activo ? "sucesso" : "aviso",
        titulo: activo ? "Motorista activado" : "Motorista desactivado",
        mensagem: activo
          ? `${updated.nome} está agora activo e disponível para receber entregas.`
          : `${updated.nome} foi desactivado e não receberá novas entregas.`,
        destinatario: "empresa",
        motoristaId: id,
      });
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao actualizar motorista" });
  }
});

router.delete("/motoristas/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db
      .delete(motoristasTable)
      .where(eq(motoristasTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Motorista não encontrado" });
      return;
    }

    await criarNotificacao({
      tipo: "aviso",
      titulo: "Motorista eliminado",
      mensagem: `${deleted.nome} (${deleted.codigo}) foi removido da equipa.`,
      destinatario: "empresa",
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao eliminar motorista" });
  }
});

export default router;
