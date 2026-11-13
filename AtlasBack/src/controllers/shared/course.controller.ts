import { Request, Response } from "express";
import { getAllCourses,deleteCourseById } from "../../Services/shared/course.service";

export const getAllCoursesController = async (req: Request, res: Response):Promise<any> => {
  try {
    const courses = await getAllCourses();
    res.status(200).json(courses);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch courses." });
  }
};



export const deleteCourseController = async (req: Request, res: Response):Promise<any> => {
    try {
      const { id } = req.params;
      await deleteCourseById(id);
      res.status(200).json({ message: "Course deleted successfully." });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete course." });
    }
  };
