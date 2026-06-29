-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column of 768 dimensions (compatible with text-embedding-004)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS title_description_vector vector(768);

-- Create HNSW index for fast cosine distance similarity queries
CREATE INDEX IF NOT EXISTS reports_vector_hnsw_idx 
ON reports USING hnsw (title_description_vector vector_cosine_ops);
