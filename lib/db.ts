import { sql } from '@vercel/postgres';

export const db = sql;

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create questions table
    await sql`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question_number INTEGER UNIQUE NOT NULL,
        has_two_images BOOLEAN DEFAULT false,
        image_a_path VARCHAR(255) NOT NULL,
        image_b_path VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user_question_assignments table
    await sql`
      CREATE TABLE IF NOT EXISTS user_question_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, question_number)
      )
    `;

    // Create annotations table
    await sql`
      CREATE TABLE IF NOT EXISTS annotations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        image_a_description TEXT,
        image_b_description TEXT,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, question_number)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_assignments ON user_question_assignments(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_annotations_user ON annotations(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_annotations_question ON annotations(question_number)`;

    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

// Populate questions table based on actual images in the repository
export async function populateQuestions() {
  try {
    // Check if questions already exist
    const existingQuestions = await sql`SELECT COUNT(*) as count FROM questions`;
    
    if (existingQuestions.rows[0].count > 0) {
      console.log('Questions already populated');
      return { success: true, message: 'Questions already exist' };
    }

    // Based on actual images in mosquitonator/images directory
    
    // Questions with ONE image only
    const singleImageQuestions = [0, 1, 2];
    
    // Questions with TWO images (y/n pairs)
    const twoImageQuestions = [
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
      41, 42, 43, 44, 45, 46, 49, 50, 51, 52, 53, 55, 56, 57, 58, 59, 60,
      61, 62, 63, 64, 65, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
      81, 82, 83, 84, 85, 87, 88, 89, 90, 91, 92, 93, 95, 96, 97, 99,
      100, 101, 102, 103, 104, 105, 106, 107, 110, 111, 112, 114, 115, 116, 117,
      119, 120, 121, 122, 123, 124, 125, 126, 127
    ];

    // Insert single-image questions
    for (const qNum of singleImageQuestions) {
      await sql`
        INSERT INTO questions (question_number, has_two_images, image_a_path, image_b_path, is_active)
        VALUES (${qNum}, false, ${`/images/${qNum}.png`}, NULL, true)
        ON CONFLICT (question_number) DO NOTHING
      `;
    }

    // Insert two-image questions
    for (const qNum of twoImageQuestions) {
      await sql`
        INSERT INTO questions (question_number, has_two_images, image_a_path, image_b_path, is_active)
        VALUES (${qNum}, true, ${`/images/${qNum}y.png`}, ${`/images/${qNum}n.png`}, true)
        ON CONFLICT (question_number) DO NOTHING
      `;
    }

    const totalQuestions = singleImageQuestions.length + twoImageQuestions.length;
    console.log(`Questions populated successfully - ${totalQuestions} questions total`);
    console.log(`Single image questions: ${singleImageQuestions.length}`);
    console.log(`Two image questions: ${twoImageQuestions.length}`);
    
    return { 
      success: true, 
      message: `${totalQuestions} questions populated`,
      breakdown: {
        singleImage: singleImageQuestions.length,
        twoImages: twoImageQuestions.length,
        total: totalQuestions
      }
    };
  } catch (error) {
    console.error('Error populating questions:', error);
    return { success: false, error };
  }
}
