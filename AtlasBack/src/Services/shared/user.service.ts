import { Request, Response } from "express";
import { PrismaClient,Role } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();




  interface UserFilters {
    startsWith?: string;
    contains?: string;
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  }
  
  interface PaginationOptions {
    page: number;
    limit: number;
  }
  
  export async function getFilteredUsers(
    filters: UserFilters,
    pagination: PaginationOptions
  ) {
    const { page = 1, limit = 10 } = pagination;
    const whereClause: any = {};
  
    // Name filters (OR condition)
    if (filters.startsWith || filters.contains) { 
      whereClause.OR = [
        ...(filters.startsWith ? [
          { firstName: { startsWith: filters.startsWith, mode: 'insensitive' } },
          { lastName: { startsWith: filters.startsWith, mode: 'insensitive' } }
        ] : []),
        ...(filters.contains ? [
          { firstName: { contains: filters.contains, mode: 'insensitive' } },
          { lastName: { contains: filters.contains, mode: 'insensitive' } }
        ] : [])
      ];
    }
  
    // Role filter
    if (filters.role) {
      whereClause.role = filters.role;
    }
  
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: whereClause })
    ]);
  
    return {
      data: users,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit
      }
    };
  }

// get all users from the db
export async function getAllUsers(): Promise<any> {
  try {
    const users = await prisma.user.findMany();
    return users;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw new Error("FAILED_TO_FETCH_COURSES");
  }
}