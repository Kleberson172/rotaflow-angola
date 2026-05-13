import { Router } from "express";
import { db } from "@workspace/db";
import { entregasTable, motoristasTable } from "@workspace/db/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const FUEL_L_PER_KM = 0.065;
const FUEL_PRICE_KZ = 200;
const DEPOT: [number, number] = [-8.8383, 13.2344];

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function sequentialDistance(depot: [number, number], stops: [number, number][]): number {
  if (stops.length === 0) return 0;
  let total = 0;
  let current = depot;
  for (const stop of stops) {
    total += haversine(current, stop);
    current = stop;
  }
  return total;
}

function optimizedDistance(depot: [number, number], stops: [number, number][]): number {
  if (stops.length === 0) return 0;
  const remaining = [...stops];
  let current = depot;
  let total = 0;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(current, s);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    total += bestDist;
    current = remaining[bestIdx];
    remaining.splice(bestIdx, 1);
  }
  return total;
}

router.get("/relatorios/stats", async (_req, res) => {
  try {
    const entregas = await db.select().from(entregasTable);
    const motoristas = await db.select().from(motoristasTable);

    const total = entregas.length;
    const entregues = entregas.filter((e) => e.estado === "Entregue").length;
    const pendentes = entregas.filter((e) => e.estado === "Pendente").length;
    const emRota = entregas.filter((e) => e.estado === "Em Rota").length;
    const taxaSucesso = total > 0 ? Math.round((entregues / total) * 100 * 10) / 10 : 0;

    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const mesAnteriorData = new Date(anoAtual, mesAtual - 1, 1);
    const mesAtualData = new Date(anoAtual, mesAtual, 1);

    const entregasMesAtual = entregas.filter((e) => {
      const d = new Date(e.criadoEm);
      return d >= mesAtualData;
    });
    const entregasMesAnterior = entregas.filter((e) => {
      const d = new Date(e.criadoEm);
      return d >= mesAnteriorData && d < mesAtualData;
    });

    const totalMes = entregasMesAtual.length;
    const totalMesAnterior = entregasMesAnterior.length;
    const variacaoMes =
      totalMesAnterior > 0
        ? Math.round(((totalMes - totalMesAnterior) / totalMesAnterior) * 100 * 10) / 10
        : 0;

    const desempenhoMensal: { mes: string; entregues: number; pendentes: number; emRota: number }[] = [];
    const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      const dFim = new Date(anoAtual, mesAtual - i + 1, 1);
      const grupo = entregas.filter((e) => {
        const ed = new Date(e.criadoEm);
        return ed >= d && ed < dFim;
      });
      desempenhoMensal.push({
        mes: MESES[d.getMonth()],
        entregues: grupo.filter((e) => e.estado === "Entregue").length,
        pendentes: grupo.filter((e) => e.estado === "Pendente").length,
        emRota: grupo.filter((e) => e.estado === "Em Rota").length,
      });
    }

    const entregasPorZona: Record<string, number> = {};
    for (const e of entregas) {
      const motorista = motoristas.find((m) => m.nome === e.motorista);
      const zona = motorista?.zona ?? "Outros";
      entregasPorZona[zona] = (entregasPorZona[zona] ?? 0) + 1;
    }
    const CORES_ZONA = [
      "hsl(221 83% 53%)", "hsl(142 76% 42%)", "hsl(38 92% 55%)",
      "hsl(270 76% 55%)", "hsl(0 84.2% 60%)", "hsl(197 71% 52%)",
      "hsl(330 81% 60%)", "hsl(215 20% 65%)",
    ];
    const zonas = Object.entries(entregasPorZona)
      .sort((a, b) => b[1] - a[1])
      .map(([zona, value], i) => ({
        zona,
        value,
        color: CORES_ZONA[i % CORES_ZONA.length],
      }));

    const taxaSucessoMotoristas = motoristas.map((m) => {
      const entregasMotorista = entregas.filter((e) => e.motorista === m.nome);
      const total = entregasMotorista.length;
      const entreguesM = entregasMotorista.filter((e) => e.estado === "Entregue").length;
      const taxa = total > 0 ? Math.round((entreguesM / total) * 100) : m.taxaSucesso;
      return { nome: m.nome.split(" ").slice(0, 2).join(" "), taxa, total };
    }).sort((a, b) => b.taxa - a.taxa);

    const horarioDist: Record<number, number> = {};
    for (const e of entregas) {
      const h = new Date(e.criadoEm).getHours();
      horarioDist[h] = (horarioDist[h] ?? 0) + 1;
    }
    const tendenciaDiaria = Array.from({ length: 14 }, (_, i) => {
      const h = i + 6;
      return { hora: `${String(h).padStart(2, "0")}h`, entregas: horarioDist[h] ?? 0 };
    });

    const picoHora = tendenciaDiaria.reduce((max, cur) => cur.entregas > max.entregas ? cur : max, tendenciaDiaria[0]);

    const combustivelPorMotorista = motoristas.map((m) => {
      const entregasM = entregas.filter((e) => e.motorista === m.nome && e.estado === "Entregue");
      if (entregasM.length === 0) return null;

      const stops: [number, number][] = entregasM.map((e) => [e.lat, e.lng]);

      // Sequential (unoptimized) distance — order as stored in DB
      const kmSemOtimizacao = sequentialDistance(DEPOT, stops);
      // Optimized distance — nearest neighbour TSP
      const kmOtimizado = optimizedDistance(DEPOT, stops);

      const kmPoupados = Math.max(0, kmSemOtimizacao - kmOtimizado);
      const litrosGastos = kmOtimizado * FUEL_L_PER_KM;
      const kzGastos = litrosGastos * FUEL_PRICE_KZ;
      const litrosPoupados = kmPoupados * FUEL_L_PER_KM;
      const kzPoupados = litrosPoupados * FUEL_PRICE_KZ;
      const percentagemPoupanca = kmSemOtimizacao > 0
        ? (kmPoupados / kmSemOtimizacao) * 100
        : 0;

      return {
        nome: m.nome,
        entregasTotal: entregasM.length,
        kmTotal: Math.round(kmOtimizado * 10) / 10,
        kmSemOtimizacao: Math.round(kmSemOtimizacao * 10) / 10,
        kmPoupados: Math.round(kmPoupados * 10) / 10,
        litrosGastos: Math.round(litrosGastos * 100) / 100,
        kzGastos: Math.round(kzGastos),
        litrosPoupados: Math.round(litrosPoupados * 100) / 100,
        kzPoupados: Math.round(kzPoupados),
        percentagemPoupanca: Math.round(percentagemPoupanca * 10) / 10,
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.kzPoupados - a.kzPoupados);

    const totalKzPoupados = combustivelPorMotorista.reduce((s, m) => s + m.kzPoupados, 0);
    const totalLitrosPoupados = combustivelPorMotorista.reduce((s, m) => s + m.litrosPoupados, 0);
    const totalKmPoupados = combustivelPorMotorista.reduce((s, m) => s + m.kmPoupados, 0);
    const totalLitrosGastos = combustivelPorMotorista.reduce((s, m) => s + m.litrosGastos, 0);
    const totalKzGastos = combustivelPorMotorista.reduce((s, m) => s + m.kzGastos, 0);

    res.json({
      kpis: {
        totalMes,
        variacaoMes,
        taxaSucesso,
        totalEntregas: total,
        pendentes,
        emRota,
        entregues,
        totalMotoristas: motoristas.length,
        motoristasActivos: motoristas.filter((m) => m.activo).length,
      },
      desempenhoMensal,
      entregasPorZona: zonas,
      taxaSucessoMotoristas,
      tendenciaDiaria,
      picoHora,
      combustivel: {
        porMotorista: combustivelPorMotorista,
        totalKzPoupados: Math.round(totalKzPoupados),
        totalLitrosPoupados: Math.round(totalLitrosPoupados * 100) / 100,
        totalKmPoupados: Math.round(totalKmPoupados * 10) / 10,
        totalLitrosGastos: Math.round(totalLitrosGastos * 100) / 100,
        totalKzGastos: Math.round(totalKzGastos),
        percentagemMedia: combustivelPorMotorista.length > 0
          ? combustivelPorMotorista.reduce((s, m) => s + m.percentagemPoupanca, 0) / combustivelPorMotorista.length
          : 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular relatórios" });
  }
});

export default router;
