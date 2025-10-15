#!/usr/bin/env python3
"""
Schema Mapper Agent

Purpose: Database schema analysis and column classification
Responsibilities:
- Analyze database table schemas and retrieve column information
- Use LLM-powered semantic classification to map columns to 5 feature buckets
- Return structured column mapping with confidence scores and reasoning
- Include unmapped columns and statistical methodology documentation

Version: 1.0.0 (Specialized Schema Mapper Agent)
"""

import os
import json
import logging
import psycopg2
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from agents.model_factory import ModelFactory

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SchemaMappingError(Exception):
    """Custom exception for schema mapping errors"""
    pass


class SchemaMapperAgent:
    """
    Schema Mapper Agent
    
    Analyzes database table schemas and maps columns to churn analysis feature buckets
    using LLM-powered semantic classification.
    """
    
    def __init__(self, provider: str = 'openai', model_name: Optional[str] = None, email: Optional[str] = None):
        """
        Initialize the Schema Mapper Agent
        
        Args:
            provider: LLM provider ('openai' or 'gemini')
            model_name: Specific model name (optional)
            email: User email for database routing (optional)
        """
        self.agent_name = "Schema Mapper Agent"
        self.version = "1.0.0"
        self.provider = provider
        self.email = email
        
        # Initialize LLM
        try:
            self.model_factory = ModelFactory(provider=provider, model_name=model_name)
            self.model_name = self.model_factory.model_name
            logger.info(f"Initialized {self.agent_name} with {provider} ({self.model_name})")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            raise SchemaMappingError(f"LLM initialization failed: {e}")
    
    def get_db_connection(self) -> psycopg2.extensions.connection:
        """Get database connection using CRM router pattern"""
        try:
            # Try to use CRM router's connection function
            try:
                from routers.crm_data_router import get_db_connection as crm_get_db_connection
                conn = crm_get_db_connection(self.email)
                logger.info(f"Database connection established using CRM router")
                return conn
            except ImportError:
                logger.warning("Could not import CRM router, using direct connection")
                pass
            
            # Fallback to direct connection
            config = {
                'host': os.getenv('SESSIONS_DB_HOST'),
                'port': int(os.getenv('SESSIONS_DB_PORT', 5432)),
                'database': os.getenv('SESSIONS_DB_NAME'),
                'user': os.getenv('SESSIONS_DB_USER'),
                'password': os.getenv('SESSIONS_DB_PASSWORD')
            }
            conn = psycopg2.connect(**config)
            logger.info(f"Database connection established successfully")
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise SchemaMappingError(f"Database connection failed: {e}")
    
    def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """Get table schema with column metadata and sample values"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Get column information with data types and sample values
            query = """
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = %s 
            ORDER BY ordinal_position;
            """
            
            cursor.execute(query, (table_name,))
            columns = cursor.fetchall()
            
            if not columns:
                raise SchemaMappingError(f"Table '{table_name}' not found or has no columns")
            
            # Get sample values for each column
            schema = []
            for col_name, data_type, is_nullable, default_val in columns:
                try:
                    # Get sample values (non-null, distinct)
                    sample_query = f"""
                    SELECT DISTINCT "{col_name}" 
                    FROM {table_name} 
                    WHERE "{col_name}" IS NOT NULL 
                    LIMIT 5
                    """
                    cursor.execute(sample_query)
                    sample_values = [str(row[0]) for row in cursor.fetchall()]
                    
                    schema.append({
                        'column_name': col_name,
                        'data_type': data_type,
                        'is_nullable': is_nullable,
                        'default_value': default_val,
                        'sample_values': sample_values
                    })
                except Exception as e:
                    logger.warning(f"Could not get sample values for column {col_name}: {e}")
                    schema.append({
                        'column_name': col_name,
                        'data_type': data_type,
                        'is_nullable': is_nullable,
                        'default_value': default_val,
                        'sample_values': []
                    })
            
            cursor.close()
            conn.close()
            
            logger.info(f"Retrieved schema for {table_name}: {len(schema)} columns")
            return schema
            
        except Exception as e:
            logger.error(f"Error getting table schema: {e}")
            raise SchemaMappingError(f"Schema retrieval failed: {e}")
    
    def _build_schema_mapping_prompt(self, table_name: str, schema: List[Dict[str, Any]]) -> str:
        """Build prompt for LLM-powered schema mapping"""
        
        # Build schema description
        schema_description = f"Table: {table_name}\n"
        schema_description += f"Total Columns: {len(schema)}\n\n"
        
        for i, col in enumerate(schema, 1):
            col_name = col['column_name']
            data_type = col['data_type']
            sample_values = col.get('sample_values', [])
            sample_str = ', '.join(sample_values[:3]) if sample_values else 'No samples'
            
            schema_description += f"{i:2d}. {col_name} ({data_type})\n"
            schema_description += f"    Sample values: {sample_str}\n"
        
        prompt = f"""You are a database schema analysis expert. Analyze the following table schema and map columns to churn analysis feature buckets.

