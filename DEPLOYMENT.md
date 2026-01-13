# Deployment Guide - Step by Step

This guide will walk you through deploying the Mosquito Annotation App to Vercel.

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Vercel account (sign up at vercel.com)
- [ ] Code pushed to a GitHub repository
- [ ] Mosquito images ready to upload

## Step 1: Prepare Your Repository

### 1.1 Push Code to GitHub

```bash
cd mosquito-annotation-app
git init
git add .
git commit -m "Initial commit - Mosquito Annotation App"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 1.2 Add Images to Repository

```bash
# Create images directory
mkdir -p public/images

# Copy your images from the GitHub repository
# Images should follow naming convention:
# - Two image questions: Ny.png and Nn.png (where N is question number)
# - One image questions: N.png

git add public/images
git commit -m "Add mosquito images"
git push
```

## Step 2: Deploy to Vercel

### 2.1 Create New Project

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import" next to your GitHub repository
4. Vercel will detect Next.js automatically

### 2.2 Configure Project

**Framework Preset**: Next.js (auto-detected)
**Root Directory**: `./` (leave as is)
**Build Command**: `next build` (auto-detected)
**Output Directory**: `.next` (auto-detected)

### 2.3 Add Environment Variables

Click "Environment Variables" and add:

```
JWT_SECRET=<generate-random-string>
```

To generate a secure random string for JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important**: Don't add database variables yet - we'll let Vercel handle those automatically in the next step.

### 2.4 Deploy

Click "Deploy" and wait for the build to complete (2-3 minutes).

## Step 3: Set Up Vercel Postgres

### 3.1 Create Database

1. In your Vercel project dashboard, go to the "Storage" tab
2. Click "Create Database"
3. Select "Postgres"
4. Choose a name (e.g., "mosquito-annotations")
5. Select region closest to your users
6. Click "Create"

### 3.2 Connect Database to Project

1. Once created, click on your database
2. Go to "Settings" tab
3. Under "Projects", click "Connect Project"
4. Select your mosquito-annotation project
5. Click "Connect"

Vercel will automatically add all required database environment variables to your project.

### 3.3 Trigger Redeploy

1. Go back to your project
2. Go to "Deployments" tab
3. Click on the three dots next to the latest deployment
4. Click "Redeploy"
5. Check "Use existing Build Cache"
6. Click "Redeploy"

This ensures your app has the database credentials.

## Step 4: Initialize Database

### 4.1 Create Tables

1. Go to your Vercel Postgres database
2. Click on "Query" tab
3. Copy the contents of `schema.sql` from your project
4. Paste into the query editor
5. Click "Run Query"

You should see success messages for each table created.

### 4.2 Verify Tables

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see: `users`, `questions`, `user_question_assignments`, `annotations`

### 4.3 Initialize Questions

You have two options:

**Option A: Use Vercel Functions (Recommended)**

1. Create a one-time initialization API route
2. Visit the endpoint once to populate questions
3. Delete the endpoint after use

**Option B: Manual SQL**

Run SQL queries directly in Vercel's query interface to insert all 128 questions. (See section below for SQL script)

**Option C: Local Script**

```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Run initialization script
node scripts/init-questions.js
```

### 4.4 SQL Script for Manual Insertion (Option B)

If you choose Option B, here's a sample query (you'll need to customize based on your images):

```sql
-- Example for questions 1-5
INSERT INTO questions (id, has_two_images, image_a_path, image_b_path) VALUES
(1, true, '1y.png', '1n.png'),
(2, true, '2y.png', '2n.png'),
(3, false, '3.png', null),
(4, true, '4y.png', '4n.png'),
(5, true, '5y.png', '5n.png');
-- ... continue for all questions
```

## Step 5: Test Your Deployment

### 5.1 Access Your App

Your app will be available at: `https://your-project-name.vercel.app`

### 5.2 Test User Flow

1. **Sign Up**: Create a test account at `/signup`
   - Questions should be automatically assigned
   
