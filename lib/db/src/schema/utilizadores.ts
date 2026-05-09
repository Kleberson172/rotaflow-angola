import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const utilizadoresTable = pgTable("utilizadores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  papel: text("papel").notNull().default("operador"),
  motoristaNome: text("motorista_nome"),
  activo: boolean("activo").notNull().default(true),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const insertUtilizadorSchema = createInsertSchema(utilizadoresTable).omit({ id: true, criadoEm: true });
export type InsertUtilizador = z.infer<typeof insertUtilizadorSchema>;
export type Utilizador = typeof utilizadoresTable.$inferSelect;
