// src/middlewares/checkRole.ts
import { Request, Response, NextFunction } from "express";
import { Role } from "../enum/Role"


interface RoleRequest extends Request {
    user?: any;
}

// Role-checking middleware
export const checkRole = (requiredRole: Role[]):any => {
  return (req: RoleRequest, res: Response, next: NextFunction) => {
    // Check if the user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    // Check if the user has the required role
    if (!requiredRole.includes(req.user.role)) {
        return res.status(403).json({ error: "Access denied. Insufficient permissions." });
      }

    // If the user has the required role, proceed to the next middleware or controller
    next();
  };
};