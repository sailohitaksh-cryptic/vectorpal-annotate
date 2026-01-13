import { NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { authMiddleware, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const userId = req.user?.userId;
    const { questionNumber, imageADescription, imageBDescription } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (questionNumber === undefined || questionNumber === null || isNaN(questionNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid question number is required' 
      });
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

    // Get question details to check if it has two images
    const questionResult = await sql`
      SELECT has_two_images FROM questions WHERE question_number = ${questionNumber}
    `;

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const hasTwoImages = questionResult.rows[0].has_two_images;

    // Safely handle descriptions - default to empty string if undefined
    const descA = imageADescription ? imageADescription.trim() : '';
    const descB = imageBDescription ? imageBDescription.trim() : '';

    // For auto-save: Allow partial saves (don't require all fields filled)
    // But only mark as completed if ALL required fields are filled
    
    // Check if both descriptions are filled (for completion status)
    const isCompleted = hasTwoImages 
      ? (descA !== '' && descB !== '')
      : (descA !== '');

    // Upsert annotation
    const result = await sql`
      INSERT INTO annotations (
        user_id, 
        question_number, 
        image_a_description, 
        image_b_description, 
        is_completed,
        updated_at
      )
      VALUES (
        ${userId}, 
        ${questionNumber}, 
        ${descA}, 
        ${hasTwoImages ? descB : null}, 
        ${isCompleted},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, question_number) 
      DO UPDATE SET 
        image_a_description = ${descA},
        image_b_description = ${hasTwoImages ? descB : null},
        is_completed = ${isCompleted},
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, is_completed
    `;

    return res.status(200).json({
      success: true,
      message: isCompleted ? 'Annotation saved successfully' : 'Draft saved',
      annotation: {
        id: result.rows[0].id,
        isCompleted: result.rows[0].is_completed
      }
    });
  } catch (error) {
    console.error('Save annotation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

export default authMiddleware(handler);