import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log(" Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
