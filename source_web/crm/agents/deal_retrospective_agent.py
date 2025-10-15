"""
Deal Retrospective Agent - Comprehensive Financial Value & Satisfaction Analysis

A specialized AI agent that provides comprehensive retrospective analysis of client relationships,
combining quantitative data analysis with qualitative business insights. Emphasizes financial
value creation, customer satisfaction trends, and interaction patterns with meaningful
interpretation of what the data reveals about business health and opportunities.

Leverages the reusable DealHistoryAgent for deal-specific analysis while adding enhanced
client-focused insights that go beyond raw statistics to provide strategic understanding.

This agent is designed for retrospective analysis with strict JSON output format,
providing comprehensive insights that combine statistical facts with business interpretation
and well-reasoned actionable recommendations.

Core Analysis Types:
1. Enhanced Financial Value Analysis (quantitative metrics + qualitative interpretation of business health)
2. Comprehensive Customer Satisfaction Assessment (satisfaction scores + meaning and trend analysis)
3. Contextual Engagement Analytics (interaction data + relationship health implications)
4. Deal Pattern Analysis (from upstream DealHistoryAgent with business implications)
5. Reasoned Improvement Recommendations (actionable next steps with clear data-driven reasoning)

Enhanced Features:
- Combines quantitative statistics with qualitative business insights
- Interprets what metrics mean for relationship health and business strategy
- Provides reasoning for each recommendation based on data analysis
- Explains trends, patterns, and their business implications

Output Format:
Returns exactly one JSON object with Activities, Insights, and Next Move sections.
Each insight combines statistical data with meaningful interpretation.
Each recommendation includes clear reasoning based on the analysis.

Supported Providers:
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- OpenAI (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
"""

import os
from typing import Dict, Any, List
from dotenv import load_dotenv
from agents.common_agent.deal_history_agent import DealHistoryAgent
from agents.model_factory import ModelFactory

# Load environment variables from .env file
load_dotenv()

