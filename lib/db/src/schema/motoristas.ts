import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const motoristasTable = pgTable("motoristas", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  zona: text("zona").notNull().default("Luanda"),
  veiculo: text("veiculo").notNull().default("Moto"),
  activo: boolean("activo").notNull().default(true),
  entregasTotal: integer("entregas_total").notNull().default(0),
  taxaSucesso: integer("taxa_sucesso").notNull().default(100),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const insertMotoristaSchema = createInsertSchema(motoristasTable).omit({ id: true, criadoEm: true, codigo: true });
export type InsertMotorista = z.infer<typeof insertMotoristaSchema>;
export type Motorista = typeof motoristasTable.$inferSelect;
