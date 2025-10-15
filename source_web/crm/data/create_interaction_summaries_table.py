"""
Create interaction_summaries table for storing pre-generated customer interaction summaries.
This table enables automated midnight batch processing and caching of AI-generated summaries.
"""

import logging
import sys
import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.crm_data_router import get_db_connection

logger = logging.getLogger(__name__)

def create_interaction_summaries_table():
    """Create the interaction_summaries table for storing pre-generated summaries."""
    
    try:
        # Use the same database connection as the CRM system
        conn = get_db_connection('system@preludeos.com')  # System user for migrations
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Create the interaction_summaries table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS interaction_summaries (
            summary_id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            
            -- Summary content (JSON format matching current API response)
            summary_data JSONB NOT NULL,
            
            -- Generation metadata
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            generated_by VARCHAR(255) DEFAULT 'automated_batch_job',
            generation_type VARCHAR(50) DEFAULT 'automated', -- 'automated' or 'manual'
            
            -- Analysis period information
            period_analyzed_days INTEGER DEFAULT 30,
            interactions_analyzed INTEGER DEFAULT 0,
            
            -- Agent information
            agent_used VARCHAR(100),
            ai_model_used VARCHAR(100),
            
            -- Processing metadata
            processing_time_ms INTEGER,
            error_message TEXT,
            status VARCHAR(20) DEFAULT 'success', -- 'success', 'error', 'partial'
            
            -- Data freshness tracking
            last_interaction_date TIMESTAMP WITH TIME ZONE,
            data_cutoff_date TIMESTAMP WITH TIME ZONE,
            
            -- Indexing and constraints
            FOREIGN KEY (customer_id) REFERENCES clients_info(client_id) ON DELETE CASCADE,
            UNIQUE(customer_id, generated_at) -- Prevent duplicate summaries for same customer at same time
        );
        """
        
        cursor.execute(create_table_sql)
        
        # Create indexes for performance
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_interaction_summaries_customer_id ON interaction_summaries(customer_id);",
            "CREATE INDEX IF NOT EXISTS idx_interaction_summaries_generated_at ON interaction_summaries(generated_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_interaction_summaries_status ON interaction_summaries(status);",
            "CREATE INDEX IF NOT EXISTS idx_interaction_summaries_generation_type ON interaction_summaries(generation_type);",
            "CREATE INDEX IF NOT EXISTS idx_interaction_summaries_customer_latest ON interaction_summaries(customer_id, generated_at DESC);",
        ]
        
        for index_sql in indexes_sql:
            cursor.execute(index_sql)
        
        # Create a view for getting the latest summary per customer
        create_view_sql = """
        CREATE OR REPLACE VIEW latest_interaction_summaries AS
        SELECT DISTINCT ON (customer_id) 
            summary_id,
            customer_id,
            summary_data,
            generated_at,
            generated_by,
            generation_type,
            period_analyzed_days,
            interactions_analyzed,
            agent_used,
            ai_model_used,
            processing_time_ms,
            status,
            last_interaction_date,
            data_cutoff_date
        FROM interaction_summaries 
        ORDER BY customer_id, generated_at DESC;
        """
        
        cursor.execute(create_view_sql)
        
        # Add helpful comments
        comments_sql = [
            "COMMENT ON TABLE interaction_summaries IS 'Stores pre-generated AI interaction summaries for customers to enable automated batch processing and caching';",
            "COMMENT ON COLUMN interaction_summaries.summary_data IS 'JSON data matching InteractionSummaryResponse format from the API';",
            "COMMENT ON COLUMN interaction_summaries.generation_type IS 'automated (midnight batch job) or manual (user-triggered)';",
            "COMMENT ON COLUMN interaction_summaries.agent_used IS 'AI agent class name used for generation (e.g., IcebreakerIntroAgent)';",
            "COMMENT ON COLUMN interaction_summaries.data_cutoff_date IS 'Latest interaction date considered in this summary';",
            "COMMENT ON VIEW latest_interaction_summaries IS 'View showing the most recent summary for each customer';"
        ]
        
        for comment_sql in comments_sql:
            cursor.execute(comment_sql)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("✅ Successfully created interaction_summaries table with indexes and views")
        print("✅ interaction_summaries table created successfully!")
        print("📊 Table includes:")
        print("   - JSON summary storage matching current API format")
        print("   - Generation metadata and performance tracking")
        print("   - Agent and AI model tracking")
        print("   - Data freshness and error handling")
        print("   - Optimized indexes for fast queries")
        print("   - latest_interaction_summaries view for easy access")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating interaction_summaries table: {e}")
        print(f"❌ Error: {e}")
        return False

def drop_interaction_summaries_table():
    """Drop the interaction_summaries table (for testing/cleanup)."""
    
    try:
        conn = get_db_connection('system@preludeos.com')
        cursor = conn.cursor()
        
        cursor.execute("DROP VIEW IF EXISTS latest_interaction_summaries;")
        cursor.execute("DROP TABLE IF EXISTS interaction_summaries CASCADE;")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("✅ Successfully dropped interaction_summaries table and view")
        print("✅ interaction_summaries table dropped successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error dropping interaction_summaries table: {e}")
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "drop":
        drop_interaction_summaries_table()
    else:
        create_interaction_summaries_table()
