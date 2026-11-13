
import express,{ Router } from "express";
import { Request, Response,NextFunction } from "express";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: any;
}

//both courser and editor
export const isCourseTeacher = async (req:AuthRequest, res:Response, next:NextFunction):Promise<any> => {
  const { courseId } = req.params;
  const teacherId = req.user.id; // From authenticateToken

  try {
    // Check if user is either:
    // 1. The course owner (teacherId matches course.teacherId)
    // OR
    // 2. An enrolled teacher with valid enrollment
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { teacherId }, // Course owner
          { 
            TeacherCourseEnrollment: { 
              some: { 
                teacherId,
                role: { in: ['TA', 'AUDITOR'] } // Only active roles
              } 
            } 
          }
        ]
      }
    });

    if (!course) {
      return res.status(403).json({ 
        error: 'Unauthorized - Not a teacher of this course' 
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

//for the course owner
export const isCourseOwner = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    const { courseId } = req.params;
    const teacherId = req.user.id; // From authenticateToken
  
    try {
      const course = await prisma.course.findUnique({
        where: {
          id: courseId,
          teacherId // Only check if the user is the course owner
        }
      });
  
      if (!course) {
        return res.status(403).json({ 
          error: 'Unauthorized - You must be the course owner to perform this action' 
        });
      }
  
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };


