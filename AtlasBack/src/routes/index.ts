
import { Express } from 'express';
import path from 'path';

//First Architecture
const Authroutes = require(path.resolve(__dirname, 'auth.routes'));
const usersroutes = require(path.resolve(__dirname, 'user'));
const courseroutes = require(path.resolve(__dirname, 'course'));
const quizzesroutes = require(path.resolve(__dirname, 'quiz'));
const questionroutes = require(path.resolve(__dirname, 'question'));
const quizAttemp = require(path.resolve(__dirname, 'quizattempt'));
const coursematerials = require(path.resolve(__dirname, 'courseMaterial'));
const courseenrollement = require(path.resolve(__dirname, 'courseEnrollement'));
const teachercourseenrollement = require(path.resolve(__dirname, 'teacherEnrollement'));
const assignementSubmissions = require(path.resolve(__dirname, 'assignementSubmission'));
const assignments = require(path.resolve(__dirname, 'assignment'));
const lessons = require(path.resolve(__dirname, 'lesson'));
const chapters = require(path.resolve(__dirname, 'chapter'));
const courseprogression = require(path.resolve(__dirname, 'courseProgress'));
const chapterprogression = require(path.resolve(__dirname, 'chapterProgress'));
const lessonprogression = require(path.resolve(__dirname, 'lessonProgress'));
const files = require(path.resolve(__dirname, 'files'));
const notifications = require(path.resolve(__dirname, 'notification'));
//second arcitecture
const sharedUser = require(path.resolve(__dirname, 'shared/user.route'));
const sharedCourse = require(path.resolve(__dirname, 'shared/course.route'));


export const registerRoutes = (app: Express) => {
  app.use('/auth', Authroutes);
  app.use('/users', usersroutes);
  app.use('/course', courseroutes);
  app.use('/quiz', quizzesroutes);
  app.use('/question', questionroutes);
  app.use('/quizattemp', quizAttemp);
  app.use('/coursematerials', coursematerials);
  app.use('/courseenrollement', courseenrollement);
  app.use('/teachercourseenrollement', teachercourseenrollement);
  app.use('/chapter', chapters);
  app.use('/lesson', lessons);
  app.use('/assignment', assignments);
  app.use('/assignmentsubs', assignementSubmissions);
  app.use('/courseprogress', courseprogression);
  app.use('/chapterprogress', chapterprogression);
  app.use('/lessonprogress', lessonprogression);
  app.use('/files', files);
  app.use('/notification', notifications);

   //seconde Arrchitecture
  app.use('/user', sharedUser);
  app.use('/courses', sharedCourse);
  
}; 
