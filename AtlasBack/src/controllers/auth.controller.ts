import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { generateToken,verifyToken, generatePasswordResetLink
  ,generateVerificationCode, storeVerificationCode, verifyCode } from "../Services/token.service";
import { sendEmail, sendVerificationCode  } from "../Services/email.service";

dotenv.config();
const prisma = new PrismaClient();
import { JWT_SECRET } from "../utils/constants";

//  Send verification code
export const sendVerification = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  try {
    // Generate a verification code
    const code = generateVerificationCode();

    // Store the code temporarily
    storeVerificationCode(email, code);

    // Send the code via email
    await sendVerificationCode(email, code);

    res.status(200).json({ message: "Verification code sent." });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error sending verification code." });
  }
};

// Step 2: Verify code and register user
export const VerifyUserCode = async (req: Request, res: Response): Promise<any> => {
  const{code,email}=req.body

  const isCodeValid = await verifyCode(email, code);
    if (!isCodeValid) {
      return res.status(400).json({ error: "Invalid verification code." });
    }else{
      return res.status(200).json({message:"Verification succesfull"})
    }


}


// Step 3: signup
export const signUp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, email, code, password, role, profilePicture } = req.body;

    // Step 1: Check if the user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    //step 2:
    const isCodeValid = await verifyCode(email, code);
    if (!isCodeValid) {
      return res.status(400).json({ error: "Invalid verification code it may had expire be faster ." });
    }

    // Step 3: Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 4: Create the user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        profilePicture,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Step 5: Return success response
    res.status(201).json({ message: "User registered successfully.", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating user." });
  }
};

export const signIn = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
    
        if (!email || !password) {
          return res.status(400).json({ error: "Email or password required." });
        }
    
        // Verify if user exists
        const user = await prisma.user.findUnique({
          where: { email },
        });
    
        if (!user) {
          return res.status(401).json({ error: "Email or password incorrect." });
        }
    
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Email or password incorrect." });
        }
    
        // Create Token 
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "7d" } // Expiration 7 jours
        );
    
        // Return user info (without password)
        res.status(200).json({
          message: "Connection established.",
          token,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        }); 
      } catch (error) {
        console.error("Connection Error :", error);
        res.status(500).json({ error: "Server Error" });
      }
  };





// Send password reset link
export const sendPasswordResetEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // Generate a password reset token
    const token = generateToken(user.id, 1000);

    // Generate the password reset link
    const resetLink = generatePasswordResetLink(token);

    // Send the email
    await sendEmail(email, resetLink.subject, `Click the link to reset your password:`,resetLink.html);

    res.status(200).json({ message: "Password reset email sent." });
  } catch (error) {
    res.status(500).json({ error: "Error sending password reset email." });
  }
};

// Reset password using the token
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  try {
    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(400).json({ error: "Invalid or expired token." });
      return;
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    res.status(500).json({ error: "Error resetting password." });
  }
};