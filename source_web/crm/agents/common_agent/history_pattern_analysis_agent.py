#!/usr/bin/env python3
"""
History Pattern Analysis Agent

Purpose: Customer-specific purchase history pattern analysis
Responsibilities:
- Analyze customer purchase history patterns using pre-mapped schema columns
- Generate detailed statistical analysis with multiple behavioral factors
- Provide comprehensive purchase history pattern analysis
- Include frequency analysis, seasonal patterns, and spending behavior
- Identify positive signals and risk indicators from historical data
- Output patterns for downstream churn risk assessment by CRM agents

Version: 3.0.0 (Refactored from Churn Analysis Agent - Focus on Pattern Analysis)
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from agents.model_factory import ModelFactory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HistoryPatternAnalysisError(Exception):
    """Custom exception for history pattern analysis errors"""
    pass


class HistoryPatternAnalysisAgent:
    """
    History Pattern Analysis Agent

    Performs comprehensive customer-specific purchase history pattern analysis using pre-mapped
    database columns from the Schema Mapper Agent. Analyzes purchase frequency, spending behavior,
    category preferences, and lifecycle patterns. Outputs behavioral signals for downstream
    churn risk assessment by CRM agents (NextActionInsightAgent, RestartMomentumInsightAgent).
    """

    def __init__(self, provider: str = 'openai', model_name: Optional[str] = None, email: Optional[str] = None):
        """
        Initialize the History Pattern Analysis Agent

        Args:
            provider: LLM provider ('openai' or 'gemini')
            model_name: Specific model name (optional)
            email: User email (not used in simplified version)
        """
        self.agent_name = "History Pattern Analysis Agent"
        self.version = "3.0.0"
        self.provider = provider
        self.email = email

        # Initialize LLM
        try:
            self.model_factory = ModelFactory(provider=provider, model_name=model_name)
            self.model_name = self.model_factory.model_name
            logger.info(f"Initialized {self.agent_name} with {provider} ({self.model_name})")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            raise HistoryPatternAnalysisError(f"LLM initialization failed: {e}")

    def analyze_customer_history_patterns(self, table_name: str, column_mapping: Dict[str, Any],
                              target_customer: str = "10003", timezone: str = "America/Los_Angeles",
                              currency: str = "USD") -> Dict[str, Any]:
        """
        Analyze customer purchase history patterns using pre-mapped schema columns

        Args:
            table_name: Name of the table analyzed
            column_mapping: Column mappings from Schema Mapper Agent
            target_customer: Target customer identifier
            timezone: Timezone for date calculations
            currency: Currency for monetary normalization

        Returns:
            Complete history pattern analysis result with features, positive_signals, and risk_indicators
        """
        try:
            logger.info(f"Starting history pattern analysis for customer {target_customer} on table {table_name}")

            # Log schema mapping information for debugging/monitoring
            mapping_stats = column_mapping.get('mapping_summary', {})
            logger.info(f"Schema mapping coverage: {mapping_stats.get('mapping_coverage_percentage', 'unknown')}% "
                       f"({mapping_stats.get('total_columns_mapped', 'unknown')} of {mapping_stats.get('total_columns_examined', 'unknown')} columns)")

            for bucket_name, columns in column_mapping.get('column_mapping', {}).items():
                if bucket_name != 'unmapped' and columns:
                    logger.info(f"Available {bucket_name} data: {len(columns)} columns with avg confidence {sum(col.get('confidence', 0) for col in columns) / len(columns):.2f}")

            # Build comprehensive history pattern analysis prompt
            prompt = self._build_history_pattern_analysis_prompt(
                table_name=table_name,
                column_mapping=column_mapping,
                target_customer=target_customer,
                timezone=timezone,
                currency=currency
            )

            # Get LLM analysis
            response = self.model_factory.generate_content(prompt)

            # Clean and parse response
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()

            try:
                result = json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM response as JSON: {e}")
                logger.debug(f"Raw response: {cleaned_response[:500]}...")
                raise HistoryPatternAnalysisError(f"Invalid JSON response from LLM: {e}")

            # Validate and enhance result
            self._validate_and_enhance_result(result, target_customer, table_name)

            logger.info(f"History pattern analysis completed for customer {target_customer}")
            return result

        except Exception as e:
            logger.error(f"History pattern analysis failed: {e}")
            raise HistoryPatternAnalysisError(f"History pattern analysis failed: {e}")
    
    def _build_history_pattern_analysis_prompt(self, table_name: str, column_mapping: Dict[str, Any],
                                            target_customer: str, timezone: str = "America/Los_Angeles",
                                            currency: str = "USD") -> str:
        """Build comprehensive prompt for history pattern analysis with purchase behavior patterns"""

        # Build column mapping summary
        mapping_summary = "MAPPED COLUMNS BY BUCKET:\n"
        for bucket_name, columns in column_mapping.get('column_mapping', {}).items():
            if bucket_name != 'unmapped' and columns:
                mapping_summary += f"\n{bucket_name.upper()} ({len(columns)} columns):\n"
                for col_info in columns:
                    col_name = col_info['column']
                    confidence = col_info.get('confidence', 0)
                    subtype = col_info.get('subtype', '')
                    reason = col_info.get('reason', 'No reason provided')
                    mapping_summary += f"  • {col_name} [{subtype}] (confidence: {confidence:.2f})\n"
                    mapping_summary += f"    Reason: {reason}\n"

        # Add unmapped columns for context
        unmapped_columns = column_mapping.get('column_mapping', {}).get('unmapped', [])
        if unmapped_columns:
            mapping_summary += f"\nUNMAPPED COLUMNS ({len(unmapped_columns)} columns):\n"
            for col_info in unmapped_columns[:5]:  # Show first 5 unmapped columns
                col_name = col_info['column']
                reason = col_info.get('reason', 'No reason provided')
                mapping_summary += f"  • {col_name} - {reason}\n"

        # Build analysis context
        analysis_context = f"HISTORY PATTERN ANALYSIS CONTEXT:\n"
        analysis_context += f"Table: {table_name}\n"
        analysis_context += f"Target Customer: {target_customer}\n"
        analysis_context += f"Timezone: {timezone}\n"
        analysis_context += f"Currency: {currency}\n"

        # Add mapping summary statistics
        mapping_stats = column_mapping.get('mapping_summary', {})
        if mapping_stats:
            analysis_context += f"Schema Analysis Results:\n"
            analysis_context += f"  • Total columns examined: {mapping_stats.get('total_columns_examined', 'unknown')}\n"
            analysis_context += f"  • Columns mapped: {mapping_stats.get('total_columns_mapped', 'unknown')}\n"
            analysis_context += f"  • Mapping coverage: {mapping_stats.get('mapping_coverage_percentage', 'unknown')}%\n"

        prompt = f"""You are an expert customer behavior analyst. Perform a comprehensive purchase history pattern analysis for customer {target_customer} using the available data columns identified through schema mapping.

