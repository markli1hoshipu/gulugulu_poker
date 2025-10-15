import os
import logging
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from google import genai
# from auth.providers import verify_auth_token  # Disabled for Docker compatibility

# Dummy auth function for Docker compatibility
def verify_auth_token():
    """Dummy auth function - returns empty dict when auth is disabled"""
    return {}

# Import shared database functions
from routers.crm_data_router import get_db_connection
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)
router = APIRouter()

def get_comprehensive_analytics_data():
    """Get comprehensive analytics data from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get basic customer data first (without nested aggregates)
        query = """
        SELECT 
            ci.client_id,
            ci.name as company,
            ci.primary_contact,
            ci.email,
            ci.industry,
            ci.location,
            ci.status,
            ci.client_type,
            ci.created_at as customer_since,
            cd.contract_value,
            cd.monthly_value,
            cd.renewal_date,
            cd.health_score,
            cd.churn_risk,
            cd.satisfaction_score,
            cd.expansion_potential,
            cd.last_interaction,
            cd.total_interactions,
            cd.support_tickets,
            cd.contact_birthday,
            -- Calculate ARR
            COALESCE(cd.monthly_value * 12, cd.contract_value, 0) as arr,
            -- Get recent interaction count
            COALESCE((
                SELECT COUNT(*)
                FROM interaction_details i 
                WHERE i.customer_id = ci.client_id 
                AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'
            ), 0) as interactions_last_30_days
        FROM clients_info ci
        LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
        WHERE ci.status IN ('active', 'at-risk')
        ORDER BY 
            CASE WHEN cd.churn_risk = 'high' THEN 1
                 WHEN ci.status = 'at-risk' THEN 2
                 WHEN cd.health_score < 60 THEN 3
                 ELSE 4 END,
            cd.contract_value DESC NULLS LAST
        """
        
        cursor.execute(query)
        customers_data = cursor.fetchall()
        
        # Get interaction type distribution separately - FIXED
        interaction_types_query = """
        SELECT 
            customer_id,
            json_object_agg(type, type_count) as recent_interaction_types
        FROM (
            SELECT 
                customer_id,
                type,
                COUNT(*) as type_count
            FROM interaction_details 
            WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY customer_id, type
        ) interaction_summary
        GROUP BY customer_id
        """
        
        cursor.execute(interaction_types_query)
        interaction_types_data = {row['customer_id']: row['recent_interaction_types'] for row in cursor.fetchall()}
        
        # Get employee engagement data separately - FIXED
        employee_engagement_query = """
        SELECT 
            customer_id,
            json_object_agg(employee_name, interaction_count) as employee_engagement
        FROM (
            SELECT 
                i.customer_id,
                e.name as employee_name,
                COUNT(i.interaction_id) as interaction_count
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            WHERE i.created_at >= CURRENT_DATE - INTERVAL '90 days'
            AND e.name IS NOT NULL
            GROUP BY i.customer_id, e.name
        ) emp_summary
        GROUP BY customer_id
        """
        
        cursor.execute(employee_engagement_query)
        employee_engagement_data = {row['customer_id']: row['employee_engagement'] for row in cursor.fetchall()}
        
        # Get overall interaction statistics
        interaction_stats_query = """
        SELECT 
            COUNT(*) as total_interactions,
            COUNT(DISTINCT customer_id) as customers_with_interactions,
            COALESCE(AVG(EXTRACT(DAY FROM CURRENT_DATE - created_at)), 0) as avg_days_since_interaction,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as interactions_last_7_days,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as interactions_last_30_days
        FROM interaction_details
        WHERE created_at >= CURRENT_DATE - INTERVAL '180 days'
        """
        
        cursor.execute(interaction_stats_query)
        interaction_stats = cursor.fetchone()
        
        # Get interaction type distribution (overall)
        interaction_dist_query = """
        SELECT 
            type,
            COUNT(*) as count
        FROM interaction_details 
        WHERE created_at >= CURRENT_DATE - INTERVAL '180 days'
        GROUP BY type
        """
        
        cursor.execute(interaction_dist_query)
        interaction_distribution = {row['type']: row['count'] for row in cursor.fetchall()}
        
        # Get employee productivity stats
        employee_stats_query = """
        SELECT 
            e.name,
            e.role,
            e.department,
            COUNT(i.interaction_id) as total_interactions,
            COUNT(DISTINCT i.customer_id) as customers_managed,
            COALESCE(AVG(cd.health_score), 0) as avg_customer_health_score,
            COUNT(CASE WHEN cd.churn_risk = 'high' THEN 1 END) as high_risk_customers
        FROM employee_info e
        LEFT JOIN interaction_details i ON e.employee_id = i.employee_id 
            AND i.created_at >= CURRENT_DATE - INTERVAL '90 days'
        LEFT JOIN clients_details cd ON i.customer_id = cd.client_id
        GROUP BY e.employee_id, e.name, e.role, e.department
        HAVING COUNT(i.interaction_id) > 0
        ORDER BY total_interactions DESC
        """
        
        cursor.execute(employee_stats_query)
        employee_stats = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Combine the data
        customers_with_extra_data = []
        for customer in customers_data:
            customer_dict = dict(customer)
            customer_id = customer_dict['client_id']
            
            # Add interaction types data
            customer_dict['recent_interaction_types'] = interaction_types_data.get(customer_id, {})
            
            # Add employee engagement data
            customer_dict['employee_engagement'] = employee_engagement_data.get(customer_id, {})
            
            customers_with_extra_data.append(customer_dict)
        
        # Add interaction distribution to stats
        interaction_stats_dict = dict(interaction_stats) if interaction_stats else {}
        interaction_stats_dict['interaction_type_distribution'] = interaction_distribution
        
        return {
            'customers': customers_with_extra_data,
            'interaction_stats': interaction_stats_dict,
            'employee_stats': [dict(emp) for emp in employee_stats]
        }
        
    except Exception as e:
        logger.error(f"Error getting comprehensive analytics data: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching analytics data: {str(e)}")

def process_analytics_data(raw_data):
    """Process raw data into analytics insights format"""
    customers = raw_data['customers']
    interaction_stats = raw_data['interaction_stats']
    employee_stats = raw_data['employee_stats']
    
    if not customers:
        return {"error": "No customer data found"}
    
    # Calculate key metrics
    total_customers = len(customers)
    total_arr = sum(float(c.get('arr', 0) or 0) for c in customers)
    total_contract_value = sum(float(c.get('contract_value', 0) or 0) for c in customers)
    avg_health_score = sum(float(c.get('health_score', 0) or 0) for c in customers) / total_customers if total_customers > 0 else 0
    avg_satisfaction = sum(float(c.get('satisfaction_score', 0) or 0) for c in customers) / total_customers if total_customers > 0 else 0
    
    # Segment customers
    high_value_customers = [c for c in customers if float(c.get('arr', 0) or 0) > 100000]
    at_risk_customers = [c for c in customers if c.get('churn_risk') == 'high' or float(c.get('health_score', 100) or 100) < 60]
    expansion_opportunities = [c for c in customers if c.get('expansion_potential') in ['high', 'very high']]
    low_engagement = [c for c in customers if int(c.get('interactions_last_30_days', 0) or 0) == 0]
    upcoming_renewals = [c for c in customers if c.get('renewal_date') and 
                        (datetime.fromisoformat(str(c['renewal_date'])).date() - datetime.now().date()).days <= 90]
    
    # Industry and status breakdowns
    industry_breakdown = {}
    status_breakdown = {}
    churn_risk_breakdown = {}
    
    for customer in customers:
        # Industry
        industry = customer.get('industry', 'Unknown')
        industry_breakdown[industry] = industry_breakdown.get(industry, 0) + 1
        
        # Status
        status = customer.get('status', 'Unknown')
        status_breakdown[status] = status_breakdown.get(status, 0) + 1
        
        # Churn risk
        churn_risk = customer.get('churn_risk', 'Unknown')
        churn_risk_breakdown[churn_risk] = churn_risk_breakdown.get(churn_risk, 0) + 1
    
    # Calculate engagement metrics
    highly_engaged = len([c for c in customers if int(c.get('interactions_last_30_days', 0) or 0) >= 3])
    total_interactions_30_days = sum(int(c.get('interactions_last_30_days', 0) or 0) for c in customers)
    
    return {
        "portfolio_overview": {
            "total_customers": total_customers,
            "total_arr": total_arr,
            "total_contract_value": total_contract_value,
            "avg_health_score": avg_health_score,
            "avg_satisfaction_score": avg_satisfaction
        },
        "segmentation": {
            "high_value_customers": len(high_value_customers),
            "at_risk_customers": len(at_risk_customers),
            "expansion_opportunities": len(expansion_opportunities),
            "low_engagement_customers": len(low_engagement),
            "upcoming_renewals": len(upcoming_renewals)
        },
        "breakdowns": {
            "industry": industry_breakdown,
            "status": status_breakdown,
            "churn_risk": churn_risk_breakdown
        },
        "engagement_metrics": {
            "highly_engaged_customers": highly_engaged,
            "total_interactions_30_days": total_interactions_30_days,
            "avg_interactions_per_customer": total_interactions_30_days / total_customers if total_customers > 0 else 0
        },
        "top_performers": {
            "high_value_sample": high_value_customers[:5],
            "expansion_sample": expansion_opportunities[:5],
            "at_risk_sample": at_risk_customers[:5]
        },
        "employee_performance": employee_stats[:5],  # Top 5 employees by activity
        "interaction_insights": interaction_stats
    }

@router.post("/generate-analytics-insights")
async def generate_analytics_insights(authenticated_user: dict = Depends(verify_auth_token)) -> Dict:
    """Generate AI-powered analytics insights using real database data and Gemini AI."""
    
    try:
        logger.info("Generating AI analytics insights from database...")
        
        # Get comprehensive data from database
        raw_data = get_comprehensive_analytics_data()
        
        # Process into analytics format
        analytics_data = process_analytics_data(raw_data)
        
        if "error" in analytics_data:
            return {
                "status": "error",
                "insights": {"content": "No customer data available for analysis."}
            }
        
        # Get API key
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="API key not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        # Initialize Gemini client
        client = genai.Client(api_key=api_key)
        
        # Create comprehensive analytics prompt
        prompt = f"""You are a Senior Customer Success Analyst providing executive-level insights. Analyze this customer portfolio data and provide strategic recommendations.

