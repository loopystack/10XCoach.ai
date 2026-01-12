-- =============================================
-- 10XCoach.ai Complete Database Schema
-- =============================================
-- This file creates a complete database schema from scratch
-- Based on Prisma schema and all migrations
-- =============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS action_steps CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS coach_assignments CASCADE;
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_templates CASCADE;
DROP TABLE IF EXISTS pillars CASCADE;
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS huddles CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;

-- Drop existing types/enums if they exist
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "UserStatus" CASCADE;
DROP TYPE IF EXISTS "PlanTier" CASCADE;
DROP TYPE IF EXISTS "CoachRole" CASCADE;
DROP TYPE IF EXISTS "SessionStatus" CASCADE;
DROP TYPE IF EXISTS "ActionStepStatus" CASCADE;
DROP TYPE IF EXISTS "Priority" CASCADE;
DROP TYPE IF EXISTS "QuestionType" CASCADE;
DROP TYPE IF EXISTS "HuddleStatus" CASCADE;
DROP TYPE IF EXISTS "TodoStatus" CASCADE;

-- =============================================
-- CREATE ENUMS
-- =============================================

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'COACH_ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL', 'CANCELED', 'PAST_DUE');
CREATE TYPE "PlanTier" AS ENUM ('FOUNDATION', 'MOMENTUM', 'ELITE');
CREATE TYPE "CoachRole" AS ENUM ('STRATEGY', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE', 'CULTURE', 'CUSTOMER_CENTRICITY', 'EXIT_STRATEGY');
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ActionStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "QuestionType" AS ENUM ('SCALE', 'MULTIPLE_CHOICE', 'OPEN');
CREATE TYPE "HuddleStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TodoStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- =============================================
-- COACHES TABLE
-- =============================================
CREATE TABLE coaches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role "CoachRole" DEFAULT 'STRATEGY',
    specialty VARCHAR(255),
    description TEXT,
    tagline VARCHAR(255),
    avatar VARCHAR(255),
    persona_json JSONB,
    voice_id VARCHAR(100),
    active BOOLEAN DEFAULT true,
    model VARCHAR(50) DEFAULT 'gpt-4',
    temperature DECIMAL(3,1) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role "UserRole" DEFAULT 'USER',
    business_name VARCHAR(255),
    industry VARCHAR(100),
    plan "PlanTier" DEFAULT 'FOUNDATION',
    status "UserStatus" DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_token_expiry TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    primary_coach_id INTEGER REFERENCES coaches(id),
    last_login TIMESTAMP,
    last_session TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PLANS TABLE
-- =============================================
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    tier "PlanTier" UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    yearly_price DECIMAL(10,2),
    features_json JSONB NOT NULL,
    max_minutes INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SESSIONS TABLE
-- =============================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration DECIMAL(5,2), -- in minutes (supports fractional minutes)
    transcript_ref TEXT, -- Store full transcript JSON (can exceed 500 chars)
    notes_ref TEXT, -- Store notes reference
    summary TEXT,
    status "SessionStatus" DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ACTION STEPS TABLE
-- =============================================
CREATE TABLE action_steps (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    due_date TIMESTAMP,
    status "ActionStepStatus" DEFAULT 'PENDING',
    priority "Priority" DEFAULT 'MEDIUM',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- QUIZ TEMPLATES TABLE
-- =============================================
CREATE TABLE quiz_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- QUIZ QUESTIONS TABLE
-- =============================================
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type "QuestionType" DEFAULT 'SCALE',
    pillar_tag VARCHAR(100),
    weight DECIMAL(5,2) DEFAULT 1.0,
    "order" INTEGER DEFAULT 0,
    options JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PILLARS TABLE
-- =============================================
CREATE TABLE pillars (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(50),
    description TEXT,
    active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- QUIZ RESULTS TABLE
-- =============================================
CREATE TABLE quiz_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
    coach_id INTEGER REFERENCES coaches(id),
    scores_json JSONB NOT NULL,
    total_score DECIMAL(10,2) NOT NULL,
    answers_json JSONB,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- COACH ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE coach_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    quiz_result_id INTEGER REFERENCES quiz_results(id),
    priority VARCHAR(50) DEFAULT 'PRIMARY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- LEGACY QUIZZES TABLE (for backward compatibility)
-- =============================================
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    score INTEGER,
    completed BOOLEAN DEFAULT false,
    quiz_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- HUDDLES TABLE
-- =============================================
CREATE TABLE huddles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    huddle_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    has_short_agenda BOOLEAN DEFAULT false,
    has_notetaker BOOLEAN DEFAULT false,
    has_action_steps BOOLEAN DEFAULT false,
    status "HuddleStatus" DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTES TABLE
-- =============================================
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TODOS TABLE
-- =============================================
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to VARCHAR(100),
    due_date TIMESTAMP,
    status "TodoStatus" DEFAULT 'PENDING',
    priority "Priority" DEFAULT 'MEDIUM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ADMIN SETTINGS TABLE
-- =============================================
CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BLOG POSTS TABLE
-- =============================================
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    category VARCHAR(100),
    author VARCHAR(100),
    date VARCHAR(50) NOT NULL,
    read_time VARCHAR(50),
    image VARCHAR(255),
    content TEXT,
    published BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_role ON users(role);

-- Coaches indexes
CREATE INDEX idx_coaches_email ON coaches(email);
CREATE INDEX idx_coaches_active ON coaches(active);
CREATE INDEX idx_coaches_role ON coaches(role);

-- Sessions indexes
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_coach ON sessions(coach_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);

-- Action Steps indexes
CREATE INDEX idx_action_steps_user ON action_steps(user_id);
CREATE INDEX idx_action_steps_session ON action_steps(session_id);
CREATE INDEX idx_action_steps_status ON action_steps(status);

-- Quiz Templates indexes
CREATE INDEX idx_quiz_templates_active ON quiz_templates(active);

-- Quiz Questions indexes
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_pillar_tag ON quiz_questions(pillar_tag);

-- Pillars indexes
CREATE INDEX idx_pillars_tag ON pillars(tag);
CREATE INDEX idx_pillars_active ON pillars(active);

-- Quiz Results indexes
CREATE INDEX idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_quiz ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_coach ON quiz_results(coach_id);

-- Coach Assignments indexes
CREATE INDEX idx_coach_assignments_user ON coach_assignments(user_id);
CREATE INDEX idx_coach_assignments_coach ON coach_assignments(coach_id);
CREATE INDEX idx_coach_assignments_created_at ON coach_assignments(created_at);

-- Legacy Quizzes indexes
CREATE INDEX idx_quizzes_user ON quizzes(user_id);
CREATE INDEX idx_quizzes_coach ON quizzes(coach_id);

-- Huddles indexes
CREATE INDEX idx_huddles_coach ON huddles(coach_id);
CREATE INDEX idx_huddles_user ON huddles(user_id);
CREATE INDEX idx_huddles_date ON huddles(huddle_date);
CREATE INDEX idx_huddles_status ON huddles(status);

-- Notes indexes
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_coach ON notes(coach_id);
CREATE INDEX idx_notes_session_date ON notes(session_date);

-- Todos indexes
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_todos_priority ON todos(priority);

-- Blog Posts indexes
CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_order ON blog_posts("order");

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN sessions.duration IS 'Session duration in minutes (supports fractional minutes for precision)';
COMMENT ON COLUMN sessions.transcript_ref IS 'Store full transcript JSON (can exceed 500 chars)';
COMMENT ON COLUMN sessions.notes_ref IS 'Store notes reference';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Complete database schema created successfully!' as message;

