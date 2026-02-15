import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb(
    {
      host: "localhost",
      port: 3306,
      user: "issue_tracker",
      password: "issue_tracker",
      database: "issue_tracker",
      connectionLimit: 5,
    }
  );

  return new PrismaClient({ adapter });
};

declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalThis.prisma = client;

export default client;
