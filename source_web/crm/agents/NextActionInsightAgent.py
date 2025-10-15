"""
Next Action Insight Agent - Enhanced AI-Powered Active Client Engagement Analysis

A specialized AI agent that helps employees determine the best next actions for active clients
by analyzing recent interactions and notes from the past week. This agent focuses on clients
with interactions within the last 7 days and provides strategic recommendations with clear
data-driven reasoning to maintain momentum and drive productive engagement forward.

This agent is designed for active client engagement analysis with strict JSON output format,
providing concise insights that focus on maintaining momentum and optimizing next steps with
well-reasoned recommendations.

Enhanced Key Features:
1. Active client analysis with recent interaction focus
2. Recent communication pattern analysis (past 7 days)
3. Email and note integration for comprehensive current context
4. Strategic next action recommendations with clear data-driven reasoning
5. Streamlined output focusing on essential insights and actions
6. Multi-provider AI support (Gemini, OpenAI)

Core Analysis Capabilities:
- Active client profiling based on recent engagement patterns
- Recent interaction analysis for momentum assessment
- Email communication analysis for current relationship context
- Note analysis for understanding immediate client needs and priorities
- Next action prioritization with reasoning based on data analysis
- Actionable recommendations with clear explanations connecting back to client insights

Enhanced Output Format:
Returns exactly one JSON object with Activities, Insights, and Next Move sections.
Each Next Move recommendation includes clear reasoning that connects back to the data analysis.

Data Integration Strategy:
- PRIMARY: email_agent and note_agent outputs for recent communication context (past 7 days)
- SECONDARY: deals.csv and clients_info.csv for client background and opportunity assessment
- SUPPORTING: Recent interaction patterns for momentum analysis

Supported Providers:
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- OpenAI (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
"""

import os
import json
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv
from datetime import datetime, timedelta
from agents.common_agent.email_agent import EmailAgent
from agents.common_agent.note_agent import NoteAgent
from agents.common_agent.schema_churn_orchestrator import SchemaChurnOrchestrator
from agents.model_factory import ModelFactory

# Load environment variables from .env file
load_dotenv()


