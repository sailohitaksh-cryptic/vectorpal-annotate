import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { hashPassword, isValidEmail, isValidPassword, generateToken } from '../../../lib/auth';
import { assignQuestionsToUser } from '../../../lib/assignments';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: passwordValidation.message 
      });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email.toLowerCase()}, ${passwordHash})
      RETURNING id, email, created_at
    `;

    const newUser = result.rows[0];

    // Assign questions to the new user
    const assignmentResult = await assignQuestionsToUser(newUser.id);

    if (!assignmentResult.success) {
      console.error('Failed to assign questions to user:', assignmentResult.error);
      // Don't fail signup, but log the error
    }

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email
    });

    // Set cookie
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    }));

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email
      },
      assignedQuestions: assignmentResult.assignedCount
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
