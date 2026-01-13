import { NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { authMiddleware, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const userId = req.user?.userId;
    const questionNumber = parseInt(req.query.number as string);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (isNaN(questionNumber) || questionNumber < 0) {
      return res.status(400).json({ success: false, message: 'Invalid question number' });
    }

    // Check if user is assigned to this question
    const assignmentCheck = await sql`
      SELECT id FROM user_question_assignments
      WHERE user_id = ${userId} AND question_number = ${questionNumber}
    `;

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this question' 
      });
    }

    // Get question details
    const questionResult = await sql`
      SELECT 
        q.question_number,
        q.has_two_images,
        q.image_a_path,
        q.image_b_path,
        a.image_a_description,
        a.image_b_description,
        a.is_completed
      FROM questions q
      LEFT JOIN annotations a ON a.user_id = ${userId} AND a.question_number = q.question_number
      WHERE q.question_number = ${questionNumber} AND q.is_active = true
    `;

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const question = questionResult.rows[0];

    return res.status(200).json({
      success: true,
      question: {
        questionNumber: question.question_number,
        hasTwoImages: question.has_two_images,
        imageAPath: question.image_a_path,
        imageBPath: question.image_b_path,
        imageADescription: question.image_a_description || '',
        imageBDescription: question.image_b_description || '',
        isCompleted: question.is_completed || false
      }
    });
  } catch (error) {
    console.error('Get question error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

export default authMiddleware(handler);
