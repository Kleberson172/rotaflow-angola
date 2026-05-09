import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { utilizadoresTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_USERS = [
  {
    nome: "Administrador",
    email: "admin@rotaflow.ao",
    senha: "admin123",
    papel: "administrador",
    activo: true,
  },
  {
    nome: "António Silva",
    email: "antonio@rotaflow.ao",
    senha: "entrega123",
    papel: "entregador",
    activo: true,
  },
];

export async function seedDefaultUsers() {
  for (const u of DEFAULT_USERS) {
    const [existing] = await db
      .select({ id: utilizadoresTable.id })
      .from(utilizadoresTable)
      .where(eq(utilizadoresTable.email, u.email))
      .limit(1);

    if (!existing) {
      const hash = await bcrypt.hash(u.senha, 10);
      await db.insert(utilizadoresTable).values({
        nome: u.nome,
        email: u.email,
        senha: hash,
        papel: u.papel,
        activo: u.activo,
      });
      console.log(`[seed] Utilizador criado: ${u.email} (${u.papel})`);
    }
  }
}