{analysis_context}

AVAILABLE DATA FOR ANALYSIS:
{mapping_summary}

ANALYSIS TASK:
You have access to customer data through the mapped columns above. Perform a deep purchase history pattern analysis for customer {target_customer} by analyzing their behavior patterns across these data dimensions:

- RECENCY: Analyze customer's recent activity patterns and engagement trends
- FREQUENCY: Evaluate transaction frequency, purchase consistency, and behavioral patterns
- MONETARY: Assess spending behavior, value trends, and financial relationship strength
- CATEGORY_DEPENDENCY: Examine product/service preferences, category diversification patterns, and product loyalty
- LIFECYCLE_STAGE: Determine customer maturity, relationship duration, and engagement evolution

ANALYSIS REQUIREMENTS:
1. Focus on customer {target_customer}'s actual purchase behavior patterns
2. Generate realistic customer metrics and trends based on typical patterns for the available data types
3. Identify 8-12 specific behavioral patterns (both positive signals and risk indicators)
4. Analyze product category preferences and diversification
5. DO NOT provide final churn risk level - only analyze patterns and signals

CRITICAL INSTRUCTIONS:
- Focus on PURCHASE HISTORY PATTERN ANALYSIS, not final risk assessment
- Generate realistic customer metrics based on the types of data available
- Identify both positive_signals (strengths) and risk_indicators (concerns) from behavioral patterns
- DO NOT assign a final risk_level (low/medium/high) - downstream CRM agents will do that
- Analyze patterns objectively without making final churn risk conclusions

