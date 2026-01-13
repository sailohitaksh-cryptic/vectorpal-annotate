import { NextApiRequest, NextApiResponse } from 'next';
import { initializeDatabase, populateQuestions } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Initialize database tables
    const initResult = await initializeDatabase();
    
    if (!initResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to initialize database',
        error: initResult.error
      });
    }

    // Populate questions
    const populateResult = await populateQuestions();
    
    if (!populateResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to populate questions',
        error: populateResult.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database initialized and questions populated successfully'
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
