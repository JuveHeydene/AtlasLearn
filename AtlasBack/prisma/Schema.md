# Atlas Platform Prisma Schema Documentation

This Prisma schema defines a comprehensive data model for the **Atlas** educational platform, which supports courses, quizzes, user management, learning paths, analytics, and notifications.

---

## **1. Enums**

### **QuestionType**

Represents the types of questions in quizzes:

- **MCQ** (Multiple Choice Questions)
- **TRUE_FALSE** (True/False questions)
- **SHORT_ANSWER** (Short answer questions)

### **Role**

Defines user roles within the system:

- **STUDENT**
- **TEACHER**
- **ADMIN**

### **ProgressStatus**

Tracks the progress status of learning path items:

- **PENDING**
- **IN_PROGRESS**
- **COMPLETED**

### **FileType**

Specifies file types for course materials:

- **PDF**
- **DOC**
- **DOCX**
- **MP4**
- **MP3**

---

## **2. Models**

### **User**

Represents users in the system.

#### **Fields:**

- `id`: Unique identifier.
- `firstName`, `lastName`, `email`: User details.
- `password`: Encrypted password.
- `role`: User role (default: **Student**).
- `profilePicture`: Optional URL for the profile picture.
- `createdAt`, `updatedAt`: Timestamps for creation and updates.

#### **Relations:**

- `coursesTaught`: Courses taught by the user.
- `enrolledCourses`: Courses enrolled in by the user.
- `quizAttempts`: Quiz attempts made by the user.
- `quizzesCreated`: Quizzes created by the user.
- `leaderboardEntries`: Leaderboard entries for the user.
- `notifications`: Notifications received by the user.
- `learningPath`: Learning path associated with the user.
- `streak`: Streak tracking for the user.

---

### **Course**

Represents a course offered on the platform.

#### **Fields:**

- `id`: Unique identifier.
- `title`: Course title (unique).
- `description`: Course description.
- `teacherId`: ID of the teacher.
- `createdAt`, `updatedAt`: Timestamps for creation and updates.

#### **Relations:**

- `teacher`: The teacher assigned to the course.
- `enrollments`: Students enrolled in the course.
- `quizzes`: Quizzes associated with the course.
- `materials`: Course materials.
- `leaderboardEntries`: Leaderboard entries.
- `learningPathItems`: Learning path items.

---

### **CourseEnrollment**

Tracks a student's enrollment in a course.

#### **Fields:**

- `id`: Unique identifier.
- `studentId`: ID of the student.
- `courseId`: ID of the course.
- `enrolledAt`: Timestamp when the student enrolled.

#### **Relations:**

- `student`: The enrolled student.
- `course`: The enrolled course.

---

### **CourseMaterial**

Represents materials (e.g., PDFs, videos) provided for a course.

#### **Fields:**

- `id`: Unique identifier.
- `courseId`: ID of the course.
- `fileUrl`: URL of the file.
- `fileType`: Type of the file (default: **PDF**).
- `content`: Optional textual content.
- `uploadedAt`: Timestamp when uploaded.

#### **Relations:**

- `course`: The associated course.
- `learningPathContents`: Learning path contents using this material.

---

### **LearningPath**

Represents a personalized learning path for a student.

#### **Fields:**

- `id`: Unique identifier.
- `studentId`: ID of the student (unique per student).
- `createdAt`, `updatedAt`: Timestamps.

#### **Relations:**

- `student`: The student.
- `pathItems`: Items in the learning path.

---

### **LearningPathItem**

Represents an item in a learning path (e.g., a course or module).

#### **Fields:**

- `id`: Unique identifier.
- `learningPathId`: ID of the learning path.
- `courseId`: ID of the course.
- `createdAt`: Timestamp.

#### **Relations:**

- `learningPath`: Parent learning path.
- `course`: Associated course.
- `contents`: Contents of the item.

---

### **LearningPathContent**

Represents content in a learning path item (e.g., a specific material within a course).

#### **Fields:**

- `id`: Unique identifier.
- `pathItemId`: ID of the learning path item.
- `courseMaterialId`: ID of the course material.
- `status`: Progress status (default: **Pending**).
- `completedAt`: Completion timestamp (nullable).

#### **Relations:**

- `pathItem`: Parent learning path item.
- `courseMaterial`: Associated course material.

---

### **Quiz**

Represents a quiz associated with a course.

#### **Fields:**

- `id`: Unique identifier.
- `title`: Quiz title.
- `courseId`: ID of the course.
- `createdBy`: ID of the creator.
- `createdAt`, `updatedAt`: Timestamps.

#### **Relations:**

- `course`: Associated course.
- `creator`: Quiz creator.
- `questions`: Quiz questions.
- `quizAttempts`: Quiz attempts.

---

### **Streak**

Tracks student engagement streaks.

#### **Fields:**

- `id`: Unique identifier.
- `studentId`: ID of the student (unique per student).
- `currentStreak`: Current streak of consecutive days (default: **0**).
- `longestStreak`: Longest streak achieved (default: **0**).
- `lastActive`: Last active timestamp.

#### **Relations:**

- `student`: The associated student.

---

## **Conclusion**

This schema serves as the backbone of the **Atlas** educational platform, ensuring structured management of courses, quizzes, user progress, and analytics. 🚀
