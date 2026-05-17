import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prismaGenerated/client";

const connectionString = `${process.env.DATABASE_URL}`;

console.log(connectionString)
const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

