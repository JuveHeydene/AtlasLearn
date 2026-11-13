import { Request, Response } from "express";
import { getAllUsers,getFilteredUsers } from "../../Services/shared/user.service";



export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const { startsWith, contains, role } = req.body.filters || {};
    const { page = 1, limit = 10 } = req.body.pagination || {};
    
    const result = await getFilteredUsers(
      { startsWith, contains, role },
      { page, limit }
    );
    
    // Explicitly set JSON content type
   // res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    // Return JSON even for errors
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllUsersControllerwithoutfilter = async (req: Request, res: Response) => {
  try {
    
    const result = await getAllUsers();
    
    // Explicitly set JSON content type
   // res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    // Return JSON even for errors
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

