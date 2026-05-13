import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import { utilizadoresTable, motoristasTable, entregasTable, historicoRotasTable } from "./schema/index";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function daysAgo(n: number): Date {
  const d = new Date("2026-05-13T10:00:00Z");
  d.setDate(d.getDate() - n);
  return d;
}

function daysAgoAt(n: number, hour: number): Date {
  const d = new Date("2026-05-13T00:00:00Z");
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d;
}

async function seed() {
  console.log("Limpando dados existentes...");
  await db.delete(historicoRotasTable);
  await db.delete(entregasTable);
  await db.delete(motoristasTable);
  await db.delete(utilizadoresTable);

  console.log("A semear utilizadores...");
  const adminSenha = await bcrypt.hash("admin123", 10);
  const entregadorSenha = await bcrypt.hash("entrega123", 10);

  await db.insert(utilizadoresTable).values([
    { nome: "Administrador", email: "admin@rotaflow.ao", senha: adminSenha, papel: "administrador" },
    { nome: "António Ferreira", email: "antonio@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "António Ferreira" },
    { nome: "João Manuel", email: "joao@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "João Manuel" },
    { nome: "Pedro Luvualu", email: "pedro@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "Pedro Luvualu" },
    { nome: "Carlos Mbemba", email: "carlos@rotaflow.ao", senha: entregadorSenha, papel: "entregador", motoristaNome: "Carlos Mbemba" },
  ]);

  console.log("A semear motoristas...");
  await db.insert(motoristasTable).values([
    { codigo: "M-001", nome: "António Ferreira", telefone: "+244 923 111 222", zona: "Talatona / Miramar", veiculo: "Moto — AO 12-34-AB", activo: true, entregasTotal: 312, taxaSucesso: 97 },
    { codigo: "M-002", nome: "João Manuel", telefone: "+244 912 222 333", zona: "Ingombota / Sambizanga", veiculo: "Moto — AO 56-78-CD", activo: true, entregasTotal: 278, taxaSucesso: 95 },
    { codigo: "M-003", nome: "Pedro Luvualu", telefone: "+244 934 333 444", zona: "Kilamba / Viana", veiculo: "Carro — AO 90-12-EF", activo: true, entregasTotal: 241, taxaSucesso: 93 },
    { codigo: "M-004", nome: "Carlos Mbemba", telefone: "+244 945 444 555", zona: "Maianga / Rangel", veiculo: "Moto — AO 34-56-GH", activo: true, entregasTotal: 189, taxaSucesso: 91 },
    { codigo: "M-005", nome: "Fábio Nzinga", telefone: "+244 956 555 666", zona: "Samba / Benfica", veiculo: "Moto — AO 78-90-IJ", activo: true, entregasTotal: 204, taxaSucesso: 96 },
    { codigo: "M-006", nome: "Miguel Teixeira", telefone: "+244 967 666 777", zona: "Viana / Cacuaco", veiculo: "Carro — AO 12-34-KL", activo: false, entregasTotal: 156, taxaSucesso: 88 },
    { codigo: "M-007", nome: "David Kalunga", telefone: "+244 978 777 888", zona: "Cazenga / Sambizanga", veiculo: "Moto — AO 56-78-MN", activo: true, entregasTotal: 228, taxaSucesso: 94 },
    { codigo: "M-008", nome: "Rui Simões", telefone: "+244 989 888 999", zona: "Talatona / Benfica", veiculo: "Moto — AO 90-12-OP", activo: true, entregasTotal: 175, taxaSucesso: 90 },
  ]);

  console.log("A semear entregas históricas...");

  // Entregas dos últimos 30 dias — maioria entregue, algumas pendentes/em rota hoje
  const historicoEntregas = [
    // Hoje (dia 0) — em rota / pendentes
    { codigo: "RF-001", destinatario: "Maria da Conceição", telefone: "+244 923 456 789", endereco: "Talatona, Rua das Acácias 45, Luanda", motorista: "António Ferreira", estado: "Em Rota", prioridade: "Urgente", lat: -8.9164, lng: 13.1939, criadoEm: daysAgoAt(0, 8) },
    { codigo: "RF-002", destinatario: "José Neto Santos", telefone: "+244 912 345 678", endereco: "Miramar, Av. 4 de Fevereiro 12, Luanda", motorista: "João Manuel", estado: "Pendente", prioridade: "Normal", lat: -8.8147, lng: 13.2302, criadoEm: daysAgoAt(0, 9) },
    { codigo: "RF-003", destinatario: "Ana Beatriz Lopes", telefone: "+244 934 567 890", endereco: "Kilamba, Bloco F, Apt 34, Luanda", motorista: "Pedro Luvualu", estado: "Pendente", prioridade: "Normal", lat: -8.9742, lng: 13.2183, criadoEm: daysAgoAt(0, 9) },
    { codigo: "RF-004", destinatario: "Carlos Eduardo Pinto", telefone: "+244 945 678 901", endereco: "Maianga, Rua Rainha Ginga 78, Luanda", motorista: "Carlos Mbemba", estado: "Em Rota", prioridade: "Normal", lat: -8.8380, lng: 13.2345, criadoEm: daysAgoAt(0, 8) },
    { codigo: "RF-005", destinatario: "Fernanda Rodrigues", telefone: "+244 956 789 012", endereco: "Rangel, Bairro Operário 23, Luanda", motorista: "Fábio Nzinga", estado: "Pendente", prioridade: "Urgente", lat: -8.8567, lng: 13.2498, criadoEm: daysAgoAt(0, 10) },
    { codigo: "RF-006", destinatario: "Paulo Alexandre Sousa", telefone: "+244 967 890 123", endereco: "Viana, Zona Industrial, Luanda", motorista: "David Kalunga", estado: "Pendente", prioridade: "Normal", lat: -8.9033, lng: 13.3720, criadoEm: daysAgoAt(0, 11) },
    { codigo: "RF-007", destinatario: "Luísa Nzinga Mbandi", telefone: "+244 978 901 234", endereco: "Sambizanga, Rua do Comércio 9, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.8012, lng: 13.2456, criadoEm: daysAgoAt(0, 8) },
    { codigo: "RF-008", destinatario: "Ricardo Domingos", telefone: "+244 989 012 345", endereco: "Cacuaco, Bairro Nova Vida, Luanda", motorista: "Rui Simões", estado: "Pendente", prioridade: "Normal", lat: -8.7517, lng: 13.2878, criadoEm: daysAgoAt(0, 10) },

    // Ontem (dia 1)
    { codigo: "RF-009", destinatario: "Sofia Mendes Carvalho", telefone: "+244 900 123 456", endereco: "Samba, Rua Principal 56, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Urgente", lat: -8.8720, lng: 13.2010, criadoEm: daysAgoAt(1, 9) },
    { codigo: "RF-010", destinatario: "Manuel Augusto Dias", telefone: "+244 911 234 567", endereco: "Ingombota, Av. dos Combatentes 33, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.8195, lng: 13.2354, criadoEm: daysAgoAt(1, 10) },
    { codigo: "RF-011", destinatario: "Clara Esperança Lima", telefone: "+244 922 345 678", endereco: "Cazenga, Rua 21, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Normal", lat: -8.8315, lng: 13.2678, criadoEm: daysAgoAt(1, 8) },
    { codigo: "RF-012", destinatario: "Hélder Baptista Cunha", telefone: "+244 933 456 789", endereco: "Benfica, Condomínio Sol Nascente, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Normal", lat: -8.9231, lng: 13.1712, criadoEm: daysAgoAt(1, 11) },
    { codigo: "RF-013", destinatario: "Helena Baptista", telefone: "+244 912 876 543", endereco: "Miramar, Av. Ho Chi Minh 28, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Urgente", lat: -8.8165, lng: 13.2283, criadoEm: daysAgoAt(1, 9) },
    { codigo: "RF-014", destinatario: "Neto Carvalho", telefone: "+244 923 765 432", endereco: "Alvalade, Rua da Missão 7, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Normal", lat: -8.8301, lng: 13.2412, criadoEm: daysAgoAt(1, 14) },
    { codigo: "RF-015", destinatario: "Graça Simões", telefone: "+244 934 654 321", endereco: "Ingombota, Largo do Kinaxixi, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Normal", lat: -8.8233, lng: 13.2389, criadoEm: daysAgoAt(1, 15) },
    { codigo: "RF-016", destinatario: "Bento Malonda", telefone: "+244 945 543 210", endereco: "Cazenga, Bairro Mota, Rua 14, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Normal", lat: -8.8345, lng: 13.2721, criadoEm: daysAgoAt(1, 16) },

    // Dia 2 atrás
    { codigo: "RF-017", destinatario: "Rosa Leitão", telefone: "+244 956 432 109", endereco: "Rangel, Av. Pedro de Castro Van-Dúnem 5, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.8512, lng: 13.2634, criadoEm: daysAgoAt(2, 9) },
    { codigo: "RF-018", destinatario: "Tomás Henriques", telefone: "+244 967 321 098", endereco: "Viana, Km 11, Estrada de Viana, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Urgente", lat: -8.9112, lng: 13.3654, criadoEm: daysAgoAt(2, 10) },
    { codigo: "RF-019", destinatario: "Amélia Ngueve", telefone: "+244 978 210 987", endereco: "Benfica, Rua do Aeroporto 33, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.9198, lng: 13.2087, criadoEm: daysAgoAt(2, 8) },
    { codigo: "RF-020", destinatario: "Isabel Domingues", telefone: "+244 989 109 876", endereco: "Maianga, Largo do Ambiente, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Urgente", lat: -8.8421, lng: 13.2298, criadoEm: daysAgoAt(2, 11) },
    { codigo: "RF-021", destinatario: "Joaquim Pereira Lopes", telefone: "+244 923 567 890", endereco: "Talatona, Urbanização Nova, Lote 12, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Normal", lat: -8.9054, lng: 13.1876, criadoEm: daysAgoAt(2, 14) },
    { codigo: "RF-022", destinatario: "Antónia Filomena Costa", telefone: "+244 934 678 901", endereco: "Sambizanga, Bairro Mabor, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Normal", lat: -8.7998, lng: 13.2512, criadoEm: daysAgoAt(2, 15) },

    // Dia 3 atrás
    { codigo: "RF-023", destinatario: "Domingos Paulo Teixeira", telefone: "+244 945 789 012", endereco: "Kilamba, Bloco H, Apt 7, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Normal", lat: -8.9687, lng: 13.2145, criadoEm: daysAgoAt(3, 9) },
    { codigo: "RF-024", destinatario: "Lurdes Conceição Faria", telefone: "+244 956 890 123", endereco: "Cacuaco, Rua do Mercado 45, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Urgente", lat: -8.7456, lng: 13.2934, criadoEm: daysAgoAt(3, 10) },
    { codigo: "RF-025", destinatario: "Mário Augusto Neves", telefone: "+244 967 901 234", endereco: "Samba, Urbanização Km 30, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Normal", lat: -8.8812, lng: 13.1934, criadoEm: daysAgoAt(3, 11) },
    { codigo: "RF-026", destinatario: "Conceição das Neves", telefone: "+244 978 012 345", endereco: "Ingombota, Rua Major Kanhangulo, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.8167, lng: 13.2401, criadoEm: daysAgoAt(3, 8) },
    { codigo: "RF-027", destinatario: "Alfredo Monteiro Pinto", telefone: "+244 989 123 456", endereco: "Maianga, Rua da Banca 9, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Normal", lat: -8.8398, lng: 13.2312, criadoEm: daysAgoAt(3, 14) },
    { codigo: "RF-028", destinatario: "Esperança Correia Lima", telefone: "+244 900 234 567", endereco: "Miramar, Rua do Embaixador, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Urgente", lat: -8.8134, lng: 13.2278, criadoEm: daysAgoAt(3, 16) },

    // Dia 4 atrás
    { codigo: "RF-029", destinatario: "Fernando Lopes Cunha", telefone: "+244 911 345 678", endereco: "Rangel, Bairro Marçal, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Normal", lat: -8.8534, lng: 13.2567, criadoEm: daysAgoAt(4, 9) },
    { codigo: "RF-030", destinatario: "Vitória Meneses Leal", telefone: "+244 922 456 789", endereco: "Viana, Km 15, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.9078, lng: 13.3812, criadoEm: daysAgoAt(4, 10) },
    { codigo: "RF-031", destinatario: "Nelson Augusto Duarte", telefone: "+244 933 567 890", endereco: "Cazenga, Av. do 1 de Agosto, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Urgente", lat: -8.8287, lng: 13.2756, criadoEm: daysAgoAt(4, 11) },
    { codigo: "RF-032", destinatario: "Diana Ferreira Sousa", telefone: "+244 944 678 901", endereco: "Talatona, Rua das Amendoeiras, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.9112, lng: 13.1998, criadoEm: daysAgoAt(4, 8) },
    { codigo: "RF-033", destinatario: "Albano Nzinga Afonso", telefone: "+244 955 789 012", endereco: "Benfica, Rua Cmdt. Jika, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Normal", lat: -8.9267, lng: 13.1756, criadoEm: daysAgoAt(4, 14) },
    { codigo: "RF-034", destinatario: "Clementina Baptista Cruz", telefone: "+244 966 890 123", endereco: "Kilamba, Bloco A, Apt 22, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Normal", lat: -8.9723, lng: 13.2198, criadoEm: daysAgoAt(4, 15) },

    // Dia 5 atrás
    { codigo: "RF-035", destinatario: "Augusto Barros Neto", telefone: "+244 977 901 234", endereco: "Sambizanga, Rua Onze de Novembro, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Urgente", lat: -8.7987, lng: 13.2478, criadoEm: daysAgoAt(5, 9) },
    { codigo: "RF-036", destinatario: "Beatriz Santos Almeida", telefone: "+244 988 012 345", endereco: "Ingombota, Largo 4 de Fevereiro, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Normal", lat: -8.8212, lng: 13.2323, criadoEm: daysAgoAt(5, 10) },
    { codigo: "RF-037", destinatario: "Celestino Pinto Alves", telefone: "+244 999 123 456", endereco: "Miramar, Av. Lenin, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.8145, lng: 13.2267, criadoEm: daysAgoAt(5, 11) },
    { codigo: "RF-038", destinatario: "Deolinda Ferreira Mata", telefone: "+244 910 234 567", endereco: "Maianga, Rua Amílcar Cabral, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Normal", lat: -8.8412, lng: 13.2278, criadoEm: daysAgoAt(5, 8) },
    { codigo: "RF-039", destinatario: "Eduardo Saúl Neves", telefone: "+244 921 345 678", endereco: "Viana, Km 9, Rua Principal, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.9045, lng: 13.3678, criadoEm: daysAgoAt(5, 14) },
    { codigo: "RF-040", destinatario: "Filipa Gonçalves Costa", telefone: "+244 932 456 789", endereco: "Samba, Rua Secundária 8, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Urgente", lat: -8.8745, lng: 13.1978, criadoEm: daysAgoAt(5, 15) },

    // Dia 6 atrás
    { codigo: "RF-041", destinatario: "Gregório Lemos Paiva", telefone: "+244 943 567 890", endereco: "Cacuaco, Bairro Petrangol, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Normal", lat: -8.7523, lng: 13.2912, criadoEm: daysAgoAt(6, 9) },
    { codigo: "RF-042", destinatario: "Helena Baptista Lima", telefone: "+244 954 678 901", endereco: "Talatona, Condomínio Belas, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Normal", lat: -8.9087, lng: 13.1923, criadoEm: daysAgoAt(6, 10) },
    { codigo: "RF-043", destinatario: "Inácio Teixeira Morais", telefone: "+244 965 789 012", endereco: "Cazenga, Bairro Asa Branca, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Urgente", lat: -8.8312, lng: 13.2734, criadoEm: daysAgoAt(6, 11) },
    { codigo: "RF-044", destinatario: "Joana Vieira Nascimento", telefone: "+244 976 890 123", endereco: "Rangel, Rua do Progresso 21, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.8523, lng: 13.2612, criadoEm: daysAgoAt(6, 14) },
    { codigo: "RF-045", destinatario: "Kevin Afonso Barros", telefone: "+244 987 901 234", endereco: "Kilamba, Bloco C, Apt 15, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Normal", lat: -8.9712, lng: 13.2167, criadoEm: daysAgoAt(6, 15) },

    // Semana passada (dias 7-14)
    { codigo: "RF-046", destinatario: "Leopoldina Cruz Santos", telefone: "+244 998 012 345", endereco: "Ingombota, Rua Rainha Jinga, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.8178, lng: 13.2367, criadoEm: daysAgoAt(7, 9) },
    { codigo: "RF-047", destinatario: "Madalena Pereira Costa", telefone: "+244 909 123 456", endereco: "Miramar, Rua Serpa Pinto, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Normal", lat: -8.8156, lng: 13.2301, criadoEm: daysAgoAt(7, 10) },
    { codigo: "RF-048", destinatario: "Narciso Baptista Leal", telefone: "+244 920 234 567", endereco: "Maianga, Rua Direita 45, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Urgente", lat: -8.8367, lng: 13.2334, criadoEm: daysAgoAt(8, 9) },
    { codigo: "RF-049", destinatario: "Olívia Mendes Ferreira", telefone: "+244 931 345 678", endereco: "Samba, Urbanização Km 20, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Normal", lat: -8.8789, lng: 13.2034, criadoEm: daysAgoAt(8, 11) },
    { codigo: "RF-050", destinatario: "Palmira Gonçalves Dias", telefone: "+244 942 456 789", endereco: "Viana, Rua dos Artesãos, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Normal", lat: -8.9067, lng: 13.3756, criadoEm: daysAgoAt(9, 9) },
    { codigo: "RF-051", destinatario: "Quintino Lopes Neves", telefone: "+244 953 567 890", endereco: "Cacuaco, Km 30, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Urgente", lat: -8.7489, lng: 13.2956, criadoEm: daysAgoAt(9, 10) },
    { codigo: "RF-052", destinatario: "Rosária Teixeira Pinto", telefone: "+244 964 678 901", endereco: "Talatona, Bairro Cine, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Normal", lat: -8.9145, lng: 13.1867, criadoEm: daysAgoAt(10, 9) },
    { codigo: "RF-053", destinatario: "Sebastião Morais Silva", telefone: "+244 975 789 012", endereco: "Cazenga, Rua da Liberdade, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.8298, lng: 13.2712, criadoEm: daysAgoAt(10, 10) },
    { codigo: "RF-054", destinatario: "Teresa Rodrigues Alves", telefone: "+244 986 890 123", endereco: "Kilamba, Bloco D, Apt 8, Luanda", motorista: "Pedro Luvualu", estado: "Entregue", prioridade: "Normal", lat: -8.9734, lng: 13.2212, criadoEm: daysAgoAt(11, 9) },
    { codigo: "RF-055", destinatario: "Urbano Carvalho Neto", telefone: "+244 997 901 234", endereco: "Rangel, Bairro do Prenda, Luanda", motorista: "Carlos Mbemba", estado: "Entregue", prioridade: "Urgente", lat: -8.8489, lng: 13.2589, criadoEm: daysAgoAt(11, 11) },
    { codigo: "RF-056", destinatario: "Virgínia Baptista Lopes", telefone: "+244 908 012 345", endereco: "Ingombota, Rua Assalto ao Quartel, Luanda", motorista: "Fábio Nzinga", estado: "Entregue", prioridade: "Normal", lat: -8.8212, lng: 13.2378, criadoEm: daysAgoAt(12, 9) },
    { codigo: "RF-057", destinatario: "Wilson Santos Pereira", telefone: "+244 919 123 456", endereco: "Miramar, Av. Comandante Valódia, Luanda", motorista: "Rui Simões", estado: "Entregue", prioridade: "Normal", lat: -8.8167, lng: 13.2289, criadoEm: daysAgoAt(12, 10) },
    { codigo: "RF-058", destinatario: "Xavier Ferreira Morais", telefone: "+244 930 234 567", endereco: "Samba, Bairro Rangel Norte, Luanda", motorista: "David Kalunga", estado: "Entregue", prioridade: "Normal", lat: -8.8734, lng: 13.2012, criadoEm: daysAgoAt(13, 9) },
    { codigo: "RF-059", destinatario: "Yolanda Lima Costa", telefone: "+244 941 345 678", endereco: "Maianga, Largo 1 de Maio, Luanda", motorista: "João Manuel", estado: "Entregue", prioridade: "Urgente", lat: -8.8345, lng: 13.2267, criadoEm: daysAgoAt(13, 10) },
    { codigo: "RF-060", destinatario: "Zacarias Pinto Cunha", telefone: "+244 952 456 789", endereco: "Benfica, Urbanização Jardim, Luanda", motorista: "António Ferreira", estado: "Entregue", prioridade: "Normal", lat: -8.9256, lng: 13.1734, criadoEm: daysAgoAt(14, 9) },
  ];

  await db.insert(entregasTable).values(historicoEntregas);

  console.log("A semear histórico de rotas...");
  await db.insert(historicoRotasTable).values([
    // António Ferreira — últimos 7 dias
    { motorista: "António Ferreira", kmTotal: 18.4, kmSemOtimizacao: 24.1, kmPoupados: 5.7, litrosGastos: 1.196, kzGastos: 239, litrosPoupados: 0.371, kzPoupados: 74, percentagemPoupanca: 23.7, numParagens: 5, modoTrafico: "normal", paragemIds: [1, 7, 13, 19, 26], criadoEm: daysAgoAt(0, 8) },
    { motorista: "António Ferreira", kmTotal: 16.2, kmSemOtimizacao: 21.8, kmPoupados: 5.6, litrosGastos: 1.053, kzGastos: 211, litrosPoupados: 0.364, kzPoupados: 73, percentagemPoupanca: 25.7, numParagens: 4, modoTrafico: "avoid", paragemIds: [13, 14, 15, 19], criadoEm: daysAgoAt(1, 9) },
    { motorista: "António Ferreira", kmTotal: 19.7, kmSemOtimizacao: 26.3, kmPoupados: 6.6, litrosGastos: 1.281, kzGastos: 256, litrosPoupados: 0.429, kzPoupados: 86, percentagemPoupanca: 25.1, numParagens: 5, modoTrafico: "normal", paragemIds: [1, 7, 19, 26, 32], criadoEm: daysAgoAt(2, 8) },
    { motorista: "António Ferreira", kmTotal: 14.8, kmSemOtimizacao: 19.2, kmPoupados: 4.4, litrosGastos: 0.962, kzGastos: 192, litrosPoupados: 0.286, kzPoupados: 57, percentagemPoupanca: 22.9, numParagens: 4, modoTrafico: "normal", paragemIds: [26, 32, 39, 46], criadoEm: daysAgoAt(3, 8) },
    { motorista: "António Ferreira", kmTotal: 21.3, kmSemOtimizacao: 28.7, kmPoupados: 7.4, litrosGastos: 1.385, kzGastos: 277, litrosPoupados: 0.481, kzPoupados: 96, percentagemPoupanca: 25.8, numParagens: 6, modoTrafico: "avoid", paragemIds: [1, 7, 32, 39, 46, 53], criadoEm: daysAgoAt(4, 8) },
    // João Manuel
    { motorista: "João Manuel", kmTotal: 22.1, kmSemOtimizacao: 29.4, kmPoupados: 7.3, litrosGastos: 1.437, kzGastos: 287, litrosPoupados: 0.475, kzPoupados: 95, percentagemPoupanca: 24.8, numParagens: 5, modoTrafico: "normal", paragemIds: [2, 9, 16, 23, 38], criadoEm: daysAgoAt(1, 9) },
    { motorista: "João Manuel", kmTotal: 17.6, kmSemOtimizacao: 23.1, kmPoupados: 5.5, litrosGastos: 1.144, kzGastos: 229, litrosPoupados: 0.358, kzPoupados: 72, percentagemPoupanca: 23.8, numParagens: 4, modoTrafico: "avoid", paragemIds: [9, 16, 23, 38], criadoEm: daysAgoAt(3, 9) },
    { motorista: "João Manuel", kmTotal: 25.4, kmSemOtimizacao: 33.8, kmPoupados: 8.4, litrosGastos: 1.651, kzGastos: 330, litrosPoupados: 0.546, kzPoupados: 109, percentagemPoupanca: 24.9, numParagens: 6, modoTrafico: "normal", paragemIds: [2, 9, 16, 31, 38, 45], criadoEm: daysAgoAt(5, 9) },
    // Pedro Luvualu
    { motorista: "Pedro Luvualu", kmTotal: 31.2, kmSemOtimizacao: 41.6, kmPoupados: 10.4, litrosGastos: 2.028, kzGastos: 406, litrosPoupados: 0.676, kzPoupados: 135, percentagemPoupanca: 25.0, numParagens: 5, modoTrafico: "normal", paragemIds: [3, 11, 18, 25, 33], criadoEm: daysAgoAt(1, 8) },
    { motorista: "Pedro Luvualu", kmTotal: 28.7, kmSemOtimizacao: 38.2, kmPoupados: 9.5, litrosGastos: 1.866, kzGastos: 373, litrosPoupados: 0.618, kzPoupados: 124, percentagemPoupanca: 24.9, numParagens: 5, modoTrafico: "avoid", paragemIds: [3, 11, 25, 33, 40], criadoEm: daysAgoAt(4, 8) },
    { motorista: "Pedro Luvualu", kmTotal: 33.8, kmSemOtimizacao: 45.1, kmPoupados: 11.3, litrosGastos: 2.197, kzGastos: 439, litrosPoupados: 0.735, kzPoupados: 147, percentagemPoupanca: 25.1, numParagens: 6, modoTrafico: "normal", paragemIds: [3, 11, 18, 25, 33, 47], criadoEm: daysAgoAt(6, 8) },
    // Carlos Mbemba
    { motorista: "Carlos Mbemba", kmTotal: 12.4, kmSemOtimizacao: 16.1, kmPoupados: 3.7, litrosGastos: 0.806, kzGastos: 161, litrosPoupados: 0.241, kzPoupados: 48, percentagemPoupanca: 23.0, numParagens: 3, modoTrafico: "normal", paragemIds: [4, 12, 20], criadoEm: daysAgoAt(1, 11) },
    { motorista: "Carlos Mbemba", kmTotal: 15.8, kmSemOtimizacao: 20.9, kmPoupados: 5.1, litrosGastos: 1.027, kzGastos: 205, litrosPoupados: 0.332, kzPoupados: 66, percentagemPoupanca: 24.4, numParagens: 4, modoTrafico: "normal", paragemIds: [4, 12, 27, 34], criadoEm: daysAgoAt(3, 11) },
    { motorista: "Carlos Mbemba", kmTotal: 13.1, kmSemOtimizacao: 17.2, kmPoupados: 4.1, litrosGastos: 0.852, kzGastos: 170, litrosPoupados: 0.267, kzPoupados: 53, percentagemPoupanca: 23.8, numParagens: 3, modoTrafico: "avoid", paragemIds: [4, 27, 41], criadoEm: daysAgoAt(5, 11) },
    // Fábio Nzinga
    { motorista: "Fábio Nzinga", kmTotal: 16.9, kmSemOtimizacao: 22.3, kmPoupados: 5.4, litrosGastos: 1.099, kzGastos: 220, litrosPoupados: 0.351, kzPoupados: 70, percentagemPoupanca: 24.2, numParagens: 4, modoTrafico: "normal", paragemIds: [5, 14, 21, 28], criadoEm: daysAgoAt(2, 14) },
    { motorista: "Fábio Nzinga", kmTotal: 19.2, kmSemOtimizacao: 25.8, kmPoupados: 6.6, litrosGastos: 1.248, kzGastos: 250, litrosPoupados: 0.429, kzPoupados: 86, percentagemPoupanca: 25.6, numParagens: 5, modoTrafico: "avoid", paragemIds: [5, 14, 28, 35, 42], criadoEm: daysAgoAt(4, 14) },
    // David Kalunga
    { motorista: "David Kalunga", kmTotal: 34.7, kmSemOtimizacao: 46.2, kmPoupados: 11.5, litrosGastos: 2.256, kzGastos: 451, litrosPoupados: 0.748, kzPoupados: 150, percentagemPoupanca: 24.9, numParagens: 5, modoTrafico: "normal", paragemIds: [6, 10, 17, 24, 30], criadoEm: daysAgoAt(1, 10) },
    { motorista: "David Kalunga", kmTotal: 36.1, kmSemOtimizacao: 48.3, kmPoupados: 12.2, litrosGastos: 2.347, kzGastos: 469, litrosPoupados: 0.793, kzPoupados: 159, percentagemPoupanca: 25.3, numParagens: 5, modoTrafico: "normal", paragemIds: [6, 17, 30, 37, 44], criadoEm: daysAgoAt(4, 10) },
    // Rui Simões
    { motorista: "Rui Simões", kmTotal: 15.3, kmSemOtimizacao: 20.2, kmPoupados: 4.9, litrosGastos: 0.995, kzGastos: 199, litrosPoupados: 0.319, kzPoupados: 64, percentagemPoupanca: 24.3, numParagens: 4, modoTrafico: "normal", paragemIds: [8, 15, 22, 29], criadoEm: daysAgoAt(1, 15) },
    { motorista: "Rui Simões", kmTotal: 17.8, kmSemOtimizacao: 23.7, kmPoupados: 5.9, litrosGastos: 1.157, kzGastos: 231, litrosPoupados: 0.384, kzPoupados: 77, percentagemPoupanca: 24.9, numParagens: 4, modoTrafico: "avoid", paragemIds: [8, 22, 36, 43], criadoEm: daysAgoAt(3, 15) },
    { motorista: "Rui Simões", kmTotal: 14.6, kmSemOtimizacao: 19.4, kmPoupados: 4.8, litrosGastos: 0.949, kzGastos: 190, litrosPoupados: 0.312, kzPoupados: 62, percentagemPoupanca: 24.7, numParagens: 3, modoTrafico: "normal", paragemIds: [15, 29, 50], criadoEm: daysAgoAt(5, 15) },
  ]);

  console.log("Base de dados populada com sucesso!");
  console.log(`  - 5 utilizadores`);
  console.log(`  - 8 motoristas`);
  console.log(`  - ${historicoEntregas.length} entregas`);
  console.log(`  - 21 rotas no historico`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
