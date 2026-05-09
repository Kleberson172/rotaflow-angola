import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const notificacoesTable = pgTable("notificacoes", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull().default("info"),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  destinatario: text("destinatario").notNull().default("empresa"),
  motoristaId: integer("motorista_id"),
  entregaId: integer("entrega_id"),
  lida: boolean("lida").notNull().default(false),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export type Notificacao = typeof notificacoesTable.$inferSelect;
