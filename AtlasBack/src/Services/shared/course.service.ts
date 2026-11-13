
import { PrismaClient,Role } from "@prisma/client";



const prisma = new PrismaClient();


// get all courses from the db
export async function getAllCourses(): Promise<any> {
    try {
      const courses = await prisma.course.findMany({
        include: {
          teacher: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });
      return courses;
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw new Error("FAILED_TO_FETCH_COURSES");
    }
  }


  export async function deleteCourseById(courseId: string): Promise<void> {
    try {
      await prisma.course.delete({
        where: { id: courseId },
      });
    } catch (error) {
      console.error(`Failed to delete course with ID ${courseId}:`, error);
      throw new Error("FAILED_TO_DELETE_COURSE");
    }
  }  