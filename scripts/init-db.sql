-- Initialize database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create test database for testing
CREATE DATABASE nintei_test;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nintei TO postgres;
GRANT ALL PRIVILEGES ON DATABASE nintei_test TO postgres;
