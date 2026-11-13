import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/constants";

interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction):any => {
    const token = req.headers["authorization"]?.split(" ")[1];  //retrieve bearer token 
    if (!token) {
        return res.status(401).json({ error: "Acess Denied. Token Not present." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Ajoute les données du token dans `req.user`
        next();
    } catch (err) {
        res.status(403).json({ error: "Invalide Token." });
    }
};
