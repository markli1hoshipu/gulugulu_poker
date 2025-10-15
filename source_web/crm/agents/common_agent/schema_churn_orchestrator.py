#!/usr/bin/env python3
"""
Schema-History Pattern Orchestrator Agent

Purpose: Orchestrate Schema Mapper and History Pattern Analysis agents
Responsibilities:
- Maintain existing public interface with backward compatibility
- Coordinate between Schema Mapper Agent and History Pattern Analysis Agent
- Combine results into the expected JSON output structure
- Provide history patterns for downstream churn risk assessment by CRM agents

Version: 2.0.0 (Updated for History Pattern Analysis)
"""

import logging
from typing import Dict, List, Any, Optional
from .schema_mapper_agent_specialized import SchemaMapperAgent as SpecializedSchemaMapper
from .history_pattern_analysis_agent import HistoryPatternAnalysisAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SchemaChurnOrchestratorError(Exception):
    """Custom exception for orchestrator errors"""
    pass


class SchemaChurnOrchestrator:
    """
    Schema-History Pattern Orchestrator Agent

    Orchestrates the Schema Mapper Agent and History Pattern Analysis Agent to provide
    purchase history patterns for downstream churn risk assessment by CRM agents.
    Maintains backward compatibility with existing interface.
    """

    def __init__(self, provider: str = 'openai', model_name: Optional[str] = None, email: Optional[str] = None):
        """
        Initialize the Schema-History Pattern Orchestrator

        Args:
            provider: LLM provider ('openai' or 'gemini')
            model_name: Specific model name (optional)
            email: User email for database routing (optional)
        """
        self.agent_name = "Schema-Mapper-to-History-Pattern Agent"
        self.version = "4.0.0"
        self.provider = provider
        self.email = email

        # Initialize specialized agents
        try:
            self.schema_mapper = SpecializedSchemaMapper(provider=provider, model_name=model_name, email=email)
            self.history_analyzer = HistoryPatternAnalysisAgent(provider=provider, model_name=model_name, email=email)
            logger.info(f"Initialized {self.agent_name} orchestrator with {provider}")
        except Exception as e:
            logger.error(f"Failed to initialize orchestrator: {e}")
            raise SchemaChurnOrchestratorError(f"Orchestrator initialization failed: {e}")
    
    @property
    def model_name(self) -> str:
        """Get model name from schema mapper agent"""
        return self.schema_mapper.model_name
    
    def analyze_customer_history_patterns(self, table_name: str, target_customer: str = "10003",
                               timezone: str = "America/Los_Angeles", currency: str = "USD") -> Dict[str, Any]:
        """
        Main method: Analyze customer purchase history patterns

        This method provides history pattern analysis for downstream churn risk assessment
        by CRM agents (NextActionInsightAgent, RestartMomentumInsightAgent).

        Args:
            table_name: Name of the table to analyze
            target_customer: Specific customer to analyze (default: "10003")
            timezone: Timezone for date calculations
            currency: Currency for monetary normalization

        Returns:
            Complete history pattern analysis with features, positive_signals, and risk_indicators
        """
        try:
            logger.info(f"Starting orchestrated Schema-Mapper-to-History-Pattern analysis for table: {table_name}, customer: {target_customer}")

            # Step 1: Schema Mapping
            logger.info("Step 1: Performing schema mapping...")
            schema_mapping_result = self.schema_mapper.map_table_schema(table_name)

            # Step 2: History Pattern Analysis
            logger.info("Step 2: Performing history pattern analysis...")
            history_analysis_result = self.history_analyzer.analyze_customer_history_patterns(
                table_name=table_name,
                column_mapping=schema_mapping_result,
                target_customer=target_customer,
                timezone=timezone,
                currency=currency
            )

            # Step 3: Combine results
            logger.info("Step 3: get history pattern insight...")
            combined_result = self._combine_results(schema_mapping_result, history_analysis_result)

            logger.info(f"Orchestrated analysis completed for {table_name}")
            return combined_result
            
        except Exception as e:
            logger.error(f"Orchestrated analysis failed: {e}")
            # Return error structure that matches expected format
            return {
                "column_mapping": {
                    "recency": [],
                    "frequency": [],
                    "monetary": [],
                    "category_dependency": [],
                    "lifecycle_stage": [],
                    "unmapped": []
                },
                "features": {
                    "grouping_key_used": "none",
                    "recency": {"days_since_last_purchase": {"value": None, "notes": "analysis failed"}},
                    "frequency": {"order_count_3m": None, "order_count_prev3m": None},
                    "monetary": {"sales_3m": None, "sales_prev3m": None, "sales_12m": None},
                    "category_dependency": {"top_category": None},
                    "lifecycle_stage": {"stage_inference": "unknown"}
                },
                "pattern_analysis": {
                    "detailed_patterns": [f"Orchestrated analysis failed: {str(e)}"],
                    "positive_signals": [],
                    "risk_indicators": [],
                    "bucket_signals": {
                        "recency": {"signal_strength": "weak", "detail": "Analysis failed"},
                        "frequency": {"signal_strength": "weak", "detail": "Analysis failed"},
                        "monetary": {"signal_strength": "weak", "detail": "Analysis failed"},
                        "category_dependency": {"signal_strength": "weak", "detail": "Analysis failed"},
                        "lifecycle_stage": {"signal_strength": "weak", "detail": "Analysis failed"}
                    }
                }
            }

    # Backward compatibility alias
    def analyze_table_for_churn(self, table_name: str, target_customer: str = "10003",
                               timezone: str = "America/Los_Angeles", currency: str = "USD") -> Dict[str, Any]:
        """
        Backward compatibility method - calls analyze_customer_history_patterns

        DEPRECATED: Use analyze_customer_history_patterns() instead.
        This method is maintained for backward compatibility with existing code.
        """
        logger.warning("analyze_table_for_churn() is deprecated. Use analyze_customer_history_patterns() instead.")
        return self.analyze_customer_history_patterns(table_name, target_customer, timezone, currency)

    def _combine_results(self, schema_result: Dict[str, Any], history_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combine results from Schema Mapper and History Pattern Analysis agents

        Args:
            schema_result: Result from Schema Mapper Agent
            history_result: Result from History Pattern Analysis Agent

        Returns:
            Combined result in the expected format
        """
        try:
            # Start with the history analysis result as the base
            combined = history_result.copy()

            # Ensure column_mapping is from schema result (more authoritative)
            if 'column_mapping' in schema_result:
                combined['column_mapping'] = schema_result['column_mapping']

            # Add schema mapping summary if available
            if 'mapping_summary' in schema_result:
                combined['mapping_summary'] = schema_result['mapping_summary']

            # Merge statistical methodology from both agents
            combined_methodology = {}

            # Add schema methodology
            if 'statistical_methodology' in schema_result:
                combined_methodology.update(schema_result['statistical_methodology'])

            # Add/override with history analysis methodology
            if 'statistical_methodology' in history_result:
                history_methodology = history_result['statistical_methodology']
                for key, value in history_methodology.items():
                    if key in combined_methodology and isinstance(combined_methodology[key], dict) and isinstance(value, dict):
                        combined_methodology[key].update(value)
                    else:
                        combined_methodology[key] = value

            if combined_methodology:
                combined['statistical_methodology'] = combined_methodology

            # Ensure all expected sections are present
            self._ensure_complete_structure(combined)

            return combined

        except Exception as e:
            logger.error(f"Error combining results: {e}")
            # Return history result as fallback
            return history_result
    
    def _ensure_complete_structure(self, result: Dict[str, Any]) -> None:
        """
        Ensure the result has all expected sections

        Args:
            result: Result dictionary to validate and complete
        """
        # Ensure column_mapping exists
        if 'column_mapping' not in result:
            result['column_mapping'] = {
                "recency": [],
                "frequency": [],
                "monetary": [],
                "category_dependency": [],
                "lifecycle_stage": [],
                "unmapped": []
            }

        # Ensure features section exists
        if 'features' not in result:
            result['features'] = {
                "grouping_key_used": "none",
                "recency": {"days_since_last_purchase": {"value": None, "notes": "not computed"}},
                "frequency": {"order_count_3m": None, "order_count_prev3m": None},
                "monetary": {"sales_3m": None, "sales_prev3m": None, "sales_12m": None},
                "category_dependency": {"top_categories": [], "diversification_score": None},
                "lifecycle_stage": {"stage_inference": "unknown"}
            }

        # Ensure pattern_analysis exists
        if 'pattern_analysis' not in result:
            result['pattern_analysis'] = {
                "detailed_patterns": ["Analysis incomplete"],
                "positive_signals": [],
                "risk_indicators": [],
                "bucket_signals": {
                    "recency": {"signal_strength": "weak", "detail": "Not analyzed"},
                    "frequency": {"signal_strength": "weak", "detail": "Not analyzed"},
                    "monetary": {"signal_strength": "weak", "detail": "Not analyzed"},
                    "category_dependency": {"signal_strength": "weak", "detail": "Not analyzed"},
                    "lifecycle_stage": {"signal_strength": "weak", "detail": "Not analyzed"}
                }
            }
    
    # Expose individual agent methods for advanced usage
    def map_schema_only(self, table_name: str) -> Dict[str, Any]:
        """
        Perform only schema mapping (useful for schema analysis without history pattern analysis)

        Args:
            table_name: Name of the table to analyze

        Returns:
            Schema mapping result
        """
        return self.schema_mapper.map_table_schema(table_name)

    def analyze_history_patterns_only(self, table_name: str, column_mapping: Dict[str, Any],
                          target_customer: str = "10003", timezone: str = "America/Los_Angeles",
                          currency: str = "USD") -> Dict[str, Any]:
        """
        Perform only history pattern analysis with pre-mapped columns

        Args:
            table_name: Name of the table to analyze
            column_mapping: Pre-computed column mappings
            target_customer: Specific customer to analyze
            timezone: Timezone for date calculations
            currency: Currency for monetary normalization

        Returns:
            History pattern analysis result
        """
        return self.history_analyzer.analyze_customer_history_patterns(
            table_name=table_name,
            column_mapping=column_mapping,
            target_customer=target_customer,
            timezone=timezone,
            currency=currency
        )


# For backward compatibility, create an alias
SchemaMapperAgent = SchemaChurnOrchestrator


if __name__ == "__main__":
    # Test the orchestrator
    import json

    orchestrator = SchemaChurnOrchestrator(provider='openai')
    result = orchestrator.analyze_customer_history_patterns('sales_data', target_customer='10003')
    print(json.dumps(result, indent=2))
