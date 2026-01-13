/**
 * This script initializes the questions table in the database.
 * Run this once after setting up your database.
 * 
 * Usage: node scripts/init-questions.js
 */

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function initializeQuestions() {
  console.log('Initializing questions...');
  
  try {
    // Check if public/images directory exists
    const imagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      console.log('Creating public/images directory...');
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('Please add your mosquito images to public/images directory');
    }

    // Read what image files exist
    const imageFiles = fs.existsSync(imagesDir) 
      ? fs.readdirSync(imagesDir)
      : [];
    
    console.log(`Found ${imageFiles.length} image files`);

    // Generate question list (1-129, excluding 98)
    const questions = [];
    
    for (let i = 1; i <= 129; i++) {
      if (i === 98) continue; // Skip question 98
      
      // Check if this question has one or two images
      const hasImageA = imageFiles.includes(`${i}y.png`) || imageFiles.includes(`${i}.png`);
      const hasImageB = imageFiles.includes(`${i}n.png`);
      const hasTwoImages = imageFiles.includes(`${i}y.png`) && imageFiles.includes(`${i}n.png`);
      
      let imageAPath, imageBPath;
      
      if (hasTwoImages) {
        imageAPath = `${i}y.png`;
        imageBPath = `${i}n.png`;
      } else if (hasImageA) {
        imageAPath = `${i}.png`;
        imageBPath = null;
      } else {
        // Default naming, image will need to be added
        imageAPath = `${i}.png`;
        imageBPath = null;
        console.log(`Warning: No image found for question ${i}, using default naming`);
      }
      
      questions.push({
        id: i,
        has_two_images: hasTwoImages,
        image_a_path: imageAPath,
        image_b_path: imageBPath,
      });
    }
    
    console.log(`Prepared ${questions.length} questions`);
    console.log(`Questions with 2 images: ${questions.filter(q => q.has_two_images).length}`);
    console.log(`Questions with 1 image: ${questions.filter(q => !q.has_two_images).length}`);

    // Insert questions into database
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const question of questions) {
      try {
        await sql`
          INSERT INTO questions (id, has_two_images, image_a_path, image_b_path)
          VALUES (${question.id}, ${question.has_two_images}, ${question.image_a_path}, ${question.image_b_path})
          ON CONFLICT (id) DO NOTHING
        `;
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting question ${question.id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\nSuccessfully inserted ${insertedCount} questions`);
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} questions (may already exist)`);
    }
    
    // Verify
    const { rows } = await sql`SELECT COUNT(*) as count FROM questions`;
    console.log(`Total questions in database: ${rows[0].count}`);
    
    console.log('\n✅ Questions initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing questions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeQuestions()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeQuestions };
