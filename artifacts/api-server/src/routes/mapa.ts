import { Router } from "express";
import { db } from "@workspace/db";
import { motoristasTable, entregasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// Luanda depot base coordinates
const DEPOT_LAT = -8.838;
const DEPOT_LNG = 13.234;

// Luanda neighbourhood zone centres for idle motoristas
const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  "Talatona":       { lat: -8.9167, lng: 13.1833 },
  "Miramar":        { lat: -8.8100, lng: 13.2300 },
  "Maianga":        { lat: -8.8300, lng: 13.2400 },
  "Ingombota":      { lat: -8.8200, lng: 13.2350 },
  "Sambizanga":     { lat: -8.8000, lng: 13.2500 },
  "Rangel":         { lat: -8.8450, lng: 13.2600 },
  "Cacuaco":        { lat: -8.7700, lng: 13.3500 },
  "Viana":          { lat: -8.9000, lng: 13.3700 },
  "Kilamba":        { lat: -8.9500, lng: 13.3000 },
  "Luanda":         { lat: -8.8383, lng: 13.2344 },
};

router.get("/mapa/motoristas", async (_req, res) => {
  try {
    const motoristas = await db
      .select()
      .from(motoristasTable)
      .orderBy(motoristasTable.nome);

    // Get active deliveries (Em Rota) per motorista
    const emRota = await db
      .select()
      .from(entregasTable)
      .where(eq(entregasTable.estado, "Em Rota"));

    // Map motorista name → active deliveries
    const emRotaByMotorista: Record<string, typeof emRota> = {};
    for (const e of emRota) {
      if (!emRotaByMotorista[e.motorista]) emRotaByMotorista[e.motorista] = [];
      emRotaByMotorista[e.motorista].push(e);
    }

    // Pending deliveries per motorista
    const pendentes = await db
      .select()
      .from(entregasTable)
      .where(eq(entregasTable.estado, "Pendente"));

    const pendentesByMotorista: Record<string, number> = {};
    for (const e of pendentes) {
      pendentesByMotorista[e.motorista] = (pendentesByMotorista[e.motorista] || 0) + 1;
    }

    const result = motoristas.map((m) => {
      const entregasAtivas = emRotaByMotorista[m.nome] || [];
      const pendenteCount = pendentesByMotorista[m.nome] || 0;

      // Position: use first active delivery coords, else zone centre, else depot
      let lat: number;
      let lng: number;

      if (entregasAtivas.length > 0) {
        const e = entregasAtivas[0];
        lat = Number(e.lat) || DEPOT_LAT;
        lng = Number(e.lng) || DEPOT_LNG;
      } else {
        const zone = ZONE_COORDS[m.zona] || ZONE_COORDS["Luanda"];
        // Slight random offset so markers don't stack
        lat = zone.lat + (Math.random() - 0.5) * 0.008;
        lng = zone.lng + (Math.random() - 0.5) * 0.012;
      }

      const estadoMotorista: "em_rota" | "disponivel" | "inactivo" =
        !m.activo ? "inactivo"
        : entregasAtivas.length > 0 ? "em_rota"
        : "disponivel";

      return {
        id: m.id,
        codigo: m.codigo,
        nome: m.nome,
        telefone: m.telefone,
        zona: m.zona,
        veiculo: m.veiculo,
        activo: m.activo,
        entregasTotal: m.entregasTotal,
        taxaSucesso: m.taxaSucesso,
        estado: estadoMotorista,
        lat,
        lng,
        entregasEmRota: entregasAtivas.length,
        entregasPendentes: pendenteCount,
        entregaAtual: entregasAtivas[0]
          ? {
              id: entregasAtivas[0].id,
              codigo: entregasAtivas[0].codigo,
              destinatario: entregasAtivas[0].destinatario,
              endereco: entregasAtivas[0].endereco,
              prioridade: entregasAtivas[0].prioridade,
            }
          : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar posições dos motoristas" });
  }
});

export default router;
