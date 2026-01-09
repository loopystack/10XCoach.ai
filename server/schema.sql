-- =============================================
-- 10X Dashboard Database Schema
-- =============================================

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS huddles CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;

-- =============================================
-- COACHES TABLE
-- =============================================
CREATE TABLE coaches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    specialty VARCHAR(255),
    description TEXT,
    tagline VARCHAR(255),
    avatar VARCHAR(255),
    active BOOLEAN DEFAULT true,
    model VARCHAR(50) DEFAULT 'gpt-4',
    temperature DECIMAL(2,1) DEFAULT 0.7,
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
    business_name VARCHAR(255),
    industry VARCHAR(100),
    plan VARCHAR(50) DEFAULT 'Foundation',
    status VARCHAR(50) DEFAULT 'Active',
    primary_coach_id INTEGER REFERENCES coaches(id),
    last_login TIMESTAMP,
    last_session TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- QUIZZES TABLE
-- =============================================
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    coach_id INTEGER REFERENCES coaches(id),
    score INTEGER,
    completed BOOLEAN DEFAULT false,
    quiz_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- HUDDLES TABLE
-- =============================================
CREATE TABLE huddles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    huddle_date DATE DEFAULT CURRENT_DATE,
    coach_id INTEGER REFERENCES coaches(id),
    user_id INTEGER REFERENCES users(id),
    has_short_agenda BOOLEAN DEFAULT false,
    has_notetaker BOOLEAN DEFAULT false,
    has_action_steps BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTES TABLE
-- =============================================
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    session_date DATE DEFAULT CURRENT_DATE,
    coach_id INTEGER REFERENCES coaches(id),
    user_id INTEGER REFERENCES users(id),
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
    user_id INTEGER REFERENCES users(id),
    assigned_to VARCHAR(100),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_quizzes_user ON quizzes(user_id);
CREATE INDEX idx_quizzes_coach ON quizzes(coach_id);
CREATE INDEX idx_huddles_coach ON huddles(coach_id);
CREATE INDEX idx_huddles_date ON huddles(huddle_date);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_user ON todos(user_id);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Schema created successfully!' as message;