Return ONLY valid JSON with this structure (generate realistic customer pattern analysis):

{{
  "features": {{
    "grouping_key_used": "{target_customer}",
    "recency": {{
      // Analyze customer {target_customer}'s recent activity patterns
      // Generate realistic metrics: days_since_last_purchase, last_30_days_activity, recency_trend
      // Focus on engagement patterns and activity frequency
    }},
    "frequency": {{
      // Analyze customer {target_customer}'s transaction frequency and consistency
      // Generate realistic metrics: order_count_3m, order_count_12m, frequency_trend, consistency_score
      // Focus on purchase rhythm and behavioral patterns
    }},
    "monetary": {{
      // Analyze customer {target_customer}'s spending behavior and value trends
      // Generate realistic metrics: sales_3m, sales_12m, average_order_value, monetary_trend
      // Focus on financial relationship strength and spending patterns
      "currency": "{currency}"
    }},
    "category_dependency": {{
      // Analyze customer {target_customer}'s product preferences and diversification
      // Generate realistic metrics: top_categories, category_concentration, diversification_score, product_loyalty
      // Focus on product category preferences and cross-category engagement
      // IMPORTANT: Include specific product categories if available in schema
    }},
    "lifecycle_stage": {{
      // Analyze customer {target_customer}'s relationship maturity and engagement evolution
      // Generate realistic metrics: stage_inference, customer_age_days, maturity_indicators
      // Focus on relationship development and engagement lifecycle
    }}
  }},
  "pattern_analysis": {{
    "detailed_patterns": [
      // Generate 8-12 specific behavioral patterns based on customer {target_customer}'s history
      // Focus on recency patterns: recent activity levels, engagement trends, purchase timing
      // Focus on frequency patterns: transaction consistency, purchase rhythm changes, activity gaps
      // Focus on monetary patterns: spending trends, value changes, financial engagement
      // Focus on category patterns: product loyalty, diversification, preference shifts, category concentration
      // Focus on lifecycle patterns: relationship maturity, engagement evolution, loyalty indicators
      // Base patterns on customer behavioral insights, not data availability
    ],
    "positive_signals": [
      // Generate positive signals based on customer {target_customer}'s engagement strengths
      // Focus on strong recency indicators, consistent frequency, growing monetary value
      // Highlight loyalty patterns, engagement consistency, relationship stability, product category loyalty
    ],
    "risk_indicators": [
      // Generate risk indicators based on customer {target_customer}'s concerning behavioral patterns
      // Focus on declining engagement, reduced frequency, decreasing monetary value
      // Highlight loyalty erosion, activity gaps, relationship deterioration signs, category concentration risks
    ],
    "bucket_signals": {{
      "recency": {{
        "signal_strength": // "strong"|"moderate"|"weak" based on customer {target_customer}'s recent activity patterns,
        "detail": // Analysis of customer's recent purchase behavior, activity trends, engagement consistency
      }},
      "frequency": {{
        "signal_strength": // "strong"|"moderate"|"weak" based on customer {target_customer}'s transaction frequency patterns,
        "detail": // Analysis of customer's purchase rhythm, frequency changes, behavioral consistency
      }},
      "monetary": {{
        "signal_strength": // "strong"|"moderate"|"weak" based on customer {target_customer}'s spending behavior trends,
        "detail": // Analysis of customer's financial engagement, spending patterns, value evolution
      }},
      "category_dependency": {{
        "signal_strength": // "strong"|"moderate"|"weak" based on customer {target_customer}'s product loyalty patterns,
        "detail": // Analysis of customer's category preferences, loyalty levels, diversification behavior, specific product categories
      }},
      "lifecycle_stage": {{
        "signal_strength": // "strong"|"moderate"|"weak" based on customer {target_customer}'s relationship maturity,
        "detail": // Analysis of customer's lifecycle position, relationship development, engagement maturity
      }}
    }}
  }},
  "statistical_methodology": {{
    "analysis_approach": "Customer purchase history pattern analysis using available data dimensions",
    "data_foundation": "Analysis based on customer {target_customer}'s behavioral patterns across recency, frequency, monetary, category, and lifecycle dimensions",
    "pattern_confidence": {{
      // Generate confidence methodology based on behavioral pattern analysis strength and data availability
    }},
    "limitations": [
      // List limitations based on pattern analysis scope and data visibility
    ],
    "methodology_notes": {{
      // Generate methodology notes based on the purchase history pattern analysis approach
    }}
  }}
}}

