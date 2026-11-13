import jwt from "jsonwebtoken";
import redisClient from "./redis.service";
import * as crypto from "crypto";
import dotenv from "dotenv";
import { JWT_SECRET, TOKEN_EXPIRATION } from "../utils/constants";
dotenv.config();
// Generate a token for email verification or password reset
export const generateToken = (userId: string, expiresIn: number = TOKEN_EXPIRATION): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
};


// Generate a 6-digit verification code
export const generateVerificationCode = (): string => {
    return crypto.randomInt(100000, 999999).toString();
  };
  
  // Store the verification code in Redis with an expiration time (e.g., 10 minutes)
  export const storeVerificationCode = async (email: string, code: string): Promise<void> => {
    await redisClient.set(email, code,  'EX', 600 ); // Expires in 600 seconds (10 minutes)
  };
  
  // Verify the code
  export const verifyCode = async (email: string, code: string): Promise<boolean> => {
    const storedCode = await redisClient.get(email);
    return storedCode === code;
  };


// Verify a token
export const verifyToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

  
export const generatePasswordResetLink = (token: string) => {
  const resetLink = `${process.env.FrontEnd}/reset-password?token=${token}`;
  
  return {
    subject: "Password Reset Request - Atlas Learning",
    text: `Click this link to reset your password: ${resetLink}\n\nIf you didn't request this, please ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
        .header { background: #10b981; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #10b981;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 15px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
            background: #f5f5f5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: white; margin: 0;">Atlas Learning</h1>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">Password Reset Request</h2>
            <p>Please click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>This link will expire in less than 15minutes</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Atlas Learning. All rights reserved.</p>
        </div>
    </div>
    
</body>
</html>
    `
  };
};