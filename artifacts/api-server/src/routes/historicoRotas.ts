import { Router } from "express";
import { db } from "@workspace/db";
import { historicoRotasTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/historico-rotas", async (req, res) => {
  try {
    const { motorista } = req.query;
    let rows;
    if (motorista && typeof motorista === "string") {
      rows = await db.select().from(historicoRotasTable)
        .where(eq(historicoRotasTable.motorista, motorista))
        .orderBy(desc(historicoRotasTable.criadoEm))
        .limit(50);
    } else {
      rows = await db.select().from(historicoRotasTable)
        .orderBy(desc(historicoRotasTable.criadoEm))
        .limit(100);
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar histórico de rotas" });
  }
});

router.post("/historico-rotas", async (req, res) => {
  try {
    const {
      motorista, kmTotal, kmSemOtimizacao, kmPoupados,
      litrosGastos, kzGastos, litrosPoupados, kzPoupados,
      percentagemPoupanca, numParagens, modoTrafico, paragemIds,
    } = req.body;

    if (!motorista) {
      res.status(400).json({ error: "Motorista é obrigatório" });
      return;
    }

    const [row] = await db.insert(historicoRotasTable).values({
      motorista,
      kmTotal: kmTotal ?? 0,
      kmSemOtimizacao: kmSemOtimizacao ?? 0,
      kmPoupados: kmPoupados ?? 0,
      litrosGastos: litrosGastos ?? 0,
      kzGastos: kzGastos ?? 0,
      litrosPoupados: litrosPoupados ?? 0,
      kzPoupados: kzPoupados ?? 0,
      percentagemPoupanca: percentagemPoupanca ?? 0,
      numParagens: numParagens ?? 0,
      modoTrafico: modoTrafico ?? "normal",
      paragemIds: paragemIds ?? [],
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao guardar histórico de rota" });
  }
});

router.delete("/historico-rotas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(historicoRotasTable).where(eq(historicoRotasTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao eliminar registo" });
  }
});

export default router;
