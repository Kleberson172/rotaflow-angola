import { pgTable, serial, text, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

export const historicoRotasTable = pgTable("historico_rotas", {
  id: serial("id").primaryKey(),
  motorista: text("motorista").notNull(),
  kmTotal: doublePrecision("km_total").notNull().default(0),
  kmSemOtimizacao: doublePrecision("km_sem_otimizacao").notNull().default(0),
  kmPoupados: doublePrecision("km_poupados").notNull().default(0),
  litrosGastos: doublePrecision("litros_gastos").notNull().default(0),
  kzGastos: integer("kz_gastos").notNull().default(0),
  litrosPoupados: doublePrecision("litros_poupados").notNull().default(0),
  kzPoupados: integer("kz_poupados").notNull().default(0),
  percentagemPoupanca: doublePrecision("percentagem_poupanca").notNull().default(0),
  numParagens: integer("num_paragens").notNull().default(0),
  modoTrafico: text("modo_trafico").notNull().default("normal"),
  paragemIds: jsonb("paragem_ids").notNull().default([]),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export type HistoricoRota = typeof historicoRotasTable.$inferSelect;
export type InsertHistoricoRota = typeof historicoRotasTable.$inferInsert;