class DealRetrospectiveAgent:
    """
    Specialized AI agent for comprehensive financial value and satisfaction retrospective analysis.

    This agent combines deal-specific analysis (via DealHistoryAgent) with client relationship
    context to provide comprehensive retrospective insights that merge quantitative data with
    qualitative business interpretation. Returns structured JSON output with Activities status,
    enhanced Insights that combine statistics with meaning, and well-reasoned actionable
    recommendations.

    Key Features:
    - Quantitative + Qualitative Analysis: Combines statistical data with business interpretation
    - Enhanced Value Analysis: Financial metrics with trend analysis and business implications
    - Comprehensive Satisfaction Assessment: Satisfaction scores with meaning and impact analysis
    - Contextual Engagement Analysis: Interaction data with relationship health insights
    - Reasoned Recommendations: Each suggestion includes clear data-driven reasoning
    """

    def __init__(self,
                 provider: str = "openai",
                 model_name: str = None,
                 google_api_key: str = None,
                 openai_api_key: str = None):
        """
        Initialize the Deal Retrospective Agent with multi-provider support

        Args:
            provider: AI provider to use ("gemini" or "openai")
            model_name: Specific model to use (if None, uses defaults)
            google_api_key: Google AI API key (if not provided, uses environment variable)
            openai_api_key: OpenAI API key (if not provided, uses environment variable)
        """
        # Initialize model factory
        self.model_factory = ModelFactory.create_for_agent(
            agent_name="Deal Retrospective Agent",
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

        # Initialize the deal history agent for deal-specific analysis
        self.deal_history_agent = DealHistoryAgent(
            provider=provider,
            model_name=model_name,
            google_api_key=google_api_key,
            openai_api_key=openai_api_key
        )



    def _generate_content(self, prompt: str, system_message: str = None) -> str:
        """Generate content using the selected provider with enhanced context"""
        if system_message is None:
            system_message = "You are a senior business analyst specializing in financial value analysis, customer satisfaction assessment, and deal performance retrospectives. You provide structured JSON responses with specific insights and actionable recommendations."

        return self.model_factory.generate_content(prompt, system_message)

    def format_client_data_for_analysis(self, client_history: Dict[str, Any]) -> str:
        """
        Format client history data focusing on financial value, satisfaction, and interactions

        Args:
            client_history: Complete client history data structure

        Returns:
            Formatted string optimized for value and satisfaction analysis
        """
        if not client_history:
            return "No client history data available for analysis."

        # Extract key information
        client_info = client_history.get("client_info", {})
        client_details = client_history.get("client_details", {})
        deals = client_history.get("deals", [])
        feedback = client_history.get("customer_feedback", [])
        interactions = client_history.get("interaction_details", [])
        metrics = client_history.get("summary_metrics", {})

        # Calculate financial metrics
        total_deals = len(deals)
        won_deals = [d for d in deals if d.get('stage') == 'Closed-Won']
        won_count = len(won_deals)
        won_value = sum(d.get('value_usd', 0) for d in won_deals)
        total_value = sum(d.get('value_usd', 0) for d in deals)
        avg_deal_value = won_value / won_count if won_count > 0 else 0
        win_rate = (won_count / total_deals * 100) if total_deals > 0 else 0

        # Calculate interaction metrics
        total_interactions = metrics.get('total_interactions', 0)
        last_interaction = client_details.get('last_interaction', 'N/A')

        # Get satisfaction data with proper None handling
        satisfaction_score = client_details.get('satisfaction_score')
        if satisfaction_score is None:
            satisfaction_score = 0.0
        renewal_date = client_details.get('renewal_date', 'N/A')
        expansion_potential = client_details.get('expansion_potential', 'N/A')

        # Determine activity status
        status = client_info.get('status', 'Unknown').lower()
        if status in ['active', 'engaged']:
            activity_status = 'active'
        elif status in ['inactive', 'dormant', 'churned']:
            activity_status = 'inactive'
        else:
            activity_status = 'churned'

        formatted_data = f"""
=== CLIENT FINANCIAL ANALYSIS ===
Company: {client_info.get('name', 'N/A')}
Activity Status: {activity_status}
Total Deals: {total_deals}
Won Deals: {won_count} ({win_rate:.1f}% win rate)
Total Won Value: ${won_value:,.2f}
Average Deal Size: ${avg_deal_value:,.2f}

=== CUSTOMER SATISFACTION ===
Satisfaction Score: {satisfaction_score:.1f}/5.0
Renewal Date: {renewal_date}
Expansion Potential: {expansion_potential}
Total Feedback Entries: {len(feedback)}

=== ENGAGEMENT METRICS ===
Total Interactions: {total_interactions}
Last Interaction: {last_interaction}

=== DEAL DETAILS ===
"""

        # Add individual deal information
        for i, deal in enumerate(deals, 1):
            status_emoji = "✅" if deal.get('stage') == 'Closed-Won' else "❌" if deal.get('stage') == 'Closed-Lost' else "🔄"
            formatted_data += f"Deal {i}: {deal.get('deal_name', 'Unnamed')} {status_emoji} - ${deal.get('value_usd', 0):,.2f}\n"

        return formatted_data

    def generate_retrospective_analysis(self, client_history: Dict[str, Any]) -> str:
        """
        Generate focused retrospective analysis with strict JSON output format

        This method combines deal-specific insights from DealHistoryAgent with client
        relationship context to provide structured retrospective insights focused on
        financial value, customer satisfaction, engagement, and actionable improvements.

        Args:
            client_history: Complete client history data

        Returns:
            JSON string with Activities, Insights, and Improvements sections
        """
        # Get formatted data for analysis
        formatted_data = self.format_client_data_for_analysis(client_history)

        # Get deal pattern insights from DealHistoryAgent
        deal_patterns = ""
        if client_history.get("deals"):
            try:
                deal_patterns = self.deal_history_agent.generate_deal_insights(
                    client_history,
                    insight_type="quick"
                )
            except Exception as e:
                deal_patterns = f"Deal analysis error: {str(e)}"

        system_message = """You are a senior business analyst specializing in comprehensive client retrospective analysis. You excel at combining quantitative data analysis with qualitative business insights. You must return exactly one JSON object with the specified structure, providing both statistical facts and meaningful interpretation of what those numbers mean for business strategy, relationship health, and future opportunities. Your analysis should demonstrate deep understanding of how financial metrics, satisfaction indicators, and engagement patterns interconnect to reveal the true state of client relationships.

CRITICAL: For DealRetrospectiveAgent analysis, the customer status is always "completed" (clients with interactions but no active deals - completed engagement cycle) and churn_risk is always "low" (they have engagement history indicating relationship potential)."""

        prompt = f"""Analyze this client relationship data and return exactly one JSON object with comprehensive quantitative and qualitative analysis:

{formatted_data}

DEAL PATTERN ANALYSIS:
{deal_patterns}

OUTPUT CONTRACT (strict):
Return exactly one JSON object:
{{
  "Activities": "completed",
  "churn_risk": "low",
  "Insights": [
    "Value: ...",                  // Enhanced analysis combining quantitative stats with qualitative interpretation
    "Satisfaction: ...",           // Enhanced analysis combining quantitative metrics with qualitative meaning
    "Engagement: ...",             // Enhanced analysis combining quantitative data with qualitative context
    "Deal pattern: ...",           // Enhanced analysis from upstream patterns with business implications
  ],
  "Next Move": [
    "Recommendation 1: [Action] - [Clear reasoning based on data analysis]",
    "Recommendation 2: [Action] - [Clear reasoning based on data analysis]",
    "Recommendation 3: [Action] - [Clear reasoning based on data analysis]"
  ]
}}

ENHANCED ANALYSIS REQUIREMENTS:

VALUE SECTION:
- Include quantitative statistics: total won value, deal count, win rate, average deal size
- Add qualitative analysis: interpret what these numbers mean for business health, revenue trends, deal size evolution
- Provide insights about value patterns: growth trajectory, deal velocity, revenue concentration
- Explain business implications: what the financial performance indicates about client relationship strength

SATISFACTION SECTION:
- Include quantitative metrics: satisfaction scores, ratings, renewal indicators
- Add qualitative analysis: explain what these scores mean in business context
- Interpret satisfaction trends: improving/declining patterns and their significance
- Connect satisfaction to business outcomes: how satisfaction levels impact retention and expansion

ENGAGEMENT SECTION:
- Include quantitative data: interaction counts, frequency, recency
- Add qualitative analysis: what engagement patterns reveal about relationship health
- Contextualize engagement levels: high/low engagement implications for business
- Explain relationship indicators: what interaction patterns suggest about client commitment

NEXT MOVE SECTION:
- For each recommendation, provide clear reasoning that connects back to the analysis
- Explain why each action is relevant based on specific data insights
- Link recommendations to value, satisfaction, or engagement findings
- Ensure reasoning demonstrates understanding of the client's situation and needs

Requirements:
- Activities must be one of: "active", "inactive", "completed", "churned"
- Insights must be exactly 4 items starting with "Value:", "Satisfaction:", "Engagement:", "Deal pattern:"
- Each insight should combine quantitative data with meaningful qualitative interpretation
- Next Move must be 2-3 actionable recommendations with clear reasoning statements
- Use actual data from the analysis to support all insights and recommendations
"""

        return self._generate_content(prompt, system_message)

    def generate_quick_insights(self, client_history: Dict[str, Any]) -> str:
        """
        Generate quick key insights with JSON format

        Args:
            client_history: Complete client history data

        Returns:
            JSON formatted insights summary
        """
        return self.generate_retrospective_analysis(client_history)





    # Backward compatibility methods
    def format_client_history_for_llm(self, client_history: Dict[str, Any]) -> str:
        """
        Backward compatibility method - redirects to the new data formatting

        Args:
            client_history: Complete client history data structure

        Returns:
            Formatted string ready for LLM processing
        """
        return self.format_client_data_for_analysis(client_history)

    def generate_comprehensive_summary(self, client_history: Dict[str, Any]) -> str:
        """
        Backward compatibility method - redirects to the new retrospective analysis

        Args:
            client_history: Complete client history data

        Returns:
            JSON formatted retrospective analysis
        """
        return self.generate_retrospective_analysis(client_history)

    def format_client_history_for_retrospective(self, client_history: Dict[str, Any]) -> str:
        """
        Backward compatibility method - redirects to the new data formatting

        Args:
            client_history: Complete client history data structure

        Returns:
            Formatted string ready for analysis
        """
        return self.format_client_data_for_analysis(client_history)

    def generate_comprehensive_retrospective(self, client_history: Dict[str, Any]) -> str:
        """
        Backward compatibility method - redirects to the new retrospective analysis

        Args:
            client_history: Complete client history data

        Returns:
            JSON formatted retrospective analysis
        """
        return self.generate_retrospective_analysis(client_history)
