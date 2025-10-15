"""
Restart Momentum Insight Agent - AI-Powered Client Re-engagement Analysis

A specialized AI agent that helps employees restart momentum with inactive clients by analyzing
why clients may have become inactive and generating actionable insights to re-engage them.
This agent focuses on clients with no interactions in the last 30 days who have active deals,
providing strategic recommendations to restart productive relationships.

Business Rule Implementation:
- Automatically selected for customers with NO interactions in the last 30 days AND at least one active deal
- Active deals are those with status NOT IN ('Closed-Lost', 'Closed-Won')
- Prioritized over other agents when these conditions are met

This agent is designed for client re-engagement analysis with strict JSON output format,
providing concise insights that focus on relationship recovery and actionable re-engagement strategies.

Key Features:
1. Inactive client analysis with root cause assessment (30-day window)
2. Historical interaction pattern analysis for context
3. Email and note integration for comprehensive client understanding
4. Strategic re-engagement recommendations with specific talking points
5. Multi-provider AI support (Gemini, OpenAI)

Core Analysis Capabilities:
- Inactive client profiling based on historical engagement patterns
- Root cause analysis for client inactivity using LLM reasoning
- Email communication pattern analysis for relationship context
- Note analysis for understanding client concerns and interests
- Personalized re-engagement strategies and conversation starters
- Actionable recommendations for relationship recovery

Output Format:
Returns exactly one JSON object with Activities, Insights, Next Move, Last Interaction, and Important Notes sections.

Data Integration Strategy:
- PRIMARY: email_agent and note_agent outputs for recent communication context
- SECONDARY: deals.csv and clients_info.csv for client background and value assessment
- SUPPORTING: Historical interaction patterns for engagement analysis

Supported Providers:
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- OpenAI (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
"""
import logging

import os
import json
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv
from datetime import datetime, timedelta
from agents.common_agent.email_agent import EmailAgent
from agents.common_agent.note_agent import NoteAgent
from agents.common_agent.schema_churn_orchestrator import SchemaChurnOrchestrator
from agents.model_factory import ModelFactory
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()


