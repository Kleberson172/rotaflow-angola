import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RelatoriosStats } from "./api";

const BLUE  = [37, 99, 235]  as [number, number, number];
const GREEN = [22, 163, 74]  as [number, number, number];
const GRAY  = [100, 116, 139] as [number, number, number];
const DARK  = [15, 23, 42]   as [number, number, number];
const LIGHT = [241, 245, 249] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const AMBER = [180, 120, 10] as [number, number, number];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...BLUE);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(title.toUpperCase(), 18, y + 4.8);
  doc.setTextColor(...DARK);
  return y + 11;
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string, color: [number, number, number]) {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.line(x, y + 3, x, y + h - 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...color);
  doc.text(value, x + 4, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  doc.text(label, x + 4, y + 17);
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.text(sub, x + 4, y + 22);
  doc.setLineWidth(0.2);
}

export async function exportRelatoriosPDF(stats: RelatoriosStats) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const mesLabel = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
  const tsLabel = now.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── HEADER ──────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text("RotaFlow Angola", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("Plataforma de Gestão de Entregas — Luanda", 14, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("RELATÓRIO DE DESEMPENHO", 210 - 14, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(mesLabel, 210 - 14, 17, { align: "right" });
  doc.text(`Gerado: ${tsLabel}`, 210 - 14, 22, { align: "right" });

  let y = 35;

  // ── KPI BOXES ───────────────────────────────────────────────
  const kpis = [
    { label: "Total este Mês", value: String(stats.kpis.totalMes), sub: `${stats.kpis.variacaoMes >= 0 ? "+" : ""}${stats.kpis.variacaoMes}% vs mês anterior`, color: BLUE },
    { label: "Taxa de Sucesso", value: `${stats.kpis.taxaSucesso}%`, sub: `${stats.kpis.entregues} de ${stats.kpis.totalEntregas}`, color: GREEN },
    { label: "Em Rota Agora", value: String(stats.kpis.emRota), sub: `${stats.kpis.pendentes} pendentes`, color: AMBER },
    { label: "Motoristas Activos", value: String(stats.kpis.motoristasActivos), sub: `de ${stats.kpis.totalMotoristas} no total`, color: [147, 51, 234] as [number, number, number] },
  ];

  const boxW = 43;
  const gap = 3;
  kpis.forEach((k, i) => {
    kpiBox(doc, 14 + i * (boxW + gap), y, boxW, 26, k.label, k.value, k.sub, k.color);
  });
  y += 32;

  // ── DESEMPENHO MENSAL ────────────────────────────────────────
  y = sectionTitle(doc, y, "Desempenho Mensal — Entregas por Estado");
  autoTable(doc, {
    startY: y,
    head: [["Mês", "Entregues", "Em Rota", "Pendentes", "Total"]],
    body: stats.desempenhoMensal.map((r) => [
      r.mes,
      r.entregues,
      r.emRota,
      r.pendentes,
      r.entregues + r.emRota + r.pendentes,
    ]),
    styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: [226, 232, 240], textColor: DARK, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { textColor: GREEN },
      2: { textColor: BLUE },
      3: { textColor: AMBER },
      4: { fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    tableWidth: 182,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── TAXA DE SUCESSO POR MOTORISTA ────────────────────────────
  y = sectionTitle(doc, y, "Taxa de Sucesso por Motorista");
  autoTable(doc, {
    startY: y,
    head: [["Motorista", "Total Entregas", "Taxa de Sucesso", "Avaliação"]],
    body: stats.taxaSucessoMotoristas.map((m) => [
      m.nome,
      m.total,
      `${m.taxa}%`,
      m.taxa >= 95 ? "⭐ Excelente" : m.taxa >= 85 ? "✓ Bom" : "⚠ Melhorar",
    ]),
    styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: [226, 232, 240], textColor: DARK, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { textColor: GREEN },
    },
    margin: { left: 14, right: 14 },
    tableWidth: 182,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── DISTRIBUIÇÃO POR ZONA ────────────────────────────────────
  y = sectionTitle(doc, y, "Distribuição de Entregas por Zona (Luanda)");
  const totalZona = stats.entregasPorZona.reduce((s, z) => s + z.value, 0) || 1;
  autoTable(doc, {
    startY: y,
    head: [["Zona", "Entregas", "Quota (%)"]],
    body: stats.entregasPorZona.map((z) => [
      z.zona,
      z.value,
      `${((z.value / totalZona) * 100).toFixed(1)}%`,
    ]),
    styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: [226, 232, 240], textColor: DARK, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
    tableWidth: 182,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── NOVA PÁGINA SE NECESSÁRIO ───────────────────────────────
  if (y > 220) {
    doc.addPage();
    y = 16;
  }

  // ── POUPANÇA DE COMBUSTÍVEL ──────────────────────────────────
  y = sectionTitle(doc, y, "Poupança de Combustível por Motorista");

  // Summary badges
  const badges = [
    { label: "Total Litros Poupados", value: `${stats.combustivel.totalLitrosPoupados.toFixed(1)} L`, color: GREEN },
    { label: "Total Economizado",     value: `${stats.combustivel.totalKzPoupados.toLocaleString("pt-PT")} Kz`, color: AMBER },
    { label: "Km Poupados",           value: `${stats.combustivel.totalKmPoupados.toFixed(1)} km`, color: BLUE },
    { label: "Poupança Média",        value: `${stats.combustivel.percentagemMedia.toFixed(0)}%`, color: [147, 51, 234] as [number, number, number] },
  ];

  const bW = 42, bH = 14;
  badges.forEach((b, i) => {
    const bx = 14 + i * (bW + 3);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(bx, y, bW, bH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...b.color);
    doc.text(b.value, bx + bW / 2, y + 6.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(b.label, bx + bW / 2, y + 11, { align: "center" });
  });
  y += bH + 5;

  autoTable(doc, {
    startY: y,
    head: [["Motorista", "Entregas", "Km Total", "Km Poupados", "Litros Poupados", "Valor (Kz)", "Poupança %"]],
    body: [
      ...stats.combustivel.porMotorista.map((m) => [
        m.nome,
        m.entregasTotal,
        `${m.kmTotal} km`,
        `${m.kmPoupados} km`,
        `${m.litrosPoupados.toFixed(1)} L`,
        `${m.kzPoupados.toLocaleString("pt-PT")} Kz`,
        `${m.percentagemPoupanca.toFixed(0)}%`,
      ]),
      // Totals row
      [
        "TOTAL GERAL",
        stats.combustivel.porMotorista.reduce((s, m) => s + m.entregasTotal, 0),
        `${stats.combustivel.porMotorista.reduce((s, m) => s + m.kmTotal, 0)} km`,
        `${stats.combustivel.totalKmPoupados.toFixed(1)} km`,
        `${stats.combustivel.totalLitrosPoupados.toFixed(1)} L`,
        `${stats.combustivel.totalKzPoupados.toLocaleString("pt-PT")} Kz`,
        `${stats.combustivel.percentagemMedia.toFixed(0)}%`,
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2.8, textColor: DARK },
    headStyles: { fillColor: [226, 232, 240], textColor: DARK, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    bodyStyles: { valign: "middle" },
    columnStyles: {
      0: { fontStyle: "bold" },
      4: { textColor: GREEN },
      5: { textColor: AMBER },
      6: { textColor: GREEN, fontStyle: "bold" },
    },
    // Bold last row (totals)
    didParseCell(data) {
      if (data.row.index === stats.combustivel.porMotorista.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 240, 230];
        data.cell.styles.textColor = [20, 83, 45];
      }
    },
    margin: { left: 14, right: 14 },
    tableWidth: 182,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── PICO HORÁRIO ─────────────────────────────────────────────
  if (stats.picoHora && stats.picoHora.entregas > 0) {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(14, y, 182, 12, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(
      `⏱  Hora de pico: ${stats.picoHora.hora} com ${stats.picoHora.entregas} entregas registadas.`,
      18, y + 7.5
    );
    y += 16;
  }

  // ── FOOTER ON ALL PAGES ──────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...DARK);
    doc.rect(0, ph - 10, pw, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("RotaFlow Angola — Confidencial", 14, ph - 3.5);
    doc.text(`Página ${p} de ${pageCount}`, pw - 14, ph - 3.5, { align: "right" });
  }

  // ── SAVE ────────────────────────────────────────────────────
  const filename = `RotaFlow_Relatorio_${mesLabel.replace(" ", "_")}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`;
  doc.save(filename);
}
