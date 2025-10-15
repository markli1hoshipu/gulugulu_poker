"""
Icebreaker Intro Agent - Enhanced AI-Powered Customer Engagement Insights

A specialized AI agent that helps employees initiate contact with new customers by generating
personalized insights, conversation starters, news-based icebreakers, and well-reasoned
relationship-building recommendations. This agent analyzes customer background, value potential,
interaction history, and current industry developments to provide actionable icebreaker talking
points with clear reasoning.

This agent is designed for customer engagement analysis with strict JSON output format,
providing comprehensive insights that focus on relationship building, current events as
conversation starters, and actionable engagement strategies with data-driven reasoning.

Enhanced Key Features:
1. Customer background analysis with personalized insights
2. Value potential assessment and opportunity identification
3. Interaction history analysis for relationship context
4. News-based icebreaker suggestions using recent industry developments
5. Reasoned recommendations with clear data-driven explanations
6. Multi-provider AI support (Gemini, OpenAI)

Core Analysis Capabilities:
- Customer profiling based on available data only
- Value opportunity identification from actual metrics
- Relationship context analysis from interaction history
- Current events and industry news as natural conversation starters
- Personalized icebreaker suggestions with business-appropriate topics
- Actionable recommendations with clear reasoning based on data analysis

Enhanced Output Format:
Returns exactly one JSON object with Activities, enhanced Insights (including Icebreaker category),
and reasoned Next Move sections. Each recommendation includes clear reasoning that connects back
to the client data analysis.

Insight Categories:
- Experience: Historical success with similar industry clients
- Context: Industry trends and market conditions
- Advantage: Competitive strengths and relationship potential
- Icebreaker: Recent news/developments as conversation starters

Data Priority Strategy:
- Use only available database fields for client-specific insights
- Leverage general industry knowledge for context and icebreaker suggestions
- Never fabricate specific client relationships or data
- Maintain data privacy and compliance standards
- Provide business-appropriate conversation starters

Supported Providers:
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- OpenAI (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
"""

import os
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv
from agents.model_factory import ModelFactory

# Load environment variables from .env file
load_dotenv()