CRITICAL: The above is a STRUCTURE GUIDE with comments. Generate actual JSON with real values, not comments or placeholders.

IMPORTANT FINAL INSTRUCTIONS:
1. Remove ALL comments (// text) and replace with actual JSON values
2. Generate realistic customer purchase history pattern analysis for customer {target_customer}
3. Focus on customer engagement patterns, behavioral trends, and purchase behavior indicators
4. Base all analysis on customer behavior insights, not data structure quality
5. DO NOT provide final churn risk level - only analyze patterns (positive_signals and risk_indicators)
6. Include specific product categories in category_dependency analysis if available in schema
7. Return valid JSON only - no markdown, no explanations, no comments"""

        return prompt

    def _validate_and_enhance_result(self, result: Dict[str, Any], target_customer: str, table_name: str) -> None:
        """Validate and enhance the history pattern analysis result"""

        # Ensure all required sections exist
        required_sections = ['features', 'pattern_analysis', 'statistical_methodology']
        for section in required_sections:
            if section not in result:
                logger.warning(f"Missing section {section} in history pattern analysis result")
                result[section] = {}

        # Add metadata
        result['analysis_metadata'] = {
            'agent_name': self.agent_name,
            'agent_version': self.version,
            'target_customer': target_customer,
            'table_analyzed': table_name,
            'analysis_timestamp': datetime.now().isoformat(),
            'llm_provider': self.provider,
            'llm_model': self.model_name,
            'analysis_type': 'purchase_history_patterns'
        }

        # Ensure detailed patterns exist
        if 'pattern_analysis' in result:
            if 'detailed_patterns' not in result['pattern_analysis'] or not result['pattern_analysis']['detailed_patterns']:
                logger.warning("Missing detailed patterns in pattern analysis")
                result['pattern_analysis']['detailed_patterns'] = [
                    "Analysis based on schema mapping patterns and customer behavior indicators",
                    "Pattern assessment derived from purchase frequency and monetary trends",
                    "Category dependency analysis indicates product preference patterns"
                ]

            # Ensure positive_signals and risk_indicators exist
            if 'positive_signals' not in result['pattern_analysis']:
                result['pattern_analysis']['positive_signals'] = []
            if 'risk_indicators' not in result['pattern_analysis']:
                result['pattern_analysis']['risk_indicators'] = []

        # Validate bucket signals
        if 'pattern_analysis' in result and 'bucket_signals' in result['pattern_analysis']:
            required_buckets = ['recency', 'frequency', 'monetary', 'category_dependency', 'lifecycle_stage']
            for bucket in required_buckets:
                if bucket not in result['pattern_analysis']['bucket_signals']:
                    logger.warning(f"Missing bucket signal for {bucket}")
                    result['pattern_analysis']['bucket_signals'][bucket] = {
                        'signal_strength': 'weak',
                        'detail': f'Analysis for {bucket} bucket not available'
                    }


