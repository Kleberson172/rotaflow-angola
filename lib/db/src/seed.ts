import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import { utilizadoresTable, motoristasTable, entregasTable } from "./schema/index.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("🌱 A semear a base de dados...");

  const adminSenha = await bcrypt.hash("admin123", 10);
  const entregadorSenha = await bcrypt.hash("entrega123", 10);

  await db.insert(utilizadoresTable).values([
    { nome: "Administrador", email: "admin@rotaflow.ao", senha: adminSenha, papel: "administrador" },
    { nome: "António Ferreira", email: "antonio@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "António Ferreira" },
    { nome: "João Manuel", email: "joao@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "João Manuel" },
    { nome: "Pedro Luvualu", email: "pedro@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "Pedro Luvualu" },
    { nome: "Carlos Mbemba", email: "carlos@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "Carlos Mbemba" },
  ]).onConflictDoNothing();

  await db.insert(motoristasTable).values([
    { codigo: "M-001", nome: "António Ferreira", telefone: "+244 923 111 222", zona: "Talatona / Miramar", veiculo: "Moto — AO 12-34-AB", activo: true, entregasTotal: 312, taxaSucesso: 97 },
    { codigo: "M-002", nome: "João Manuel", telefone: "+244 912 222 333", zona: "Ingombota / Sambizanga", veiculo: "Moto — AO 56-78-CD", activo: true, entregasTotal: 278, taxaSucesso: 95 },
    { codigo: "M-003", nome: "Pedro Luvualu", telefone: "+244 934 333 444", zona: "Kilamba / Viana", veiculo: "Carro — AO 90-12-EF", activo: true, entregasTotal: 241, taxaSucesso: 93 },
    { codigo: "M-004", nome: "Carlos Mbemba", telefone: "+244 945 444 555", zona: "Maianga / Rangel", veiculo: "Moto — AO 34-56-GH", activo: true, entregasTotal: 189, taxaSucesso: 91 },
    { codigo: "M-005", nome: "Fábio Nzinga", telefone: "+244 956 555 666", zona: "Samba / Benfica", veiculo: "Moto — AO 78-90-IJ", activo: true, entregasTotal: 204, taxaSucesso: 96 },
    { codigo: "M-006", nome: "Miguel Teixeira", telefone: "+244 967 666 777", zona: "Viana / Cacuaco", veiculo: "Carro — AO 12-34-KL", activo: false, entregasTotal: 156, taxaSucesso: 88 },
    { codigo: "M-007", nome: "David Kalunga", telefone: "+244 978 777 888", zona: "Cazenga / Sambizanga", veiculo: "Moto — AO 56-78-MN", activo: true, entregasTotal: 228, taxaSucesso: 94 },
    { codigo: "M-008", nome: "Rui Simões", telefone: "+244 989 888 999", zona: "Talatona / Benfica", veiculo: "Moto — AO 90-12-OP", activo: true, entregasTotal: 175, taxaSucesso: 90 },
  ]).onConflictDoNothing();

  await db.insert(entregasTable).values([
    // António Ferreira — 5 entregas
    { codigo: "RF-001", destinatario: "Maria da Conceição", telefone: "+244 923 456 789", endereco: "Talatona, Rua das Acácias 45, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.9164, lng: 13.1939 },
    { codigo: "RF-007", destinatario: "Luísa Nzinga Mbandi", telefone: "+244 978 901 234", endereco: "Sambizanga, Rua do Comércio 9, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.8012, lng: 13.2456 },
    { codigo: "RF-013", destinatario: "Helena Baptista", telefone: "+244 912 876 543", endereco: "Miramar, Av. Ho Chi Minh 28, Luanda", motorista: "António Ferreira", estado: "Pendente", prioridade: "Urgente", lat: -8.8165, lng: 13.2283 },
    { codigo: "RF-014", destinatario: "Neto Carvalho", telefone: "+244 923 765 432", endereco: "Alvalade, Rua da Missão 7, Luanda", motorista: "António Ferreira", estado: "Pendente", prioridade: "Normal", lat: -8.8301, lng: 13.2412 },
    { codigo: "RF-015", destinatario: "Graça Simões", telefone: "+244 934 654 321", endereco: "Ingombota, Largo do Kinaxixi, Luanda", motorista: "António Ferreira", estado: "Pendente", prioridade: "Normal", lat: -8.8233, lng: 13.2389 },
    // João Manuel — 4 entregas
    { codigo: "RF-002", destinatario: "José Neto Santos", telefone: "+244 912 345 678", endereco: "Miramar, Av. 4 de Fevereiro 12, Luanda", motorista: "João Manuel", estado: "Em Rota", prioridade: "Urgente", lat: -8.8147, lng: 13.2302 },
    { codigo: "RF-009", destinatario: "Sofia Mendes Carvalho", telefone: "+244 900 123 456", endereco: "Samba, Rua Principal 56, Luanda", motorista: "João Manuel", estado: "Em Rota", prioridade: "Urgente", lat: -8.8720, lng: 13.2010 },
    { codigo: "RF-016", destinatario: "Bento Malonda", telefone: "+244 945 543 210", endereco: "Cazenga, Bairro Mota, Rua 14, Luanda", motorista: "João Manuel", estado: "Pendente", prioridade: "Normal", lat: -8.8345, lng: 13.2721 },
    { codigo: "RF-017", destinatario: "Rosa Leitão", telefone: "+244 956 432 109", endereco: "Rangel, Av. Pedro de Castro Van-Dúnem 5, Luanda", motorista: "João Manuel", estado: "Pendente", prioridade: "Normal", lat: -8.8512, lng: 13.2634 },
    // Pedro Luvualu — 4 entregas
    { codigo: "RF-003", destinatario: "Ana Beatriz Lopes", telefone: "+244 934 567 890", endereco: "Kilamba, Bloco F, Apt 34, Luanda", motorista: "Pedro Luvualu", estado: "Pendente", prioridade: "Normal", lat: -8.9742, lng: 13.2183 },
    { codigo: "RF-011", destinatario: "Clara Esperança Lima", telefone: "+244 922 345 678", endereco: "Cazenga, Rua 21, Luanda", motorista: "Pedro Luvualu", estado: "Pendente", prioridade: "Normal", lat: -8.8315, lng: 13.2678 },
    { codigo: "RF-018", destinatario: "Tomás Henriques", telefone: "+244 967 321 098", endereco: "Viana, Km 11, Estrada de Viana, Luanda", motorista: "Pedro Luvualu", estado: "Pendente", prioridade: "Urgente", lat: -8.9112, lng: 13.3654 },
    { codigo: "RF-019", destinatario: "Amélia Ngueve", telefone: "+244 978 210 987", endereco: "Benfica, Rua do Aeroporto 33, Luanda", motorista: "Pedro Luvualu", estado: "Pendente", prioridade: "Normal", lat: -8.9198, lng: 13.2087 },
    // Carlos Mbemba — 3 entregas
    { codigo: "RF-004", destinatario: "Carlos Eduardo Pinto", telefone: "+244 945 678 901", endereco: "Maianga, Rua Rainha Ginga 78, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Normal", lat: -8.8380, lng: 13.2345 },
    { codigo: "RF-012", destinatario: "Hélder Baptista Cunha", telefone: "+244 933 456 789", endereco: "Benfica, Condomínio Sol Nascente, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Normal", lat: -8.9231, lng: 13.1712 },
    { codigo: "RF-020", destinatario: "Isabel Domingues", telefone: "+244 989 109 876", endereco: "Maianga, Largo do Ambiente, Luanda", motorista: "Carlos Mbemba", estado: "Pendente", prioridade: "Urgente", lat: -8.8421, lng: 13.2298 },
    // Others
    { codigo: "RF-005", destinatario: "Fernanda Rodrigues", telefone: "+244 956 789 012", endereco: "Rangel, Bairro Operário 23, Luanda", motorista: "Fábio Nzinga", estado: "Em Rota", prioridade: "Urgente", lat: -8.8567, lng: 13.2498 },
    { codigo: "RF-006", destinatario: "Paulo Alexandre Sousa", telefone: "+244 967 890 123", endereco: "Viana, Zona Industrial, Luanda", motorista: "David Kalunga", estado: "Pendente", prioridade: "Normal", lat: -8.9033, lng: 13.3720 },
    { codigo: "RF-008", destinatario: "Ricardo Domingos", telefone: "+244 989 012 345", endereco: "Cacuaco, Bairro Nova Vida, Luanda", motorista: "Rui Simões", estado: "Pendente", prioridade: "Normal", lat: -8.7517, lng: 13.2878 },
    { codigo: "RF-010", destinatario: "Manuel Augusto Dias", telefone: "+244 911 234 567", endereco: "Ingombota, Av. dos Combatentes 33, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.8195, lng: 13.2354 },
  ]).onConflictDoNothing();

  console.log("✅ Base de dados populada com sucesso!");
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