class RestartMomentumInsightAgent:
    """
    AI-powered Restart Momentum Insight Agent

    This agent analyzes inactive clients (>30 days since last interaction with active deals) to understand
    why they became inactive and provides strategic insights and actionable recommendations
    to restart momentum and re-engage the client relationship.

    Business Rule: Automatically selected for customers with no interactions in 30 days AND active deals.
    Returns structured JSON output with Activities, Insights, Next Move, Last Interaction, and Important Notes sections.
    """

    def __init__(self,
                 provider: str = "openai",
                 model_name: str = None,
                 google_api_key: str = None,
                 openai_api_key: str = None):
        """
        Initialize the Restart Momentum Insight Agent with multi-provider support

        Args:
            provider: AI provider to use ("gemini" or "openai")
            model_name: Specific model to use (if None, uses defaults)
            google_api_key: Google AI API key (if not provided, uses environment variable)
            openai_api_key: OpenAI API key (if not provided, uses environment variable)
        """
        # Initialize model factory
        self.model_factory = ModelFactory.create_for_agent(
            agent_name="Restart Momentum Insight Agent",
            provider=provider,
            model_name=model_name,
            google_api_key=google_api_key,
            openai_api_key=openai_api_key
        )

        # Get model info for backward compatibility
        model_info = self.model_factory.get_model_info()
        self.provider = model_info.provider
        self.model_name = model_info.model_name
        self.client = model_info.client  # For OpenAI
        self.model = model_info.model    # For Gemini

        # Initialize email, note, and churn agents for integration
        self.email_agent = EmailAgent(provider=provider, model_name=model_name,
                                    google_api_key=google_api_key, openai_api_key=openai_api_key)
        self.note_agent = NoteAgent(provider=provider, model_name=model_name,
                                  google_api_key=google_api_key, openai_api_key=openai_api_key)
        self.churn_orchestrator = SchemaChurnOrchestrator(provider=provider, model_name=model_name)



    def _generate_content(self, prompt: str, system_message: str = None) -> str:
        """
        Generate content using the selected provider with enhanced error handling

        Args:
            prompt: The user prompt
            system_message: Optional system message for better context
        """
        if system_message is None:
            system_message = "You are a senior client relationship manager and re-engagement specialist. You provide structured JSON responses with specific insights and actionable recommendations for restarting momentum with inactive clients. Each insight must contain exactly three sentences. Focus on inactivity pattern analysis, communication content evaluation for root cause identification, and comprehensive re-engagement strategies with integrated reasoning."

        return self.model_factory.generate_content(prompt, system_message)

    def _determine_activities_status(self, client_history: Dict[str, Any]) -> str:
        """
        Determine Activities status based on interaction history
        For RestartMomentumInsightAgent, this should typically be 'inactive' since we focus on inactive clients
        Updated to use 30-day window per business rule requirements

        Returns:
            "inactive" for clients with interactions >30 days old
            "churned" if no interactions exist
            "active" if somehow recent interactions exist (edge case)
        """
        from datetime import datetime, timedelta

        interactions = client_history.get("interaction_details", [])

        if not interactions:
            return "churned"

        # Find most recent interaction
        most_recent = None
        for interaction in interactions:
            created_at = interaction.get('created_at')
            if created_at:
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        continue
                elif hasattr(created_at, 'date'):
                    # It's already a datetime object
                    pass
                else:
                    continue

                if most_recent is None or created_at > most_recent:
                    most_recent = created_at

        if most_recent is None:
            return "decline"

        # Check if within 30 days (updated from 7 days per business rule)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        if most_recent >= thirty_days_ago:
            return "active"  # Edge case - shouldn't happen for this agent's intended use
        else:
            return "inactive"

    def format_client_data_for_analysis(self, client_history: Dict[str, Any]) -> str:
        """
        Format client history data focusing on inactivity analysis and re-engagement context

        Args:
            client_history: Complete client history data structure

        Returns:
            Formatted string optimized for restart momentum analysis
        """
        if not client_history:
            return "No client history data available for analysis."

        # Extract key information
        client_info = client_history.get("client_info", {})
        client_details = client_history.get("client_details", {})
        deals = client_history.get("deals", [])
        interactions = client_history.get("interaction_details", [])
        notes = client_history.get("employee_client_notes", [])
        metrics = client_history.get("summary_metrics", {})

        # Calculate inactivity metrics
        total_interactions = len(interactions)
        last_interaction_date = "N/A"
        days_since_last_interaction = 0

        if interactions:
            # Sort interactions by date to find the most recent
            sorted_interactions = sorted(interactions, key=lambda x: x.get('created_at', ''), reverse=True)
            last_interaction = sorted_interactions[0]
            last_interaction_date = last_interaction.get('created_at', 'N/A')

            # Calculate days since last interaction
            if last_interaction_date != 'N/A':
                try:
                    if isinstance(last_interaction_date, str):
                        last_dt = datetime.fromisoformat(last_interaction_date.replace('Z', '+00:00'))
                    else:
                        last_dt = last_interaction_date
                    days_since_last_interaction = (datetime.now() - last_dt).days
                except:
                    days_since_last_interaction = 0

        # Calculate deal metrics
        total_deals = len(deals)
        won_deals = [d for d in deals if d.get('stage') == 'Closed-Won']
        won_value = sum(d.get('value_usd', 0) for d in won_deals)

        # Get client value information with proper None handling
        contract_value = client_details.get('contract_value') if client_details else None
        contract_value = contract_value if contract_value is not None else 0
        satisfaction_score = client_details.get('satisfaction_score') if client_details else None
        satisfaction_score = satisfaction_score if satisfaction_score is not None else 0.0
        churn_risk = client_details.get('churn_risk', 'Unknown') if client_details else 'Unknown'

        # Determine activity status
        activities_status = self._determine_activities_status(client_history)

        # Calculate active deals (excluding Closed-Lost and Closed-Won)
        active_deals = [d for d in deals if d.get('stage') not in ['Closed-Lost', 'Closed-Won']]
        active_deal_value = sum(d.get('value_usd', 0) for d in active_deals)

        formatted_data = f"""
=== CLIENT RESTART MOMENTUM ANALYSIS (30-DAY BUSINESS RULE) ===
Company: {client_info.get('name', 'N/A')}
Activity Status: {activities_status}
Days Since Last Interaction: {days_since_last_interaction} days
Last Interaction Date: {last_interaction_date}
Total Historical Interactions: {total_interactions}

=== CLIENT VALUE ASSESSMENT ===
Contract Value: ${contract_value:,.2f}
Historical Won Deals: {len(won_deals)} (${won_value:,.2f} total value)
Active Deals: {len(active_deals)} (${active_deal_value:,.2f} total value)
Satisfaction Score: {satisfaction_score:.1f}/5.0
Churn Risk: {churn_risk}
Industry: {client_info.get('industry', 'N/A')}

=== INACTIVITY CONTEXT (30-DAY RULE) ===
Client Status: {client_info.get('status', 'N/A')}
Total Notes: {len(notes)}
Total Deals: {total_deals}
Active Deals (Non-Closed): {len(active_deals)}
Client Type: {client_info.get('client_type', 'N/A')}
Restart Momentum Trigger: No interactions in 30+ days with active deals

=== RECENT INTERACTION HISTORY ===
"""

        # Add recent interaction details (last 3 interactions)
        if interactions:
            recent_interactions = sorted(interactions, key=lambda x: x.get('created_at', ''), reverse=True)[:3]
            for i, interaction in enumerate(recent_interactions, 1):
                days_ago = 0
                try:
                    if isinstance(interaction.get('created_at'), str):
                        int_dt = datetime.fromisoformat(interaction.get('created_at', '').replace('Z', '+00:00'))
                    else:
                        int_dt = interaction.get('created_at')
                    days_ago = (datetime.now() - int_dt).days
                except:
                    pass

                formatted_data += f"Interaction {i} ({days_ago} days ago): {interaction.get('type', 'Unknown')} - {interaction.get('content', 'No content')[:100]}{'...' if len(interaction.get('content', '')) > 100 else ''}\n"
        else:
            formatted_data += "No interaction history available.\n"

        return formatted_data

    def generate_restart_momentum_insights(self,
                                         client_history: Dict[str, Any],
                                         employee_id: int = None) -> str:
        """
        Generate restart momentum insights with strict JSON output format

        This method integrates email_agent and note_agent outputs to provide comprehensive
        analysis of why a client became inactive and actionable recommendations to restart momentum.

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering communications

        Returns:
            JSON string with Activities, Insights, Next Move, Last Interaction, and Important Notes sections
        """
        # Get formatted data for analysis
        formatted_data = self.format_client_data_for_analysis(client_history)

        # Determine client_id for agent integration
        client_id = client_history.get("client_info", {}).get("client_id")
        if not client_id:
            return json.dumps({
                "error": "Client ID not found in client history data",
                "Activities": "churned",
                "Insights": [
                    "Inactivity Analysis: Unable to analyze client inactivity patterns and engagement indicators without valid client identification data. The system requires proper client ID to access historical communication records and evaluate engagement patterns. Data validation and client record verification are needed before proceeding with inactivity analysis.",
                    "Communication Content Analysis: Cannot examine email content and note content to identify root causes of client inactivity without access to client communication records. The system needs valid client identification to analyze communication gaps, unaddressed concerns, and relationship deterioration patterns. Client data integrity must be established for accurate content analysis.",
                    "Re-engagement Strategy: Unable to develop targeted re-engagement approaches without access to client historical engagement patterns and communication preferences data. The system requires valid client identification to analyze past successful engagement methods and customize reactivation strategies. Proper client data validation is essential for effective re-engagement planning."
                ],
                "Next Move": [
                    "Verify client data integrity and ensure proper client ID is available in the system, as this is essential for accessing historical interaction records and developing accurate re-engagement analysis based on client-specific patterns and preferences",
                    "Contact system administrator to resolve client data validation issues and ensure all required client identification fields are properly populated before attempting restart momentum analysis"
                ],
                "Last Interaction": "N/A - Client data validation required",
                "Important Notes": "Data validation required - cannot proceed without valid client ID"
            })

        # Get email analysis from email_agent
        email_analysis = {}
        try:
            interactions = client_history.get("interaction_details", [])
            if interactions:
                email_analysis = self.email_agent.analyze_email_communications(
                    interactions, client_id, analysis_focus="comprehensive", employee_id=employee_id
                )
        except Exception as e:
            email_analysis = {"error": f"Email analysis failed: {str(e)}"}

        # Get note analysis from note_agent
        note_analysis = {}
        try:
            notes = client_history.get("employee_client_notes", [])
            if notes:
                note_analysis = self.note_agent.analyze_client_notes(
                    notes, client_id, analysis_focus="comprehensive", employee_id=employee_id
                )
        except Exception as e:
            note_analysis = {"error": f"Note analysis failed: {str(e)}"}

        # Get churn analysis from churn_orchestrator - PRIORITY for RestartMomentumInsightAgent
        history_patterns = {}
        churn_start_time = datetime.now()

        try:
            logger.info(f"🔍 RestartMomentumInsightAgent [Customer {client_id}]: Starting history pattern analysis (HIGH PRIORITY for inactive clients)")

            # Use a default table name for history pattern analysis - this could be made configurable
            # The orchestrator will analyze the customer's purchase history patterns
            history_patterns = self.churn_orchestrator.analyze_customer_history_patterns(
                table_name="sales_data",  # Default table for client analysis
                target_customer=str(client_id)
            )

            churn_time = (datetime.now() - churn_start_time).total_seconds()
            logger.info(f"⏱️ RestartMomentumInsightAgent [Customer {client_id}]: History pattern analysis completed in {churn_time:.2f}s")
            logger.info(f"📊 RestartMomentumInsightAgent [Customer {client_id}]: History pattern analysis result keys: {list(history_patterns.keys()) if isinstance(history_patterns, dict) else 'Not a dict'}")

            # Enhanced logging for high-risk scenarios (will be determined by agent combining all data)
            if isinstance(history_patterns, dict) and history_patterns.get('pattern_analysis', {}).get('risk_indicators'):
                risk_count = len(history_patterns.get('pattern_analysis', {}).get('risk_indicators', []))
                logger.warning(f"⚠️ RestartMomentumInsightAgent [Customer {client_id}]: {risk_count} RISK INDICATORS DETECTED in history patterns")

        except Exception as e:
            churn_time = (datetime.now() - churn_start_time).total_seconds()
            logger.error(f"❌ RestartMomentumInsightAgent [Customer {client_id}]: History pattern analysis failed after {churn_time:.2f}s: {str(e)}")
            import traceback
            logger.error(f"🔍 RestartMomentumInsightAgent [Customer {client_id}]: History pattern analysis traceback: {traceback.format_exc()}")
            history_patterns = {"error": f"History pattern analysis failed: {str(e)}"}

        # Determine activities status
        activities_status = self._determine_activities_status(client_history)

        system_message = """You are a client re-engagement specialist who excels at analyzing inactive clients and providing actionable restart momentum strategies. You must return exactly one JSON object with the specified structure. Each insight must be exactly 3 sentences. Focus on data-driven inactivity analysis using history pattern risk indicators, communication content evaluation for root cause identification (prioritizing email/note insights), and targeted re-engagement strategies that directly address identified risk factors and client concerns. CRITICAL: You must assess churn_risk (low/medium/high) by combining emails, notes, current deals, and history sales patterns."""

        prompt = f"""Analyze this inactive client data and return exactly one JSON object with the following structure:

{formatted_data}

EMAIL AGENT ANALYSIS:
{json.dumps(email_analysis, indent=2) if email_analysis else "No email analysis available"}

NOTE AGENT ANALYSIS:
{json.dumps(note_analysis, indent=2) if note_analysis else "No note analysis available"}

HISTORY PATTERN ANALYSIS (HIGH PRIORITY for inactive clients):
{json.dumps(history_patterns, indent=2) if history_patterns else "No history pattern analysis available"}

OUTPUT CONTRACT (strict):
Return exactly one JSON object:
{{
  "Activities": "{activities_status}",
  "churn_risk": "[Assess as 'low', 'medium', or 'high' by combining: 1) Email insights (sentiment, engagement), 2) Note insights (concerns, issues), 3) Current deal status (active/stalled/none), 4) History pattern positive_signals and risk_indicators. For inactive clients, typically medium or high risk.]",
  "Insights": [
    "Inactivity Analysis: [1 sentence briefly summarizing interaction patterns and purchase behavior trends. 2 sentences specifically referencing ACTUAL METRICS from history pattern detailed_patterns and risk_indicators (e.g., exact days since last purchase, specific activity counts, actual order frequency, product diversity metrics) to explain the data-driven factors contributing to client inactivity - use real numbers from the analysis, do not invent metrics]",
    "Communication Content Analysis: [3 sentences examining email content and note content to identify specific client concerns, unaddressed issues, or communication gaps that contributed to inactivity - prioritize actual client concerns from emails/notes over generic pattern factors]",
    "Re-engagement Strategy: [3 sentences providing targeted strategies that directly address the specific risk factors identified in history pattern analysis and client concerns from communications, while explicitly incorporating positive_signals from pattern_analysis (e.g., history of high-value purchases, past promotional engagement, loyalty tenure, product category preferences) to leverage identified strengths and opportunities for successful re-engagement, with concrete actions that tackle root causes rather than generic re-engagement tactics]"
  ],
  "Next Move": [
    "[Primary re-engagement action that directly addresses the most critical client concerns from emails/notes OR the highest-priority risk factors from history pattern detailed_patterns, with specific timing and approach that tackles the root cause of inactivity]",
    "[Alternative re-engagement approach that addresses secondary concerns from communications or additional risk indicators from history pattern analysis, providing a backup strategy that complements the primary action]"
  ],
  "Last Interaction": "Summary of most recent interaction and its context",
  "Important Notes": "Key client concerns, preferences, or context for re-engagement"
}}

REQUIREMENTS:
1. Activities field is pre-determined as "{activities_status}" based on interaction timing
2. churn_risk field MUST be assessed as "low", "medium", or "high" by combining ALL data sources: emails, notes, deals, and history patterns (inactive clients typically medium or high)
3. Each insight must be exactly 3 sentences, approximately 300 characters per insight
4. Next Move items should integrate reasoning directly within action descriptions (no character limits)
5. Inactivity Analysis structure: 1st sentence = brief interaction/purchase summary, 2nd-3rd sentences = specific ACTUAL METRICS from detailed_patterns and risk_indicators (use real numbers like "45 days since last purchase", "only 1 activity in 30 days", "decreased from $100 to $75 order value", "limited to Electronics category") - never invent metrics
6. Communication Content Analysis must prioritize actual client concerns from emails/notes over history pattern data, but use history pattern analysis to provide supporting context for communication gaps
7. Re-engagement Strategy must directly address specific risk factors from history pattern detailed_patterns AND client concerns from communications, while explicitly incorporating positive_signals from pattern_analysis (e.g., "history of high-value purchases", "past promotional engagement", "loyalty tenure", "product category preferences") to leverage strengths

CHURN RISK ASSESSMENT GUIDELINES FOR INACTIVE CLIENTS:
- LOW: Rare for inactive clients - only if recent positive communication + active deals + strong positive signals in history patterns
- MEDIUM: Some risk indicators in history patterns + neutral/mixed communication + deals exist but stalled + moderate inactivity
- HIGH: Multiple risk indicators in history patterns + negative/no communication + no active deals + extended inactivity (30+ days)
8. Use email_agent and note_agent outputs as PRIMARY sources, with history_patterns providing supporting data-driven context (client concerns > pattern factors)
9. Reference specific elements from history pattern analysis: detailed_patterns (behavioral patterns), positive_signals (what to leverage), risk_indicators (what to address)
10. Last Interaction should summarize the most recent communication and connect it to risk factors if relevant
11. Important Notes should highlight key client concerns from communications AND critical risk factors from history pattern analysis that need immediate attention

ANALYSIS FOCUS:
- Inactivity Analysis Structure: 1st sentence = brief interaction/purchase summary, 2nd sentence = specific ACTUAL METRICS from detailed_patterns (e.g., "45 days since last purchase", "only 2 orders in 3 months", "decreased from $100 to $75 order value"), 3rd sentence = risk_indicators including product diversity limitations (e.g., "limited to Electronics category", "low consistency score of 0.25")
- Communication Content Analysis: Prioritize actual client concerns, unaddressed issues, or requests from emails/notes, then use history pattern risk_indicators as supporting evidence for communication gaps
- Re-engagement Strategy: Create targeted actions that address specific detailed_patterns from history pattern analysis AND client concerns from communications, while explicitly leveraging positive_signals (e.g., "history of high-value purchases", "past promotional engagement", "over one year loyalty", "product category preferences") for stronger re-engagement approaches
- Pattern Data Utilization: Extract EXACT METRICS from detailed_patterns (specific days inactive, actual frequency counts, real value decreases, product categories) and reference positive_signals for personalized re-engagement opportunities
- Root Cause Focus: Connect inactivity to specific factors - if emails show pricing concerns, address pricing; if patterns show frequency drops, address engagement; if notes show service issues, address service
- Action Specificity: Avoid generic "send follow-up email" - instead specify "address pricing concerns raised in last email" or "leverage your history of high-value purchases with exclusive offer" or "tackle 45-day purchase gap with targeted Electronics promotion"
- Positive Signal Leverage: Use client strengths from positive_signals to design compelling re-engagement messages (e.g., "You've been a loyal customer for over a year" or "Based on your previous high-value purchases in Electronics category")

HISTORY PATTERN INTEGRATION PRIORITY:
1. HIGHEST: Client concerns from emails/notes (actual problems they expressed)
2. HIGH: History pattern detailed_patterns (data-driven explanations for inactivity - sentences 2 of Inactivity Analysis)
3. MEDIUM: History pattern risk_indicators (warning signs to address - sentence 3 of Inactivity Analysis)
4. STRATEGIC: History pattern positive_signals (strengths and opportunities to leverage in Re-engagement Strategy)

METRIC ACCURACY REQUIREMENTS:
- Use ONLY actual numbers from history pattern detailed_patterns (never invent metrics like "80 days of inactivity")
- Reference specific product categories, order frequencies, and value changes from the analysis
- Include product diversity limitations as risk indicators (e.g., "limited to Electronics category")
- Leverage positive signals with specific examples (e.g., "history of purchasing high-value items", "engaged with promotional emails in the past", "customer for over a year")"""

        return self._generate_content(prompt, system_message)

    def generate_quick_insights(self, client_history: Dict[str, Any], employee_id: int = None) -> str:
        """
        Generate quick restart momentum insights with JSON format

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering

        Returns:
            JSON formatted restart momentum insights
        """
        return self.generate_restart_momentum_insights(client_history, employee_id)

    def analyze_client_inactivity(self, client_history: Dict[str, Any], employee_id: int = None) -> str:
        """
        Analyze client inactivity patterns with JSON format (same as generate_restart_momentum_insights)

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering

        Returns:
            JSON formatted inactivity analysis
        """
        return self.generate_restart_momentum_insights(client_history, employee_id)

    def generate_reengagement_strategy(self, client_history: Dict[str, Any], employee_id: int = None) -> str:
        """
        Generate re-engagement strategy with JSON format (same as generate_restart_momentum_insights)

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering

        Returns:
            JSON formatted re-engagement strategy
        """
        return self.generate_restart_momentum_insights(client_history, employee_id)