{schema_description}

TASK: Map columns to these 5 feature buckets (multiple columns per bucket allowed):

1. RECENCY: Date/timestamp columns for calculating days since last activity
2. FREQUENCY: Columns for counting transactions, orders, or interactions
3. MONETARY: Financial columns (sales, revenue, costs, amounts)
4. CATEGORY_DEPENDENCY: Product categories, product types, divisions, departments, segments, classifications for dependency analysis
   - PRIORITY: Look for columns containing product names, category names, product types, item categories, department names, division names
   - Examples: product_category, category, product_type, item_type, department, division, segment, classification, product_name, item_name
5. LIFECYCLE_STAGE: Customer identifiers, account creation dates, status fields

INSTRUCTIONS:
- Examine ALL {len(schema)} columns systematically
- Map multiple relevant columns per bucket (not just one)
- CRITICAL: Pay special attention to CATEGORY_DEPENDENCY - aggressively identify any columns related to products, categories, types, or classifications
- Provide confidence scores (0.0-1.0) and detailed reasoning
- List unmapped columns
- Use semantic understanding, not just keyword matching

CRITICAL: Return ONLY valid JSON in this EXACT format (no markdown, no extra text, ensure all strings are properly escaped):

{{
  "column_mapping": {{
    "recency": [
      {{
        "column": "column_name",
        "subtype": "primary_date|secondary_date|update_timestamp",
        "confidence": 0.95,
        "reason": "Detailed explanation of why this column fits recency analysis"
      }}
    ],
    "frequency": [
      {{
        "column": "column_name", 
        "subtype": "transaction_count|order_id|quantity",
        "confidence": 0.90,
        "reason": "Detailed explanation of why this column fits frequency analysis"
      }}
    ],
    "monetary": [
      {{
        "column": "column_name",
        "subtype": "amount|cost|profit|total",
        "confidence": 0.95,
        "reason": "Detailed explanation of why this column fits monetary analysis"
      }}
    ],
    "category_dependency": [
      {{
        "column": "column_name",
        "subtype": "product_category|product_type|category|division|department|segment|vendor|type|classification",
        "confidence": 0.85,
        "reason": "Detailed explanation of why this column fits category dependency analysis (e.g., contains product categories, item types, department classifications, or any categorical grouping of products/services)"
      }}
    ],
    "lifecycle_stage": [
      {{
        "column": "column_name",
        "subtype": "customer_id|first_purchase|status|stage",
        "confidence": 0.90,
        "reason": "Detailed explanation of why this column fits lifecycle stage analysis"
      }}
    ],
    "unmapped": [
      {{
        "column": "column_name",
        "reason": "Detailed explanation of why this column doesn't fit any bucket"
      }}
    ]
  }},
  "mapping_summary": {{
    "total_columns_examined": {len(schema)},
    "total_columns_mapped": 0,
    "total_columns_unmapped": 0,
    "mapping_coverage_percentage": 0.0
  }},
  "statistical_methodology": {{
    "classification_approach": "LLM-powered semantic analysis with confidence scoring",
    "bucket_definitions": {{
      "recency": "Date/timestamp fields for calculating time since last activity",
      "frequency": "Countable transaction or interaction identifiers",
      "monetary": "Financial value fields for revenue and cost analysis", 
      "category_dependency": "Categorical fields for product/service segmentation",
      "lifecycle_stage": "Customer identification and status tracking fields"
    }},
    "confidence_scoring": {{
      "high_confidence": "0.8-1.0: Clear semantic match with bucket purpose",
      "medium_confidence": "0.6-0.79: Probable match with some uncertainty",
      "low_confidence": "0.4-0.59: Possible match requiring validation"
    }}
  }}
}}"""
        
        return prompt
    
    def map_table_schema(self, table_name: str) -> Dict[str, Any]:
        """
        Map table schema to churn analysis feature buckets
        
        Args:
            table_name: Name of the table to analyze
            
        Returns:
            Dictionary containing column mappings, summary, and methodology
        """
        try:
            logger.info(f"Starting schema mapping for table: {table_name}")
            
            # Get table schema
            schema = self.get_table_schema(table_name)
            
            # Build LLM prompt
            prompt = self._build_schema_mapping_prompt(table_name, schema)
            
            # Get LLM response
            response = self.model_factory.generate_content(prompt)
            
            # Clean and parse response
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON response with error handling
            try:
                result = json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing failed: {e}")
                # Try to extract JSON from partial response
                try:
                    # Find the first { and try to parse from there
                    start_idx = cleaned_response.find('{')
                    if start_idx != -1:
                        # Find the matching closing brace
                        brace_count = 0
                        end_idx = start_idx
                        for i, char in enumerate(cleaned_response[start_idx:], start_idx):
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    end_idx = i + 1
                                    break
                        
                        partial_json = cleaned_response[start_idx:end_idx]
                        result = json.loads(partial_json)
                        logger.info("Successfully parsed partial JSON response")
                    else:
                        raise e
                except:
                    raise e
            
            # Update mapping summary
            column_mapping = result.get('column_mapping', {})
            total_mapped = 0
            for bucket_name, columns in column_mapping.items():
                if bucket_name != 'unmapped' and columns:
                    total_mapped += len(columns)

            total_unmapped = len(column_mapping.get('unmapped', []))
            total_examined = len(schema)  # Use actual schema length, not just mapped + unmapped
            coverage_percentage = (total_mapped / total_examined * 100) if total_examined > 0 else 0
            
            # Calculate LLM classification failures
            total_returned_by_llm = total_mapped + total_unmapped
            llm_missed_columns = total_examined - total_returned_by_llm

            if 'mapping_summary' in result:
                result['mapping_summary'].update({
                    'total_columns_examined': total_examined,
                    'total_columns_mapped': total_mapped,
                    'total_columns_unmapped': total_unmapped,
                    'total_columns_missed_by_llm': llm_missed_columns,
                    'mapping_coverage_percentage': round(coverage_percentage, 1),
                    'llm_classification_success_rate': round((total_returned_by_llm / total_examined * 100), 1) if total_examined > 0 else 0
                })
            
            logger.info(f"Schema mapping completed: {total_mapped} mapped, {total_unmapped} unmapped")
            return result
            
        except Exception as e:
            logger.error(f"Schema mapping failed: {e}")
            raise SchemaMappingError(f"Schema mapping failed: {e}")


if __name__ == "__main__":
    # Test the Schema Mapper Agent
    agent = SchemaMapperAgent(provider='openai')
    result = agent.map_table_schema('sales_data')
    print(json.dumps(result, indent=2))
