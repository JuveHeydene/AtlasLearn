import { PrismaClient, Questiondifficulty } from '@prisma/client';
const prisma = new PrismaClient();

interface QuestionSubmit {
  quizId: string;
  difficulty: Questiondifficulty;
}

interface QuizScoreResult {
  totalScore: number;
  passingScore: number;
}

export async function calculateAndUpdateQuizScores(questions: QuestionSubmit[],quizId:string): Promise<QuizScoreResult> {
  // Calculate total score based on difficulty
  const difficultyPoints = {
    EASY: 1,
    INTERMEDIATE: 2,
    ADVANCE: 3
  };

  const totalScore = questions.reduce((sum, question) => {
    return sum + difficultyPoints[question.difficulty];
  }, 0);

  // Calculate passing score (rounded up half of total)
  const passingScore = Math.ceil(totalScore / 2);

  // Update the quiz in database
  await prisma.quiz.update({
    where: { id: quizId },
    data: { totalScore, passingScore }
  });

  return { totalScore, passingScore };
}