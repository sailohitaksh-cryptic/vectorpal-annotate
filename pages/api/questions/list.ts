import { NextApiResponse } from 'next';
import { authMiddleware, AuthenticatedRequest } from '../../../lib/middleware';
import { getUserAssignedQuestions } from '../../../lib/assignments';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get query parameters for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = 25; // 25 questions per page as per requirements
    const filter = req.query.filter as string; // 'annotated' or 'unannotated'

    // Get all assigned questions for the user
    const result = await getUserAssignedQuestions(userId);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch questions' 
      });
    }

    let questions = result.questions;

    // Filter based on completion status
    if (filter === 'annotated') {
      questions = questions.filter(q => q.is_completed === true);
    } else if (filter === 'unannotated') {
      questions = questions.filter(q => q.is_completed !== true);
    }

    // Calculate pagination
    const totalQuestions = questions.length;
    const totalPages = Math.ceil(totalQuestions / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedQuestions = questions.slice(startIndex, endIndex);

    return res.status(200).json({
      success: true,
      questions: paginatedQuestions,
      pagination: {
        currentPage: page,
        totalPages,
        totalQuestions,
        questionsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

export default authMiddleware(handler);
