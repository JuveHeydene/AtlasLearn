import { Request, Response } from "express";
import  {createUser,deleteUserById, updateUserRole } from "../../Services/admin/user.service";
import { socketService } from '../../Services/socket.service';
 
import { Role } from "@prisma/client";

export const createUserController = async (req: Request, res: Response):Promise<any> => {
  try {
    const { firstName, lastName, email, password, role, profilePicture } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await createUser(
      firstName,
      lastName,
      email,
      role,
      password, 
      profilePicture,
    );

    res.status(201).json({ message: "User created successfully", user });
  }  catch (error: any) {
    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(400).json({ error: "Email already in use." });
    }

    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};




  export const deleteUserController = async (req: Request, res: Response):Promise<any> => {
    try {
      const { id } = req.params;
      await deleteUserById(id);
      res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user." });
    }
  };
   
  export const  updateUserRoleController = async (req: Request, res: Response):Promise<any> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
  
      if (!Object.values(Role).includes(role)) {
        return res.status(400).json({ error: "Invalid role value." });
      }
  
      await updateUserRole(id, role);
      console.log("Calling emitToUser for ID:", id);
      console.log("SocketService io value:");
      socketService.emitToUser(id,"user_role_changed","nodatatosend")
      res.status(200).json({ message: "User role updated successfully." });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role." });
    }
  };