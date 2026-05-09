import { Router } from "express";
import { db } from "@workspace/db";
import { entregasTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { criarNotificacao } from "./notificacoes";

const router = Router();

router.use(authMiddleware);

router.get("/entregas", async (req: AuthRequest, res) => {
  try {
    let entregas;
    if (req.userPapel === "entregador" && req.userMotoristaNome) {
      entregas = await db
        .select()
        .from(entregasTable)
        .where(eq(entregasTable.motorista, req.userMotoristaNome))
        .orderBy(desc(entregasTable.criadoEm));
    } else {
      entregas = await db.select().from(entregasTable).orderBy(desc(entregasTable.criadoEm));
    }
    res.json(entregas);
  } catch {
    res.status(500).json({ error: "Erro ao carregar entregas" });
  }
});

router.post("/entregas", async (req: AuthRequest, res) => {
  if (req.userPapel === "entregador") {
    res.status(403).json({ error: "Sem permissão para criar entregas" });
    return;
  }

  const { destinatario, telefone, endereco, motorista, prioridade, lat, lng } = req.body;
  if (!destinatario || !endereco || !motorista) {
    res.status(400).json({ error: "Campos obrigatórios: destinatario, endereco, motorista" });
    return;
  }

  try {
    const count = await db.$count(entregasTable);
    const codigo = `RF-${String(count + 1).padStart(3, "0")}`;

    const [nova] = await db
      .insert(entregasTable)
      .values({
        codigo,
        destinatario,
        telefone: telefone || "+244 900 000 000",
        endereco,
        motorista,
        estado: "Pendente",
        prioridade: prioridade || "Normal",
        lat: lat ?? (-8.83 + (Math.random() - 0.5) * 0.3),
        lng: lng ?? (13.24 + (Math.random() - 0.5) * 0.3),
      })
      .returning();

    await criarNotificacao({
      tipo: prioridade === "Urgente" ? "urgente" : "info",
      titulo: "Nova entrega registada",
      mensagem: `Entrega ${codigo} criada para ${destinatario} — ${endereco}. Motorista: ${motorista}.${prioridade === "Urgente" ? " ⚡ URGENTE" : ""}`,
      destinatario: "empresa",
      entregaId: nova.id,
    });

    await criarNotificacao({
      tipo: "info",
      titulo: "Nova entrega atribuída",
      mensagem: `Tens uma nova entrega ${codigo} para ${destinatario} em ${endereco}.`,
      destinatario: "motorista",
      entregaId: nova.id,
    });

    res.status(201).json(nova);
  } catch {
    res.status(500).json({ error: "Erro ao criar entrega" });
  }
});

router.patch("/entregas/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { estado, motorista, prioridade } = req.body;

  try {
    const [existing] = await db.select().from(entregasTable).where(eq(entregasTable.id, id)).limit(1);

    const updates: Partial<typeof entregasTable.$inferInsert> = {};
    if (estado) updates.estado = estado;
    if (motorista && req.userPapel !== "entregador") updates.motorista = motorista;
    if (prioridade && req.userPapel !== "entregador") updates.prioridade = prioridade;

    let query;
    if (req.userPapel === "entregador" && req.userMotoristaNome) {
      query = db
        .update(entregasTable)
        .set(updates)
        .where(and(eq(entregasTable.id, id), eq(entregasTable.motorista, req.userMotoristaNome)))
        .returning();
    } else {
      query = db.update(entregasTable).set(updates).where(eq(entregasTable.id, id)).returning();
    }

    const [updated] = await query;

    if (!updated) {
      res.status(404).json({ error: "Entrega não encontrada" });
      return;
    }

    if (estado && existing && existing.estado !== estado) {
      const estadoLabel: Record<string, string> = {
        "Pendente": "Pendente",
        "Em Rota": "Em Rota 🚚",
        "Entregue": "Entregue ✅",
      };

      await criarNotificacao({
        tipo: estado === "Entregue" ? "sucesso" : "info",
        titulo: `Entrega ${updated.codigo} — ${estadoLabel[estado] ?? estado}`,
        mensagem: `A entrega para ${updated.destinatario} (${updated.endereco}) foi actualizada para "${estado}".`,
        destinatario: "empresa",
        entregaId: id,
      });

      if (estado === "Em Rota" || estado === "Entregue") {
        await criarNotificacao({
          tipo: estado === "Entregue" ? "sucesso" : "info",
          titulo: estado === "Entregue" ? "Entrega concluída!" : "A sua encomenda está a caminho",
          mensagem: estado === "Entregue"
            ? `A sua encomenda foi entregue com sucesso em ${updated.endereco}. Obrigado por escolher a RotaFlow!`
            : `O seu motorista ${updated.motorista} está a caminho com a sua encomenda para ${updated.endereco}.`,
          destinatario: "cliente",
          entregaId: id,
        });
      }

      if (estado === "Em Rota") {
        await criarNotificacao({
          tipo: "info",
          titulo: "Iniciar entrega",
          mensagem: `A entrega ${updated.codigo} para ${updated.destinatario} em ${updated.endereco} foi activada. Boa viagem!`,
          destinatario: "motorista",
          entregaId: id,
        });
      }
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao actualizar entrega" });
  }
});

router.delete("/entregas/:id", async (req: AuthRequest, res) => {
  if (req.userPapel === "entregador") {
    res.status(403).json({ error: "Sem permissão para eliminar entregas" });
    return;
  }

  const id = Number(req.params.id);
  try {
    const [deleted] = await db
      .delete(entregasTable)
      .where(eq(entregasTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Entrega não encontrada" });
      return;
    }

    await criarNotificacao({
      tipo: "aviso",
      titulo: "Entrega eliminada",
      mensagem: `A entrega ${deleted.codigo} para ${deleted.destinatario} foi eliminada do sistema.`,
      destinatario: "empresa",
      entregaId: id,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erro ao eliminar entrega" });
  }
});

export default router;
