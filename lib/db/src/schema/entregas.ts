import { pgTable, serial, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entregasTable = pgTable("entregas", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  destinatario: text("destinatario").notNull(),
  telefone: text("telefone").notNull().default("+244 900 000 000"),
  endereco: text("endereco").notNull(),
  motorista: text("motorista").notNull(),
  estado: text("estado").notNull().default("Pendente"),
  prioridade: text("prioridade").notNull().default("Normal"),
  lat: doublePrecision("lat").notNull().default(-8.8383),
  lng: doublePrecision("lng").notNull().default(13.2344),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const insertEntregaSchema = createInsertSchema(entregasTable).omit({ id: true, criadoEm: true, codigo: true });
export type InsertEntrega = z.infer<typeof insertEntregaSchema>;
export type Entrega = typeof entregasTable.$inferSelect;
