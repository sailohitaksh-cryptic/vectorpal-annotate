import { sql } from '@vercel/postgres';

const TOTAL_USERS = 3;
const RESPONSES_PER_QUESTION = 2;

/**
 * Assigns questions to a new user using random balanced distribution
 * Ensures each question gets exactly 2 assignments across all users
 * and each user gets approximately the same number of questions
 */
export async function assignQuestionsToUser(userId: number) {
  try {
    // Get all active questions (excluding question 98)
    const questionsResult = await sql`
      SELECT question_number 
      FROM questions 
      WHERE is_active = true 
      ORDER BY question_number
    `;
    
    const allQuestions = questionsResult.rows.map(row => row.question_number);
    const totalQuestions = allQuestions.length; // Should be 128 (129 - 1 for question 98)
    
    // Get current assignment counts for each question
    const assignmentCountsResult = await sql`
      SELECT question_number, COUNT(*) as assignment_count
      FROM user_question_assignments
      GROUP BY question_number
    `;
    
    // Create a map of question_number -> current assignment count
    const assignmentCounts = new Map<number, number>();
    assignmentCountsResult.rows.forEach(row => {
      assignmentCounts.set(row.question_number, parseInt(row.assignment_count));
    });
    
    // Get questions that need more assignments (have < 2 assignments)
    const questionsNeedingAssignment = allQuestions.filter(qNum => {
      const currentCount = assignmentCounts.get(qNum) || 0;
      return currentCount < RESPONSES_PER_QUESTION;
    });
    
    // Calculate how many questions this user should get
    // Total annotations needed = totalQuestions * RESPONSES_PER_QUESTION (128 * 2 = 256)
    // Questions per user ≈ 256 / TOTAL_USERS ≈ 85-86
    const questionsPerUser = Math.ceil((totalQuestions * RESPONSES_PER_QUESTION) / TOTAL_USERS);
    
    // Randomly shuffle questions that need assignment
    const shuffled = [...questionsNeedingAssignment].sort(() => Math.random() - 0.5);
    
    // Take the first questionsPerUser questions (or all if less available)
    const questionsToAssign = shuffled.slice(0, Math.min(questionsPerUser, shuffled.length));
    
    // Insert assignments for this user
    for (const questionNum of questionsToAssign) {
      await sql`
        INSERT INTO user_question_assignments (user_id, question_number)
        VALUES (${userId}, ${questionNum})
        ON CONFLICT (user_id, question_number) DO NOTHING
      `;
    }
    
    console.log(`Assigned ${questionsToAssign.length} questions to user ${userId}`);
    
    return {
      success: true,
      assignedCount: questionsToAssign.length,
      questionNumbers: questionsToAssign
    };
  } catch (error) {
    console.error('Error assigning questions:', error);
    return { success: false, error };
  }
}

/**
 * Get all questions assigned to a specific user
 */
export async function getUserAssignedQuestions(userId: number) {
  try {
    const result = await sql`
      SELECT 
        q.question_number,
        q.has_two_images,
        q.image_a_path,
        q.image_b_path,
        a.is_completed,
        a.image_a_description,
        a.image_b_description
      FROM user_question_assignments uqa
      JOIN questions q ON uqa.question_number = q.question_number
      LEFT JOIN annotations a ON a.user_id = uqa.user_id AND a.question_number = q.question_number
      WHERE uqa.user_id = ${userId}
      ORDER BY q.question_number
    `;
    
    return {
      success: true,
      questions: result.rows
    };
  } catch (error) {
    console.error('Error fetching user questions:', error);
    return { success: false, error, questions: [] };
  }
}

/**
 * Get assignment statistics (for debugging/monitoring)
 */
export async function getAssignmentStats() {
  try {
    const userStats = await sql`
      SELECT 
        u.id as user_id,
        u.email,
        COUNT(uqa.question_number) as assigned_count
      FROM users u
      LEFT JOIN user_question_assignments uqa ON u.id = uqa.user_id
      GROUP BY u.id, u.email
    `;
    
    const questionStats = await sql`
      SELECT 
        question_number,
        COUNT(*) as assignment_count
      FROM user_question_assignments
      GROUP BY question_number
      HAVING COUNT(*) != ${RESPONSES_PER_QUESTION}
    `;
    
    return {
      success: true,
      userStats: userStats.rows,
      questionsMissingAssignments: questionStats.rows
    };
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    return { success: false, error };
  }
}