PORTFOLIO OVERVIEW:
📊 Total Customers: {analytics_data['portfolio_overview']['total_customers']}
💰 Total ARR: ${analytics_data['portfolio_overview']['total_arr']:,.2f}
📈 Average Health Score: {analytics_data['portfolio_overview']['avg_health_score']:.1f}/100
⭐ Average Satisfaction: {analytics_data['portfolio_overview']['avg_satisfaction_score']:.1f}/10

CRITICAL SEGMENTS:
🔥 At-Risk Customers: {analytics_data['segmentation']['at_risk_customers']} ({(analytics_data['segmentation']['at_risk_customers']/analytics_data['portfolio_overview']['total_customers']*100):.1f}% of portfolio)
💎 High-Value Customers: {analytics_data['segmentation']['high_value_customers']} (${sum(float(c.get('arr', 0) or 0) for c in analytics_data['top_performers']['high_value_sample']):,.0f} ARR sample)
🚀 Expansion Opportunities: {analytics_data['segmentation']['expansion_opportunities']} customers
📉 Low Engagement: {analytics_data['segmentation']['low_engagement_customers']} customers (no interactions in 30 days)
⏰ Upcoming Renewals: {analytics_data['segmentation']['upcoming_renewals']} customers (next 90 days)

ENGAGEMENT INSIGHTS:
📞 Total Interactions (30 days): {analytics_data['engagement_metrics']['total_interactions_30_days']}
🎯 Highly Engaged: {analytics_data['engagement_metrics']['highly_engaged_customers']} customers (3+ interactions/month)
📊 Interaction Average: {analytics_data['engagement_metrics']['avg_interactions_per_customer']:.1f} per customer/month