2. **Verify Assignment**: Check database
   ```sql
   SELECT COUNT(*) FROM user_question_assignments;
   -- Should see ~86 records for first user
   ```

3. **Test Annotation**: 
   - Log in
   - Go to dashboard
   - Click on a question
   - Add descriptions
   - Submit
   
4. **Verify Storage**:
   ```sql
   SELECT * FROM annotations;
   -- Should see your test annotation
   ```

### 5.3 Test with Multiple Users

1. Sign up 2 more test accounts
2. Verify each gets assigned questions:
   ```sql
   SELECT 
     u.email,
     COUNT(uqa.question_id) as assigned_questions
   FROM users u
   LEFT JOIN user_question_assignments uqa ON u.id = uqa.user_id
   GROUP BY u.email;
   ```
3. Check that each question has exactly 2 assignments:
   ```sql
   SELECT 
     question_id,
     COUNT(*) as assignment_count
   FROM user_question_assignments
   GROUP BY question_id
   ORDER BY assignment_count DESC;
   ```

## Step 6: Production Checklist

- [ ] Database tables created
- [ ] Questions initialized (128 questions)
- [ ] Test user can sign up
- [ ] Test user can see assigned questions
- [ ] Test user can annotate questions
- [ ] Annotations saved correctly
- [ ] Images load properly
- [ ] Tabs (unannotated/annotated) work
- [ ] Pagination works
- [ ] Logout works
- [ ] Custom domain configured (optional)

## Step 7: Add Real Users

### 7.1 Share Signup Link

Share `https://your-app.vercel.app/signup` with your annotators.

### 7.2 Monitor Progress

Check annotation progress:
```sql
SELECT 
  u.email,
  COUNT(CASE WHEN a.is_complete = true THEN 1 END) as completed,
  COUNT(uqa.question_id) as total_assigned
FROM users u
LEFT JOIN user_question_assignments uqa ON u.id = uqa.user_id
LEFT JOIN annotations a ON a.user_id = u.id AND a.question_id = uqa.question_id
GROUP BY u.email;
```

## Step 8: Custom Domain (Optional)

### 8.1 Add Domain

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow Vercel's DNS configuration instructions

### 8.2 Update DNS

Add DNS records as instructed by Vercel (usually an A record or CNAME).

## Troubleshooting

### Build Fails

**Error**: Module not found
- **Solution**: Run `npm install` locally and make sure all dependencies are in `package.json`

**Error**: Environment variable missing
- **Solution**: Make sure `JWT_SECRET` is set in Vercel project settings

### Database Connection Fails

**Error**: Connection refused
- **Solution**: Verify database is connected to project in Vercel dashboard

**Error**: Table doesn't exist
- **Solution**: Run `schema.sql` in the Vercel Postgres query interface

### Images Don't Load

**Error**: 404 on images
- **Solution**: Make sure images are in `public/images` and pushed to GitHub

### No Questions Assigned

**Error**: User signs up but sees no questions
- **Solution**: Run the question initialization (Step 4.3)

### Multiple Deployments

If you make changes:
1. Push to GitHub
2. Vercel auto-deploys
3. No need to manually redeploy

## Monitoring and Maintenance

### View Logs

1. Go to your Vercel project
2. Click "Deployments"
3. Click on a deployment
4. View "Build Logs" or "Function Logs"

### Database Backup

Vercel Postgres includes automatic backups. To manually backup:

1. Go to database in Vercel
2. Click "Settings"
3. Scroll to "Backups"
4. Click "Create Backup"

### Export Data

See main README.md for CSV export instructions.

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check database query logs
3. Review this guide
4. Check the main README.md
5. Open an issue on GitHub

## Done! 🎉

Your Mosquito Annotation App should now be fully deployed and operational on Vercel!

Users can:
- Sign up and get automatically assigned ~86 questions
- Annotate mosquito images
- Track their progress
- Submit their work

You can:
- Monitor progress via SQL queries
- Export data as CSV
- Manage users if needed