class IcebreakerIntroAgent:
    """
    Enhanced AI-powered Icebreaker Introduction Agent

    This agent analyzes customer data to generate personalized insights, news-based conversation
    starters, and well-reasoned recommendations that help employees initiate meaningful contact
    with new customers. Returns structured JSON output with Activities, enhanced Insights
    (including Icebreaker category), and reasoned Next Move sections.

    Enhanced Features:
    - Four insight categories: Experience, Context, Advantage, and Icebreaker
    - News-based conversation starters using recent industry developments
    - Reasoned recommendations with clear data-driven explanations
    - Business-appropriate icebreaker suggestions for professional conversations
    - Enhanced guidance on how to naturally use current events in client interactions
    """

    def __init__(self,
                 provider: str = "openai",
                 model_name: str = None,
                 google_api_key: str = None,
                 openai_api_key: str = None):
        """
        Initialize the Icebreaker Intro Agent with multi-provider support

        Args:
            provider: AI provider to use ("gemini" or "openai")
            model_name: Specific model to use (if None, uses defaults)
            google_api_key: Google AI API key (if not provided, uses environment variable)
            openai_api_key: OpenAI API key (if not provided, uses environment variable)
        """
        # Initialize model factory
        self.model_factory = ModelFactory.create_for_agent(
            agent_name="Icebreaker Intro Agent",
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

    def _generate_content(self, prompt: str, system_message: str = None) -> str:
        """
        Generate content using the selected provider with enhanced error handling

        Args:
            prompt: The user prompt
            system_message: Optional system message for better context
        """
        if system_message is None:
            system_message = "You are a senior relationship manager and customer engagement specialist. You provide structured JSON responses with specific insights and actionable recommendations. Never fabricate data not present in the input. Maintain data privacy and avoid sensitive inferences."

        return self.model_factory.generate_content(prompt, system_message)

    def format_customer_data_for_analysis(self, 
                                         customer_data: Union[Dict[str, Any], List[Dict[str, Any]]], 
                                         context: str = "icebreaker_analysis") -> str:
        """
        Format customer data for LLM analysis with comprehensive context
        
        Args:
            customer_data: Customer data (client history dict or list of customers)
            context: Analysis context for the formatting
            
        Returns:
            Formatted string ready for LLM processing
        """
        if not customer_data:
            return "No customer data available for analysis."

        # Handle different input formats
        if isinstance(customer_data, dict):
            # Complete client history format
            client_info = customer_data.get("client_info", {})
            client_details = customer_data.get("client_details", {})
            deals = customer_data.get("deals", [])
            interactions = customer_data.get("interaction_details", [])
            feedback = customer_data.get("customer_feedback", [])
            notes = customer_data.get("employee_client_notes", [])
            metrics = customer_data.get("summary_metrics", {})
            is_single_customer = True
        else:
            # List format - for now, take first customer
            customer_data = customer_data[0] if isinstance(customer_data, list) else customer_data
            client_info = customer_data
            client_details = {}
            deals = []
            interactions = []
            feedback = []
            notes = []
            metrics = {}
            is_single_customer = True

        formatted_data = f"=== CUSTOMER ICEBREAKER ANALYSIS CONTEXT: {context.upper()} ===\n"
        
        # Customer Profile Section
        formatted_data += f"""
=== CUSTOMER PROFILE ===
Company: {client_info.get('name', 'N/A')}
Primary Contact: {client_info.get('primary_contact', 'N/A')}
Industry: {client_info.get('industry', 'N/A')}
Location: {client_info.get('location', 'N/A')}
Status: {client_info.get('status', 'N/A')}
Source: {client_info.get('source', 'N/A')}
Client Type: {client_info.get('client_type', 'N/A')}
Notes: {client_info.get('notes', 'N/A')}
"""

        # Value & Opportunity Assessment with proper None handling
        if client_details:
            # Handle potential None values for numeric fields
            contract_value = client_details.get('contract_value')
            contract_value = contract_value if contract_value is not None else 0
            monthly_value = client_details.get('monthly_value')
            monthly_value = monthly_value if monthly_value is not None else 0
            health_score = client_details.get('health_score')
            health_score = health_score if health_score is not None else 0
            satisfaction_score = client_details.get('satisfaction_score')
            satisfaction_score = satisfaction_score if satisfaction_score is not None else 0.0

            formatted_data += f"""
=== VALUE & OPPORTUNITY ASSESSMENT ===
Contract Value: ${contract_value:,.2f}
Monthly Value: ${monthly_value:,.2f}
Health Score: {health_score:.2f}/1.0
Satisfaction Score: {satisfaction_score:.1f}/5.0
Expansion Potential: {client_details.get('expansion_potential', 'N/A')}
Churn Risk: {client_details.get('churn_risk', 'N/A')}
"""

        # Deal History and Related Clients Context
        if deals:
            total_deal_value = sum(d.get('value_usd', 0) for d in deals)
            won_deals = [d for d in deals if d.get('stage') == 'Closed-Won']
            won_value = sum(d.get('value_usd', 0) for d in won_deals)

            formatted_data += f"""
=== DEAL HISTORY AND RELATED CLIENTS CONTEXT ===
Total Deal Portfolio: ${total_deal_value:,.2f}
Won Deal Value: ${won_value:,.2f}
Number of Deals: {len(deals)}
Won Deals: {len(won_deals)}
Recent Deals:"""

            # Show recent deals (up to 3)
            recent_deals = sorted(deals, key=lambda x: x.get('created_at', ''), reverse=True)[:3]
            for deal in recent_deals:
                status_emoji = "✅" if deal.get('stage') == 'Closed-Won' else "❌" if deal.get('stage') == 'Closed-Lost' else "🔄"
                formatted_data += f"""
  • {deal.get('deal_name', 'Unnamed Deal')} {status_emoji} - ${deal.get('value_usd', 0):,.2f}
    Stage: {deal.get('stage', 'Unknown')} | Created: {deal.get('created_at', 'N/A')}"""

        # Interaction History & Relationship Context
        if interactions:
            total_interaction_time = sum(i.get('duration_minutes', 0) for i in interactions)
            recent_interactions = sorted(interactions, key=lambda x: x.get('created_at', ''), reverse=True)[:5]
            
            formatted_data += f"""
=== INTERACTION HISTORY & RELATIONSHIP CONTEXT ===
Total Interactions: {len(interactions)}
Total Interaction Time: {total_interaction_time} minutes
Recent Interactions:"""
            
            for interaction in recent_interactions:
                formatted_data += f"""
  • {interaction.get('type', 'Unknown')} ({interaction.get('duration_minutes', 0)} min) - {interaction.get('created_at', 'N/A')}
    Content: {interaction.get('content', 'No content')[:80]}{'...' if len(interaction.get('content', '')) > 80 else ''}"""

        # Customer Feedback & Satisfaction
        if feedback:
            avg_rating = sum(f.get('rating', 0) for f in feedback) / len(feedback)
            recent_feedback = sorted(feedback, key=lambda x: x.get('created_at', ''), reverse=True)[:3]

            formatted_data += f"""
=== CUSTOMER FEEDBACK & SATISFACTION ===
Average Rating: {avg_rating:.1f}/5.0
Total Feedback Records: {len(feedback)}
Recent Feedback:"""

            for fb in recent_feedback:
                formatted_data += f"""
  • Rating: {fb.get('rating', 0)}/5 - {fb.get('created_at', 'N/A')}
    Comment: {fb.get('comment', 'No comment')[:100]}{'...' if len(fb.get('comment', '')) > 100 else ''}"""

        # Employee Notes & Research
        if notes:
            recent_notes = sorted(notes, key=lambda x: x.get('created_at', ''), reverse=True)[:5]

            formatted_data += f"""
=== EMPLOYEE NOTES & RESEARCH ===
Total Notes: {len(notes)}
Recent Notes:"""

            for note in recent_notes:
                formatted_data += f"""
  • {note.get('title', 'Untitled')} - {note.get('created_at', 'N/A')}
    Content: {note.get('body', 'No content')[:120]}{'...' if len(note.get('body', '')) > 120 else ''}"""

        # Add related client analysis
        related_analysis = self._analyze_related_clients(customer_data)
        if related_analysis:
            formatted_data += f"""
=== RELATED CLIENT EXPERIENCE ===
{related_analysis}"""

        return formatted_data

    def _analyze_related_clients(self, customer_data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
        """
        Analyze historical clients and deals based on industry, excluding current prospect

        Args:
            customer_data: Customer data to analyze

        Returns:
            Formatted string with historical deal analysis or empty string if no data
        """
        if not isinstance(customer_data, dict):
            return ""

        current_client_info = customer_data.get("client_info", {})
        current_industry = current_client_info.get("industry", "")
        current_client_id = current_client_info.get("client_id")

        if not current_industry:
            return ""

        # Load all deals and clients data to find historical successful deals
        try:
            from csv_data_loader import CSVDataLoader
            import os

            # Get the directory where the CSV files are located
            csv_dir = os.path.dirname(os.path.abspath(__file__))
            csv_dir = os.path.join(csv_dir, '..', 'mock_data', 'icebreaker_intro_agent_test')

            data_loader = CSVDataLoader(csv_dir)
            all_dataset = data_loader.load_all_data()

            # Get historical successful deals in the same industry
            historical_success = self._extract_historical_deal_success(
                all_dataset, current_client_id, current_industry)

            analysis_parts = []
            if historical_success:
                analysis_parts.append("HISTORICAL SIMILAR INDUSTRY SUCCESS:")
                analysis_parts.extend(historical_success)
            else:
                analysis_parts.append("HISTORICAL EXPERIENCE: No previous similar industry deals found in historical data")

            return "\n".join(analysis_parts) if analysis_parts else ""

        except Exception as e:
            return "HISTORICAL EXPERIENCE: Unable to access historical deal data"

    def _extract_historical_deal_success(self, all_dataset: Dict[str, Any], current_client_id: int, current_industry: str) -> List[str]:
        """
        Extract historical deal success metrics from completed deals in the same industry

        Args:
            all_dataset: Complete dataset with all clients and deals
            current_client_id: ID of current prospect to exclude
            current_industry: Industry of current prospect to match against

        Returns:
            List of formatted historical success strings
        """
        deals = all_dataset.get('deals', [])
        clients = all_dataset.get('clients_info', [])

        # Create client lookup for industry matching
        client_lookup = {client.get('client_id'): client for client in clients}

        # Find successful deals in the same industry (excluding current client)
        historical_deals = []
        for deal in deals:
            deal_client_id = deal.get('client_id')
            deal_stage = deal.get('stage', '')

            # Skip current client and non-successful deals
            if deal_client_id == current_client_id or deal_stage != 'Closed-Won':
                continue

            # Check if client is in the same industry
            client_info = client_lookup.get(deal_client_id, {})
            client_industry = client_info.get('industry', '')

            if client_industry == current_industry:
                historical_deals.append({
                    'client_name': client_info.get('name', 'Unknown Client'),
                    'deal_value': deal.get('value_usd', 0),
                    'deal_name': deal.get('deal_name', 'Unknown Deal'),
                    'industry': client_industry
                })

        if not historical_deals:
            return []

        # Calculate summary metrics
        total_deals = len(historical_deals)
        total_value = sum(deal['deal_value'] for deal in historical_deals)
        client_names = [deal['client_name'] for deal in historical_deals[:3]]  # Top 3 for naming

        # Format historical success summary
        success_summary = []

        # Main success metric
        client_list = ", ".join(client_names[:2])
        if len(client_names) > 2:
            client_list += f" and {len(historical_deals) - 2} others"

        success_line = f"  • Successfully closed {total_deals} {current_industry.lower()} companies (${total_value/1000:.0f}K total) including {client_list}"
        success_summary.append(success_line)

        # Add specific deal examples if available
        if len(historical_deals) >= 2:
            top_deals = sorted(historical_deals, key=lambda x: x['deal_value'], reverse=True)[:2]
            for deal in top_deals:
                deal_line = f"  • {deal['client_name']}: ${deal['deal_value']/1000:.0f}K - {deal['deal_name'][:60]}..."
                success_summary.append(deal_line)

        return success_summary[:3]  # Limit to 3 most relevant items



    def generate_icebreaker_insights(self,
                                   customer_data: Union[Dict[str, Any], List[Dict[str, Any]]],
                                   insight_type: str = "comprehensive") -> str:
        """
        Generate personalized icebreaker insights with strict JSON output format

        Args:
            customer_data: Customer data to analyze
            insight_type: Type of insights (currently all return same comprehensive format)

        Returns:
            JSON string with Activities, Insights, and Next Move sections
        """
        formatted_data = self.format_customer_data_for_analysis(customer_data, context="icebreaker_insights")

        # Determine Activities status based on interaction history
        activities_status = self._determine_activities_status(customer_data)

        system_message = """You are a customer engagement specialist who excels at providing structured insights for employee confidence building and highly specific, actionable icebreaker recommendations. You must return exactly one JSON object with the specified structure. Each insight must be exactly 3 sentences (~300 characters). For Experience insights, focus on historical deal success with similar clients. For Context insights, provide relevant industry trends or developments. For Advantage insights, highlight competitive strengths and deal potential. For Icebreaker insights, be VERY SPECIFIC - mention actual recent industry developments, regulatory changes, or market trends. For Next Move recommendations, provide clear reasoning based on the data analysis. Use specific industry knowledge to create concrete, actionable conversation starters."""

        prompt = f"""Analyze this customer data and return exactly one JSON object with enhanced icebreaker insights and reasoned recommendations:

{formatted_data}

OUTPUT CONTRACT (strict):
Return exactly one JSON object:
{{
  "Activities": "{activities_status}",
  "Insights": [
    "Experience: [relevant past interactions/customer experience - 3 sentences max, ~300 chars]",
    "Context: [external context like company/industry news/recent developments - 3 sentences max, ~300 chars]",
    "Icebreaker: [recent news/developments/trends that can serve as conversation starters - 3 sentences max, ~300 chars]"
  ],
  "Next Move": [
    "Action: [Specific actionable instruction]\nReasoning: [Why this is relevant based on data]",
    "Action: [Alternative approach]\nReasoning: [Why this makes sense as backup plan]"
  ]
}}

INSIGHT REQUIREMENTS:
1. First insight MUST start with "Experience:" - Output relevant past interactions or customer experience from historical similar clients
   - Reference past successful engagements with similar industry clients (Closed-Won deals only)
   - Summarize the most useful information in no more than 3 sentences
   - Focus on concrete deal metrics and proven success patterns
   - Format: "Experience: [Historical success summary]. [Key learnings]. [Relevance to current prospect]."
2. Second insight MUST start with "Context:" - Add short external context (related company news or industry news)
   - Keep it concise, no more than 3 sentences
   - Focus on industry trends, market conditions, or company-specific developments
   - Use publicly available information or general industry knowledge
3. Third insight MUST start with "Icebreaker:" - Suggest specific, recent news or developments as conversation starters
   - Be SPECIFIC: Mention actual industry trends, regulatory changes, market shifts, or technology developments
   - Focus on topics from the last 3-6 months that would be relevant to their industry
   - Examples of specific topics: new regulations, industry consolidation, emerging technologies, market expansions, funding trends
   - Format: "Icebreaker: [Specific recent development with details]. [Direct impact on their business/industry]. [Exact conversation starter phrase to use]."
4. Each insight must be exactly 3 sentences, approximately 300 characters per insight
5. If no historical experience exists, state "Experience: No previous similar industry experience in historical data."

DATA SOURCE PRIORITIZATION:
- PRIMARY (70% weight): deals table (Closed-Won status) - historical deal success metrics and client names
- SECONDARY (20% weight): clients_info table - industry matching and company profile information
- SUPPORTING (10% weight): Other tables (interactions, feedback) - context for current prospect only

CONSTRAINTS:
- Activities field is pre-determined as "{activities_status}" based on interaction timing
- Insights must be exactly 3 items: Experience, Context, and Icebreaker
- Each insight must be exactly 3 sentences, approximately 300 characters per insight
- Next Move items must follow format: "Action: [specific action]\nReasoning: [data-based explanation]"
- Use ONLY data from the provided customer information for Experience/Advantage - never fabricate relationships
- For Context/Icebreaker insights, use general industry knowledge and recent business trends
- No PII exposure beyond business contact info
- Focus on business-relevant observations that build employee confidence and provide actionable conversation starters

CONTENT REQUIREMENTS:
- Experience insight: Draw EXCLUSIVELY from historical Closed-Won deals in the same industry (excluding current prospect)
- Context insight: Combine current prospect profile with patterns from past successful similar clients
- Icebreaker insight: Suggest SPECIFIC recent industry news, regulatory changes, or market developments with exact conversation openers
- CRITICAL: Experience insight must exclude ALL current prospect data (deals, interactions, notes, feedback)
- Focus on concrete deal success metrics and proven track record with similar industry clients only
- Build employee confidence by highlighting specific past wins and deal values
- Provide actionable conversation starters that demonstrate genuine business interest

ICEBREAKER SPECIFICITY REQUIREMENTS:
- Use CONCRETE examples: "AI regulation changes in healthcare" not "industry changes"
- Include TIMEFRAME: "recent FDA guidance" or "Q3 2024 market report" or "new legislation passed"
- Focus on BUSINESS IMPACT: How the news affects their operations, opportunities, or challenges
- Industry-specific examples:
  * Technology: AI regulations, data privacy laws, cloud adoption trends, cybersecurity incidents
  * Healthcare: FDA approvals, telehealth expansion, regulatory changes, digital health trends
  * Finance: Interest rate changes, fintech regulations, digital banking trends, compliance updates
  * Manufacturing: Supply chain developments, automation trends, sustainability regulations
  * Retail: E-commerce shifts, consumer behavior changes, omnichannel trends, payment innovations

NEXT MOVE REQUIREMENTS:
- Each recommendation must include clear reasoning that connects back to the data analysis
- Explain why each action is relevant based on client profile, interaction history, or industry context
- First action should be primary approach based on strongest data insights
- Second action should be alternative approach that addresses different aspects of the relationship
- Reasoning should demonstrate understanding of client needs and business situation
- Connect recommendations to specific insights from Experience, Context, Advantage, or Icebreaker analysis"""

        return self._generate_content(prompt, system_message)

    def _determine_activities_status(self, customer_data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
        """
        Determine Activities status based on interaction history

        Returns:
            "churned" if no interactions exist
            "inactive" if most recent interaction is older than 7 days
            "active" if most recent interaction is within last 7 days
        """
        from datetime import datetime, timedelta

        # Handle different input formats
        if isinstance(customer_data, dict):
            interactions = customer_data.get("interaction_details", [])
        else:
            interactions = []

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

        # Check if within 7 days
        seven_days_ago = datetime.now() - timedelta(days=7)
        if most_recent >= seven_days_ago:
            return "active"
        else:
            return "inactive"

    def analyze_customer_background(self,
                                  customer_data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
        """
        Analyze customer background with JSON format (same as generate_icebreaker_insights)

        Args:
            customer_data: Customer data to analyze

        Returns:
            JSON formatted background analysis
        """
        return self.generate_icebreaker_insights(customer_data, insight_type="comprehensive")

    def identify_conversation_starters(self,
                                     customer_data: Union[Dict[str, Any], List[Dict[str, Any]]],
                                     conversation_type: str = "business") -> str:
        """
        Generate conversation starters with JSON format (same as generate_icebreaker_insights)

        Args:
            customer_data: Customer data to analyze
            conversation_type: Type of conversation (parameter ignored, returns standard format)

        Returns:
            JSON formatted conversation starters
        """
        return self.generate_icebreaker_insights(customer_data, insight_type="comprehensive")

    def assess_relationship_potential(self,
                                   customer_data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
        """
        Assess relationship potential with JSON format (same as generate_icebreaker_insights)

        Args:
            customer_data: Customer data to analyze

        Returns:
            JSON formatted relationship assessment
        """
        return self.generate_icebreaker_insights(customer_data, insight_type="comprehensive")

    def generate_value_talking_points(self,
                                    customer_data: Union[Dict[str, Any], List[Dict[str, Any]]],
                                    focus_area: str = "comprehensive") -> str:
        """
        Generate value talking points with JSON format (same as generate_icebreaker_insights)

        Args:
            customer_data: Customer data to analyze
            focus_area: Focus area (parameter ignored, returns standard format)

        Returns:
            JSON formatted value talking points
        """
        return self.generate_icebreaker_insights(customer_data, insight_type="comprehensive")

    def generate_quick_insights(self, customer_data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
        """
        Generate quick insights with JSON format (same as generate_icebreaker_insights)

        Args:
            customer_data: Customer data to analyze

        Returns:
            JSON formatted quick insights
        """
        return self.generate_icebreaker_insights(customer_data, insight_type="comprehensive")