INDUSTRY DISTRIBUTION:
{analytics_data['breakdowns']['industry']}

CHURN RISK BREAKDOWN:
{analytics_data['breakdowns']['churn_risk']}

TOP EMPLOYEE PERFORMANCE:
{analytics_data['employee_performance']}

HIGH-VALUE CUSTOMER SAMPLE:
{analytics_data['top_performers']['high_value_sample']}

AT-RISK CUSTOMER SAMPLE:
{analytics_data['top_performers']['at_risk_sample']}

Generate a comprehensive executive analysis with these specific sections:

**AI-Generated Customer Insights**

**Revenue Optimization Opportunity**
[Identify specific revenue growth potential with concrete numbers and customer segments]

**Churn Risk Alert**
[Highlight immediate risks with specific customer counts and recommended actions]

**Success Pattern Identified**
[Identify what's working well with specific metrics and percentages]

**Segmentation Recommendation**
[Provide customer portfolio segmentation with percentages and strategic approach for each segment]

**Employee Performance Insights**
[Analyze team performance and identify optimization opportunities]

**Immediate Action Items**
[3-4 specific, actionable recommendations with customer counts and deadlines]

**Strategic Recommendations**
[2-3 longer-term strategic initiatives based on the data patterns]

Make insights specific, actionable, and data-driven. Include percentages, dollar amounts, and customer counts where relevant. Focus on immediate opportunities and risks that require attention."""

        # Make API call
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        # Validate response
        if not response.text:
            raise Exception("Failed to generate analytics insights")
        
        insights_content = response.text.strip()
        
        logger.info(f"Successfully generated analytics insights for {analytics_data['portfolio_overview']['total_customers']} customers")
        
        return {
            "status": "success",
            "insights": {
                "content": insights_content,
                "generated_by": "gemini-2.5-flash",
                "data_summary": {
                    "total_customers": analytics_data['portfolio_overview']['total_customers'],
                    "total_arr": analytics_data['portfolio_overview']['total_arr'],
                    "avg_health_score": round(analytics_data['portfolio_overview']['avg_health_score'], 1),
                    "at_risk_count": analytics_data['segmentation']['at_risk_customers'],
                    "expansion_opportunities": analytics_data['segmentation']['expansion_opportunities'],
                    "low_engagement": analytics_data['segmentation']['low_engagement_customers'],
                    "upcoming_renewals": analytics_data['segmentation']['upcoming_renewals']
                },
                "generated_at": datetime.now().isoformat(),
                "analyst": authenticated_user.get('name', 'Customer Success Manager')
            }
        }
        
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="Google Genai library not installed. Please install with: pip install google-genai"
        )
    except Exception as e:
        logger.error(f"Error generating analytics insights: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate analytics insights: {str(e)}"
        )

@router.get("/portfolio-metrics")
async def get_portfolio_metrics(authenticated_user: dict = Depends(verify_auth_token)) -> Dict:
    """Get quick portfolio metrics without AI analysis"""
    
    try:
        raw_data = get_comprehensive_analytics_data()
        analytics_data = process_analytics_data(raw_data)
        
        if "error" in analytics_data:
            return {"error": "No customer data available"}
        
        return {
            "status": "success",
            "metrics": analytics_data
        }
        
    except Exception as e:
        logger.error(f"Error getting portfolio metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 