/**
 * Demo data: one admin, one teacher, two students and a published course
 * with two chapters, lessons and enrolments.
 *
 * Run with: npm run seed   (idempotent: existing records are kept)
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo1234";

const users = [
  { email: "admin@atlaslearn.local", firstName: "Ada", lastName: "Admin", role: Role.ADMIN },
  { email: "teacher@atlaslearn.local", firstName: "Thomas", lastName: "Teacher", role: Role.TEACHER },
  { email: "student@atlaslearn.local", firstName: "Sarah", lastName: "Student", role: Role.STUDENT },
  { email: "student2@atlaslearn.local", firstName: "Samuel", lastName: "Student", role: Role.STUDENT },
];

const course = {
  title: "Introduction to Web Development",
  description: "HTML, CSS and JavaScript basics, from a first page to an interactive form.",
  chapters: [
    {
      title: "HTML fundamentals",
      lessons: [
        { title: "Structure of an HTML page", html: "<h2>Structure of an HTML page</h2><p>Every page starts with <code>&lt;!doctype html&gt;</code>, then <code>&lt;head&gt;</code> and <code>&lt;body&gt;</code>.</p>" },
        { title: "Text, links and images", html: "<h2>Text, links and images</h2><p>Use <code>&lt;p&gt;</code>, <code>&lt;a href&gt;</code> and <code>&lt;img alt&gt;</code>.</p>" },
      ],
    },
    {
      title: "Styling with CSS",
      lessons: [
        { title: "Selectors and properties", html: "<h2>Selectors and properties</h2><p>A rule is a selector followed by declarations: <code>p { color: navy; }</code>.</p>" },
        { title: "Flexbox layout", html: "<h2>Flexbox layout</h2><p><code>display: flex</code> lays children out in a row or a column.</p>" },
      ],
    },
  ],
};

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password },
    });
    created[u.role === Role.STUDENT ? u.email : u.role] = user.id;
  }

  const teacherId = created[Role.TEACHER];
  const dbCourse = await prisma.course.upsert({
    where: { title: course.title },
    update: {},
    create: { title: course.title, description: course.description, teacherId, status: "PUBLISHED" },
  });

  for (const [ci, chapter] of course.chapters.entries()) {
    const dbChapter = await prisma.chapter.upsert({
      where: { courseId_title: { courseId: dbCourse.id, title: chapter.title } },
      update: {},
      create: { title: chapter.title, order: ci + 1, courseId: dbCourse.id },
    });
    for (const [li, lesson] of chapter.lessons.entries()) {
      await prisma.lesson.upsert({
        where: { chapterId_title: { chapterId: dbChapter.id, title: lesson.title } },
        update: {},
        create: { title: lesson.title, html: lesson.html, order: li + 1, duration: 600, chapterId: dbChapter.id },
      });
    }
  }

  for (const u of users.filter((x) => x.role === Role.STUDENT)) {
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: created[u.email], courseId: dbCourse.id } },
      update: {},
      create: { studentId: created[u.email], courseId: dbCourse.id },
    });
  }

  console.log(`Demo data ready. Sign in with ${users.map((u) => u.email).join(", ")} (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
