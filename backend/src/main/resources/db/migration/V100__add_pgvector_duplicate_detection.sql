-- Conditionally enable pgvector extension if available, otherwise create a mock vector type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        CREATE EXTENSION IF NOT EXISTS vector;
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
            CREATE DOMAIN vector AS text;
        END IF;
    END IF;
END $$;

-- Add column conditionally
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS title_description_vector vector(768);
        
        -- Create HNSW index for fast cosine distance similarity queries
        CREATE INDEX IF NOT EXISTS reports_vector_hnsw_idx 
        ON reports USING hnsw (title_description_vector vector_cosine_ops);
    ELSE
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS title_description_vector text;
    END IF;
END $$;

