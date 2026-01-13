import { NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { authMiddleware, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get user info
    const userResult = await sql`
      SELECT id, email, created_at
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get assigned questions count
    const assignedCount = await sql`
      SELECT COUNT(*) as count
      FROM user_question_assignments
      WHERE user_id = ${userId}
    `;

    // Get completed annotations count
    const completedCount = await sql`
      SELECT COUNT(*) as count
      FROM annotations
      WHERE user_id = ${userId} AND is_completed = true
    `;

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        assignedQuestions: parseInt(assignedCount.rows[0].count),
        completedAnnotations: parseInt(completedCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

export default authMiddleware(handler);
