import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient,Role } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();




export  async function createUser(firstName:string,lastName:string ,email:string,role:Role,
   password:string,profilePicture:string):Promise<any> {


    const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // Throw error that the controller can catch
    throw new Error("EMAIL_ALREADY_EXISTS");
  }
      // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
    
        // Create the user 
        const newUser = await prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role:role as Role,
            profilePicture,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        return newUser;

}
//delete a user
export async function deleteUserById(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}


//update a user role
export async function updateUserRole(userId: string, newRole: Role): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });}
