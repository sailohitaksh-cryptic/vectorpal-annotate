# Mosquito Annotation App - Backend Setup (Part 1)

## Overview
This is the backend and database setup for the mosquito morphological feature annotation webapp. It includes:
- Authentication system (signup, login, logout)
- Question assignment logic (random balanced distribution for 3 users)
- Annotation storage and retrieval
- CSV export functionality

## Tech Stack
- **Framework**: Next.js 14 with TypeScript
- **Database**: Vercel Postgres
- **Authentication**: JWT with httpOnly cookies
- **Password Hashing**: bcryptjs

## Database Schema

### Tables:
1. **users** - Store user accounts
2. **questions** - Store all 128 questions (excluding question 98)
3. **user_question_assignments** - Track which questions are assigned to which users
4. **annotations** - Store user responses/descriptions

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account and auto-assign questions
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout and clear token
- `GET /api/auth/me` - Get current user info

### Questions
- `GET /api/questions/list?page=1&filter=unannotated` - Get paginated list of assigned questions
  - Query params: `page` (default: 1), `filter` (annotated/unannotated)
- `GET /api/questions/detail?number=5` - Get specific question details

### Annotations
- `POST /api/annotations/save` - Save/update annotation for a question
  - Body: `{ questionNumber, imageADescription, imageBDescription }`
- `GET /api/annotations/export` - Export all annotations as CSV

### Setup
- `POST /api/setup/init` - Initialize database tables and populate questions (run once)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Vercel Postgres
1. Go to your Vercel dashboard
2. Create a new Postgres database
3. Copy the connection strings

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
POSTGRES_URL="your-postgres-url"
POSTGRES_PRISMA_URL="your-postgres-prisma-url"
POSTGRES_URL_NON_POOLING="your-postgres-url-non-pooling"
POSTGRES_USER="default"
POSTGRES_HOST="your-postgres-host"
POSTGRES_PASSWORD="your-password"
POSTGRES_DATABASE="verceldb"

JWT_SECRET="generate-a-random-secret-key-here"
NODE_ENV="development"
```

### 4. Initialize Database
After deploying or running locally, make a POST request to:
```bash
curl -X POST http://localhost:3000/api/setup/init
```

This will:
- Create all database tables
- Populate the questions table with 128 questions

### 5. Run Development Server
```bash
npm run dev
```

## Question Assignment Logic

When a user signs up:
1. The system calculates how many questions each user should get (≈85-86 for 3 users)
2. It identifies questions that need more assignments (< 2 assignments)
3. It randomly shuffles these questions
4. It assigns the appropriate number to the new user

This ensures:
- Each question gets exactly 2 user responses
- Each user gets approximately the same number of questions
- Distribution is randomized (not sequential)

## Testing the API

### 1. Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### 3. Get Assigned Questions
```bash
curl http://localhost:3000/api/questions/list?page=1&filter=unannotated \
  -b cookies.txt
```

### 4. Save Annotation
```bash
curl -X POST http://localhost:3000/api/annotations/save \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "questionNumber": 5,
    "imageADescription": "Mosquito with dark proboscis",
    "imageBDescription": "Mosquito with light proboscis"
  }'
```

### 5. Export CSV
```bash
curl http://localhost:3000/api/annotations/export -o annotations.csv
```

## Next Steps (Part 2)
- Build login/signup UI pages
- Create homepage with tabs and pagination
- Create annotation interface with image display
- Add navigation and edit functionality

## File Structure
```
mosquito-annotation-app/
├── lib/
│   ├── db.ts                 # Database connection and initialization
│   ├── auth.ts               # Authentication utilities
│   ├── middleware.ts         # Auth middleware
│   └── assignments.ts        # Question assignment logic
├── pages/
│   └── api/
│       ├── auth/
│       │   ├── signup.ts
│       │   ├── login.ts
│       │   ├── logout.ts
│       │   └── me.ts
│       ├── questions/
│       │   ├── list.ts
│       │   └── detail.ts
│       ├── annotations/
│       │   ├── save.ts
│       │   └── export.ts
│       └── setup/
│           └── init.ts
├── schema.sql                # Database schema reference
├── package.json
├── tsconfig.json
└── next.config.js
```

## Notes
- Passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- Cookies are httpOnly and secure in production
- Question 98 is excluded as per requirements
- Images should be placed in `/public/images/` directory