class NextActionInsightAgent:
    """
    AI-powered Next Action Insight Agent

    This agent analyzes active clients (interactions within last 7 days) to understand
    current momentum and provides strategic insights and actionable recommendations
    for the next best actions to maintain and accelerate client engagement.
    Returns structured JSON output with Activities, Insights, and Next Move sections.
    """

    def __init__(self,
                 provider: str = "openai",
                 model_name: str = None,
                 google_api_key: str = None,
                 openai_api_key: str = None):
        """
        Initialize the Next Action Insight Agent with multi-provider support

        Args:
            provider: AI provider to use ("gemini" or "openai")
            model_name: Specific model to use (if None, uses defaults)
            google_api_key: Google AI API key (if not provided, uses environment variable)
            openai_api_key: OpenAI API key (if not provided, uses environment variable)
        """
        # Initialize model factory
        self.model_factory = ModelFactory.create_for_agent(
            agent_name="Next Action Insight Agent",
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

        # Initialize email and note agents for integration
        import logging
        self.logger = logging.getLogger(__name__)

        self.logger.info(f"🔧 NextActionInsightAgent: Initializing email and note agents with provider={provider}, model={model_name}")

        try:
            self.email_agent = EmailAgent(provider=provider, model_name=model_name,
                                        google_api_key=google_api_key, openai_api_key=openai_api_key)
            self.logger.info(f"✅ NextActionInsightAgent: EmailAgent initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ NextActionInsightAgent: EmailAgent initialization failed: {e}")
            raise

        try:
            self.note_agent = NoteAgent(provider=provider, model_name=model_name,
                                      google_api_key=google_api_key, openai_api_key=openai_api_key)
            self.logger.info(f"✅ NextActionInsightAgent: NoteAgent initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ NextActionInsightAgent: NoteAgent initialization failed: {e}")
            raise

        try:
            self.churn_orchestrator = SchemaChurnOrchestrator(provider=provider, model_name=model_name)
            self.logger.info(f"✅ NextActionInsightAgent: ChurnOrchestrator initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ NextActionInsightAgent: ChurnOrchestrator initialization failed: {e}")
            raise



    def _generate_content(self, prompt: str, system_message: str = None) -> str:
        """
        Generate content using the selected provider with enhanced error handling

        Args:
            prompt: The user prompt
            system_message: Optional system message for better context
        """
        if system_message is None:
            system_message = "You are a senior client success manager and engagement strategist. You provide structured JSON responses with specific insights and actionable recommendations with clear data-driven reasoning for maintaining momentum with active clients. Each insight must contain exactly three sentences. Focus on next best actions and strategic engagement optimization with reasoning that connects back to client data analysis."

        return self.model_factory.generate_content(prompt, system_message)

    def _determine_activities_status(self, client_history: Dict[str, Any]) -> str:
        """
        Determine Activities status based on interaction history
        For NextActionInsightAgent, this should typically be 'active' since we focus on active clients

        Updated to use 14-day window to match the agent selection criteria.

        Returns:
            "active" for clients with interactions within last 14 days
            "inactive" for clients with interactions >14 days old
            "churned" if no interactions exist
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

        # Check if within 14 days (matching agent selection criteria)
        fourteen_days_ago = datetime.now() - timedelta(days=14)
        if most_recent >= fourteen_days_ago:
            return "active"
        else:
            return "inactive"  # Edge case - shouldn't happen for this agent's intended use

    def format_client_data_for_analysis(self, client_history: Dict[str, Any]) -> str:
        """
        Format client history data focusing on recent activity and next action context

        Args:
            client_history: Complete client history data structure

        Returns:
            Formatted string optimized for next action analysis
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

        # Calculate recent activity metrics (focus on last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_interactions = []
        recent_notes = []

        for interaction in interactions:
            try:
                created_at = interaction.get('created_at')
                if isinstance(created_at, str):
                    int_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    int_dt = created_at
                if int_dt >= seven_days_ago:
                    recent_interactions.append(interaction)
            except:
                continue

        for note in notes:
            try:
                created_at = note.get('created_at')
                if isinstance(created_at, str):
                    note_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    note_dt = created_at
                if note_dt >= seven_days_ago:
                    recent_notes.append(note)
            except:
                continue

        # Calculate deal metrics
        active_deals = [d for d in deals if d.get('stage') not in ['Closed-Won', 'Closed-Lost']]
        won_deals = [d for d in deals if d.get('stage') == 'Closed-Won']
        total_deal_value = sum(d.get('value_usd', 0) for d in active_deals)

        # Get client value information with proper None handling
        contract_value = client_details.get('contract_value') if client_details else None
        contract_value = contract_value if contract_value is not None else 0
        satisfaction_score = client_details.get('satisfaction_score') if client_details else None
        satisfaction_score = satisfaction_score if satisfaction_score is not None else 0.0
        expansion_potential = client_details.get('expansion_potential', 'Unknown') if client_details else 'Unknown'

        # Determine activity status
        activities_status = self._determine_activities_status(client_history)

        formatted_data = f"""
=== CLIENT NEXT ACTION ANALYSIS ===
Company: {client_info.get('name', 'N/A')}
Activity Status: {activities_status}
Recent Interactions (Last 7 Days): {len(recent_interactions)}
Recent Notes (Last 7 Days): {len(recent_notes)}
Total Historical Interactions: {len(interactions)}

=== CLIENT OPPORTUNITY ASSESSMENT ===
Contract Value: ${contract_value:,.2f}
Active Deal Pipeline: {len(active_deals)} deals (${total_deal_value:,.2f} total value)
Historical Won Deals: {len(won_deals)}
Satisfaction Score: {satisfaction_score:.1f}/5.0
Expansion Potential: {expansion_potential}
Industry: {client_info.get('industry', 'N/A')}

=== CURRENT MOMENTUM CONTEXT ===
Client Status: {client_info.get('status', 'N/A')}
Client Type: {client_info.get('client_type', 'N/A')}
Total Notes: {len(notes)}
Total Deals: {len(deals)}

=== RECENT ACTIVITY DETAILS (LAST 7 DAYS) ===
"""

        # Add recent interaction details
        if recent_interactions:
            sorted_recent = sorted(recent_interactions, key=lambda x: x.get('created_at', ''), reverse=True)
            for i, interaction in enumerate(sorted_recent[:5], 1):  # Show up to 5 most recent
                hours_ago = 0
                try:
                    if isinstance(interaction.get('created_at'), str):
                        int_dt = datetime.fromisoformat(interaction.get('created_at', '').replace('Z', '+00:00'))
                    else:
                        int_dt = interaction.get('created_at')
                    hours_ago = int((datetime.now() - int_dt).total_seconds() / 3600)
                except:
                    pass

                formatted_data += f"Recent Interaction {i} ({hours_ago}h ago): {interaction.get('type', 'Unknown')} - {interaction.get('content', 'No content')[:120]}{'...' if len(interaction.get('content', '')) > 120 else ''}\n"
        else:
            formatted_data += "No recent interactions in the last 7 days.\n"

        # Add recent notes
        if recent_notes:
            formatted_data += "\n=== RECENT NOTES (LAST 7 DAYS) ===\n"
            sorted_notes = sorted(recent_notes, key=lambda x: x.get('created_at', ''), reverse=True)
            for i, note in enumerate(sorted_notes[:3], 1):  # Show up to 3 most recent notes
                hours_ago = 0
                try:
                    if isinstance(note.get('created_at'), str):
                        note_dt = datetime.fromisoformat(note.get('created_at', '').replace('Z', '+00:00'))
                    else:
                        note_dt = note.get('created_at')
                    hours_ago = int((datetime.now() - note_dt).total_seconds() / 3600)
                except:
                    pass

                formatted_data += f"Recent Note {i} ({hours_ago}h ago): {note.get('title', 'Untitled')} - {note.get('body', 'No content')[:100]}{'...' if len(note.get('body', '')) > 100 else ''}\n"

        return formatted_data

    def generate_next_action_insights(self,
                                    client_history: Dict[str, Any],
                                    employee_id: int = None) -> str:
        """
        Generate next action insights with strict JSON output format

        This method integrates email_agent and note_agent outputs to provide comprehensive
        analysis of current client momentum and actionable recommendations for next best actions.

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering communications

        Returns:
            JSON string with Activities, Insights, and Next Move sections
        """
        # Get formatted data for analysis
        formatted_data = self.format_client_data_for_analysis(client_history)

        # Determine client_id for agent integration
        client_id = client_history.get("client_info", {}).get("client_id")
        if not client_id:
            return json.dumps({
                "error": "Client ID not found in client history data",
                "Activities": "decline",
                "Insights": ["Unable to analyze client without valid client ID"],
                "Next Move": ["Verify client data and try again"]
            })

        # Get email analysis from email_agent
        email_analysis = {}
        start_time = datetime.now()

        try:
            interactions = client_history.get("interaction_details", [])

            if interactions:
                self.logger.info(f"📞 NextActionInsightAgent [Customer {client_id}]: Calling email_agent.analyze_email_communications with {len(interactions)} interactions")
                email_analysis = self.email_agent.analyze_email_communications(
                    interactions, client_id, analysis_focus="comprehensive", employee_id=employee_id
                )

                email_time = (datetime.now() - start_time).total_seconds()
                self.logger.info(f"⏱️ NextActionInsightAgent [Customer {client_id}]: Email analysis completed in {email_time:.2f}s")
                self.logger.info(f"📊 NextActionInsightAgent [Customer {client_id}]: Email analysis result keys: {list(email_analysis.keys()) if isinstance(email_analysis, dict) else 'Not a dict'}")
            else:
                self.logger.warning(f"⚠️ NextActionInsightAgent [Customer {client_id}]: No interactions found, skipping email analysis")

        except Exception as e:
            email_time = (datetime.now() - start_time).total_seconds()
            self.logger.error(f"❌ NextActionInsightAgent [Customer {client_id}]: Email analysis failed after {email_time:.2f}s: {str(e)}")
            import traceback
            self.logger.error(f"🔍 NextActionInsightAgent [Customer {client_id}]: Email analysis traceback: {traceback.format_exc()}")
            email_analysis = {"error": f"Email analysis failed: {str(e)}"}

        # Get note analysis from note_agent
        note_analysis = {}
        note_start_time = datetime.now()

        try:
            notes = client_history.get("employee_client_notes", [])
            self.logger.info(f"🔍 NextActionInsightAgent [Customer {client_id}]: Starting note analysis")
            self.logger.info(f"📊 NextActionInsightAgent [Customer {client_id}]: Found {len(notes)} total notes in client_history")

            if notes:
                self.logger.info(f"📞 NextActionInsightAgent [Customer {client_id}]: Calling note_agent.analyze_client_notes with {len(notes)} notes")
                note_analysis = self.note_agent.analyze_client_notes(
                    notes, client_id, analysis_focus="comprehensive", employee_id=employee_id
                )

                note_time = (datetime.now() - note_start_time).total_seconds()
                self.logger.info(f"⏱️ NextActionInsightAgent [Customer {client_id}]: Note analysis completed in {note_time:.2f}s")
                self.logger.info(f"📊 NextActionInsightAgent [Customer {client_id}]: Note analysis result keys: {list(note_analysis.keys()) if isinstance(note_analysis, dict) else 'Not a dict'}")
            else:
                self.logger.warning(f"⚠️ NextActionInsightAgent [Customer {client_id}]: No notes found, skipping note analysis")

        except Exception as e:
            note_time = (datetime.now() - note_start_time).total_seconds()
            self.logger.error(f"❌ NextActionInsightAgent [Customer {client_id}]: Note analysis failed after {note_time:.2f}s: {str(e)}")
            import traceback
            self.logger.error(f"🔍 NextActionInsightAgent [Customer {client_id}]: Note analysis traceback: {traceback.format_exc()}")
            note_analysis = {"error": f"Note analysis failed: {str(e)}"}

        # Get churn analysis from churn_orchestrator
        churn_analysis = {}
        churn_start_time = datetime.now()

        try:
            self.logger.info(f"🔍 NextActionInsightAgent [Customer {client_id}]: Starting history pattern analysis")

            # Use a default table name for history pattern analysis - this could be made configurable
            # The orchestrator will analyze the customer's purchase history patterns
            history_patterns = self.churn_orchestrator.analyze_customer_history_patterns(
                table_name="sales_data",  # Default table for client analysis
                target_customer=str(client_id)
            )

            churn_time = (datetime.now() - churn_start_time).total_seconds()
            self.logger.info(f"⏱️ NextActionInsightAgent [Customer {client_id}]: History pattern analysis completed in {churn_time:.2f}s")
            self.logger.info(f"📊 NextActionInsightAgent [Customer {client_id}]: History pattern analysis result keys: {list(history_patterns.keys()) if isinstance(history_patterns, dict) else 'Not a dict'}")

        except Exception as e:
            churn_time = (datetime.now() - churn_start_time).total_seconds()
            self.logger.error(f"❌ NextActionInsightAgent [Customer {client_id}]: History pattern analysis failed after {churn_time:.2f}s: {str(e)}")
            import traceback
            self.logger.error(f"🔍 NextActionInsightAgent [Customer {client_id}]: History pattern analysis traceback: {traceback.format_exc()}")
            history_patterns = {"error": f"History pattern analysis failed: {str(e)}"}

        # Determine activities status
        activities_status = self._determine_activities_status(client_history)

        system_message = """You are a client success strategist who excels at analyzing active clients and identifying growth opportunities through positive momentum and historical sales patterns. You must return exactly one valid JSON object with the specified structure - no additional text, formatting, or markdown. Each insight must be exactly 3 sentences.

For Momentum Assessment, FOCUS ON BUSINESS PROGRESS - deals closed, projects delivered, milestones achieved, tangible business outcomes. DO NOT analyze email interactions here.

For Recent Communication Analysis, FOCUS ON EMAIL/MESSAGE CONTENT - what specific concerns, requests, or issues did the client raise? Any frustrated tone, negative sentiment, or dissatisfaction in their messages? What problems need addressing?

For Opportunity Identification, ANALYZE HISTORICAL SALES PATTERNS to identify upsell/cross-sell opportunities and recommend specific ways to maintain and enhance revenue based on purchase history.

CRITICAL: You must assess churn_risk as either 'low' or 'medium' ONLY (never 'high' for active customers with recent interactions). Combine emails, notes, deals, and sales patterns for assessment."""

        prompt = f"""Analyze this active client data and return exactly one JSON object with the following structure:

{formatted_data}

EMAIL AGENT ANALYSIS:
{json.dumps(email_analysis, indent=2) if email_analysis else "No email analysis available"}

NOTE AGENT ANALYSIS:
{json.dumps(note_analysis, indent=2) if note_analysis else "No note analysis available"}

HISTORY PATTERN ANALYSIS:
{json.dumps(history_patterns, indent=2) if history_patterns else "No history pattern analysis available"}

OUTPUT CONTRACT (strict):
Return exactly one JSON object:
{{
  "Activities": "{activities_status}",
  "churn_risk": "[Assess as 'low' or 'medium' ONLY (never 'high' for active customers). LOW = strong engagement + positive sentiment + deals progressing. MEDIUM = some concerns but overall stable + neutral sentiment + deals active but slow progress.]",
  "Insights": [
    "Momentum Assessment: [3 sentences highlighting POSITIVE progress made in the relationship, recent wins with deals/projects, and successful business outcomes. Focus on what's working well, relationship milestones achieved, and tangible results delivered. DO NOT analyze email interactions here - focus on business progress and achievements.]",
    "Recent Communication Analysis: [3 sentences analyzing email/message content for client concerns, requests, issues, or negative sentiment. Identify any problems raised, unmet needs, frustrated tone, or dissatisfaction expressed in their messages. Focus on CONTENT of what they said and any bad tone/negative sentiment that needs to be addressed.]",
    "Opportunity Identification: [3 sentences analyzing historical sales patterns to identify upsell/cross-sell opportunities. Focus on how to maintain current sales momentum and enhance revenue through pattern-based insights. Recommend specific products/services that align with their purchase history and business growth.]"
  ],
  "Next Move": [
    "[Primary next action that builds on recent positive momentum and leverages historical sales patterns to advance the relationship. Include specific timing and approach that capitalizes on current engagement success and purchase history insights.]",
    "[Secondary action that maintains relationship strength while exploring expansion opportunities identified in sales history analysis. Focus on value creation and proactive support that strengthens partnership and drives revenue growth.]"
  ]
}}

REQUIREMENTS:
1. Return ONLY valid JSON - no additional text, markdown formatting, or code blocks
2. Activities field is pre-determined as "{activities_status}" based on interaction timing (always "active" for this agent)
3. churn_risk field MUST be "low" or "medium" ONLY (never "high") - active customers with recent interactions cannot be high churn risk
4. Each insight must be exactly 3 sentences, approximately 300 characters per insight
5. Momentum Assessment must FOCUS ON BUSINESS PROGRESS - deals closed, projects delivered, milestones achieved, business outcomes. DO NOT analyze email interactions.
6. Recent Communication Analysis must FOCUS ON CONTENT - what concerns/requests/issues did they raise? Any negative tone or bad sentiment in their messages? What problems need addressing?
7. Opportunity Identification must ANALYZE HISTORICAL SALES PATTERNS to identify upsell/cross-sell opportunities and revenue growth strategies
8. Next Move items should leverage current momentum and sales history insights to advance relationship and drive revenue
9. Reference specific elements from history pattern analysis: purchase patterns, successful product combinations, revenue expansion opportunities
10. Focus on growth-oriented next steps that build on current success and historical sales data
11. Each action description must connect back to positive momentum signals AND sales pattern opportunities
12. Ensure all strings in JSON are properly escaped (use \\n for newlines, \\" for quotes)

CHURN RISK ASSESSMENT GUIDELINES FOR ACTIVE CUSTOMERS:
- LOW: Strong positive signals + positive email/note sentiment + active deals progressing + consistent engagement + good purchase history patterns
- MEDIUM: Some minor concerns but stable + neutral/mixed sentiment + deals active but slower progress + moderate engagement with occasional gaps
- NOTE: "high" churn risk is NOT APPLICABLE for active customers with recent interactions - use medium at most

ANALYSIS FOCUS FOR ACTIVE CUSTOMERS:
- Business momentum: What deals have closed? What projects were delivered? What milestones were achieved? Focus on tangible business outcomes.
- Client concerns: What specific issues, requests, or concerns did they raise in emails/messages? Any frustrated tone or negative sentiment?
- Revenue growth: What historical sales patterns suggest upsell/cross-sell opportunities?
- Relationship advancement: How can we deepen the partnership based on business progress and address their concerns?
- Value expansion: What products/services from their purchase history indicate readiness for expansion?
- Problem resolution: What client-raised issues need immediate attention to maintain satisfaction?

HISTORY PATTERN INTEGRATION FOR ACTIVE CUSTOMERS:
- Leverage purchase patterns: Identify successful product combinations and buying cycles from sales history
- Spot expansion opportunities: Use historical data to recommend relevant upsell/cross-sell options
- Address concerns proactively: Use communication analysis to identify and resolve client issues early
- Revenue optimization: Focus on how to maintain and enhance current sales levels based on historical trends

RECENT COMMUNICATION ANALYSIS REQUIREMENTS:
- Focus on CONTENT of what client said in emails/messages - what did they request, complain about, or express concern over?
- Identify negative tone, frustration, dissatisfaction, or complaints in their communications
- Focus on content analysis rather than inactivity patterns
- Connect communication effectiveness to current client engagement and satisfaction levels"""

        response = self._generate_content(prompt, system_message)

        # Clean and validate JSON response
        try:
            # Clean the response to extract JSON
            response_clean = response.strip()
            if response_clean.startswith('```json'):
                response_clean = response_clean[7:]
            if response_clean.endswith('```'):
                response_clean = response_clean[:-3]
            response_clean = response_clean.strip()

            # Fix common JSON issues - just handle the most common case
            # Replace literal newline characters within JSON strings
            lines = response_clean.split('\n')
            if len(lines) > 1:
                # If there are actual newlines, this might be multiline JSON - join and clean
                response_clean = ' '.join(line.strip() for line in lines)

            # Validate JSON
            parsed_json = json.loads(response_clean)
            return json.dumps(parsed_json, indent=2)

        except json.JSONDecodeError:
            # Return fallback JSON if parsing fails
            fallback_response = {
                "Activities": activities_status,
                "churn_risk": "medium",  # Default to medium when analysis fails
                "Insights": [
                    "Momentum Assessment: Client interaction quality analysis encountered processing challenges but attempted to evaluate response patterns and engagement indicators. The system tried to assess communication effectiveness between client and employee interactions. Manual review of client communication sentiment and response timing may be needed for detailed momentum assessment.",
                    "Recent Communication Analysis: Communication content analysis was requested but encountered processing difficulties while attempting to evaluate conversation tone and effectiveness. The system tried to identify client requirements expressed in recent communications and assess satisfaction indicators. Review of actual conversation content may provide insights into communication quality and client needs.",
                    "Opportunity Identification: Opportunity analysis was initiated but faced processing constraints while attempting to identify immediate relationship advancement possibilities. The system tried to evaluate current client engagement for value creation opportunities. Direct client consultation may reveal specific opportunities for relationship enhancement and engagement improvement."
                ],
                "Next Move": [
                    "Review client communication history manually to understand interaction quality patterns and identify areas where our responses could be more effective, as automated analysis encountered processing issues that require human assessment of conversation content and client satisfaction indicators",
                    "Schedule direct client check-in call to clarify current needs and assess communication effectiveness, as this will provide immediate feedback on relationship quality and help re-establish engagement momentum based on actual client requirements and satisfaction levels"
                ]
            }
            return json.dumps(fallback_response, indent=2)

    def generate_quick_insights(self, client_history: Dict[str, Any], employee_id: int = None) -> str:
        """
        Generate quick next action insights with JSON format

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering

        Returns:
            JSON formatted next action insights
        """
        return self.generate_next_action_insights(client_history, employee_id)

    def analyze_client_momentum(self, client_history: Dict[str, Any], employee_id: int = None) -> str:
        """
        Analyze client momentum patterns with JSON format (same as generate_next_action_insights)

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering

        Returns:
            JSON formatted momentum analysis
        """
        return self.generate_next_action_insights(client_history, employee_id)

    def generate_engagement_strategy(self, client_history: Dict[str, Any], employee_id: int = None) -> str:
        """
        Generate engagement strategy with JSON format (same as generate_next_action_insights)

        Args:
            client_history: Complete client history data
            employee_id: Optional specific employee ID for filtering

        Returns:
            JSON formatted engagement strategy
        """
        return self.generate_next_action_insights(client_history, employee_id)