import { Router } from "express";
import { db } from "@workspace/db";
import { entregasTable, motoristasTable } from "@workspace/db/schema";
import { ilike, or } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/search", async (req, res) => {
  const q = (req.query.q as string ?? "").trim();
  if (!q || q.length < 2) {
    res.json({ entregas: [], motoristas: [] });
    return;
  }

  const like = `%${q}%`;

  try {
    const [entregas, motoristas] = await Promise.all([
      db
        .select({
          id: entregasTable.id,
          codigo: entregasTable.codigo,
          destinatario: entregasTable.destinatario,
          endereco: entregasTable.endereco,
          motorista: entregasTable.motorista,
          estado: entregasTable.estado,
          prioridade: entregasTable.prioridade,
        })
        .from(entregasTable)
        .where(
          or(
            ilike(entregasTable.codigo, like),
            ilike(entregasTable.destinatario, like),
            ilike(entregasTable.motorista, like),
            ilike(entregasTable.endereco, like),
          )
        )
        .limit(6),

      db
        .select({
          id: motoristasTable.id,
          codigo: motoristasTable.codigo,
          nome: motoristasTable.nome,
          zona: motoristasTable.zona,
          veiculo: motoristasTable.veiculo,
          activo: motoristasTable.activo,
          entregasTotal: motoristasTable.entregasTotal,
          taxaSucesso: motoristasTable.taxaSucesso,
        })
        .from(motoristasTable)
        .where(
          or(
            ilike(motoristasTable.nome, like),
            ilike(motoristasTable.codigo, like),
            ilike(motoristasTable.zona, like),
          )
        )
        .limit(4),
    ]);

    res.json({ entregas, motoristas });
  } catch {
    res.status(500).json({ error: "Erro na pesquisa" });
  }
});

export default router;
