import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import json
from functools import wraps
from auth.providers import verify_auth_token

# Fix Unicode issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Import local database router
from data.database_router import get_database_config_for_user, get_database_for_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple in-memory cache for CRM data
_cache = {}
CACHE_TIMEOUT = 300  # 5 minutes in seconds

def cache_key(func_name: str, **kwargs) -> str:
    """Generate a cache key from function name and parameters"""
    # Sort kwargs to ensure consistent key generation
    sorted_kwargs = sorted(kwargs.items())
    key_parts = [func_name] + [f"{k}={v}" for k, v in sorted_kwargs]
    return ":".join(str(part) for part in key_parts)

def cached(timeout: int = CACHE_TIMEOUT):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key = cache_key(func.__name__, **kwargs)
            
            # Check if we have cached data
            if key in _cache:
                cached_data, timestamp = _cache[key]
                if datetime.now().timestamp() - timestamp < timeout:
                    logger.debug(f"Using cached CRM data for: {func.__name__}")
                    return cached_data
                else:
                    # Remove expired cache entry
                    del _cache[key]
            
            # Execute function and cache result
            logger.debug(f"Fetching fresh CRM data for: {func.__name__}")
            result = await func(*args, **kwargs)
            
            # Cache the result
            _cache[key] = (result, datetime.now().timestamp())
            
            # Limit cache size to prevent memory issues
            if len(_cache) > 100:
                # Remove oldest entries
                oldest_key = min(_cache.keys(), key=lambda k: _cache[k][1])
                del _cache[oldest_key]
            
            return result
        return wrapper
    return decorator

def clear_cache(pattern: str = None):
    """Clear cache entries. If pattern is provided, only clear matching keys."""
    global _cache
    if pattern:
        keys_to_delete = [key for key in _cache.keys() if pattern in key]
        for key in keys_to_delete:
            del _cache[key]
        logger.debug(f"Cleared {len(keys_to_delete)} CRM cache entries matching '{pattern}'")
    else:
        _cache.clear()
        logger.debug("Cleared all CRM cache entries")

# Database configuration
def load_db_mapping():
    """Load database mapping configuration from YAML file"""
    import yaml
    mapping_path = os.path.join(os.path.dirname(__file__), '.', 'mapping.yaml')
    try:
        with open(mapping_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        logger.error(f"Failed to load database mapping: {e}")
        return None

def get_db_name_for_email(email=None):
    """Get database name for given email using the database router"""
    if not email:
        # When auth is disabled or email not provided, use postgres default
        logger.warning("No email provided for database routing, using default 'postgres'")
        return 'postgres'
    
    try:
        # Use the new database router
        db_name = get_database_for_user(email)
        logger.info(f"Database router returned '{db_name}' for email '{email}'")
        return db_name
    except Exception as e:
        logger.error(f"Database router failed for email '{email}': {e}")
        # Fallback to old YAML mapping system
        mapping = load_db_mapping()
        if not mapping:
            return 'postgres'
        
        # Check user-specific mapping
        db_name = mapping.get('mappings', {}).get(email)
        if db_name:
            return db_name
        
        # Return default database if no mapping found
        return mapping.get('default', {}).get('database', 'postgres')

def get_db_config(email=None):
    """Get database configuration with dynamic database name based on user email"""
    # Note: In future, email will come from auth token
    # For now, fallback to environment variables if no email provided
    
    if email:
        try:
            # Use database router for user-specific configuration
            config = get_database_config_for_user(email)
            logger.info(f"DATABASE_ROUTER CONFIG: Using user-specific config for {email}: {config['database']}")
            return config
        except Exception as e:
            logger.error(f"Database router config failed for {email}: {e}")
            # Fall through to default configuration
    
    # Fallback to environment variables
    fallback_config = {
        'host': os.getenv('SESSIONS_DB_HOST'),
        'port': int(os.getenv('SESSIONS_DB_PORT')),
        'database': os.getenv('SESSIONS_DB_NAME'),
        'user': os.getenv('SESSIONS_DB_USER'),
        'password': os.getenv('SESSIONS_DB_PASSWORD')
    }
    
    logger.info(f"DATABASE_ROUTER CONFIG: Using fallback config, database: {fallback_config['database']}")
    print(f"DATABASE_ROUTER CONFIG: Using fallback config, database: {fallback_config['database']}")
    return fallback_config

def get_db_connection(email=None):
    """Get database connection with optional user email for routing"""
    try:
        config = get_db_config(email)
        
        # Add debug message for browser console
        if email:
            logger.info(f"DATABASE_ROUTER: User '{email}' connecting to database '{config['database']}'")
        else:
            logger.info(f"DATABASE_ROUTER: Anonymous user connecting to database '{config['database']}'")
        
        conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Pydantic models
class Customer(BaseModel):
    id: int
    company: str
    primaryContact: str
    email: str
    phone: Optional[str] = ""
    industry: Optional[str] = ""
    location: Optional[str] = ""
    website: Optional[str] = ""
    status: str
    clientType: str
    arr: Optional[float] = 0
    contractValue: Optional[float] = 0
    monthlyValue: Optional[float] = 0
    renewalDate: Optional[str] = ""
    healthScore: Optional[float] = 75
    churnRisk: Optional[str] = "low"
    satisfactionScore: Optional[float] = 8.0
    expansionPotential: Optional[str] = "medium"
    productUsage: Optional[Dict] = {}
    tags: Optional[List[str]] = []
    recentActivities: Optional[List[Dict]] = []
    lastInteraction: Optional[str] = ""
    totalInteractions: Optional[int] = 0
    supportTickets: Optional[int] = 0
    onboardingComplete: Optional[bool] = True
    currentStage: Optional[str] = "active"
    progress: Optional[int] = 0
    renewalProbability: Optional[int] = 80
    expansionProbability: Optional[int] = 60
    lastContactDate: Optional[str] = ""
    productUsagePercentage: Optional[int] = 85
    funnelStage: str = "qualified"
    nextFollowUp: Optional[str] = ""
    recent_notes: str = ""
    recent_timeline: str = ""

    assignedEmployeeId: Optional[int] = None
    assignedEmployeeName: Optional[str] = None

class DashboardStats(BaseModel):
    totalCustomers: int
    activeCustomers: int
    atRiskCustomers: int
    totalArr: float
    totalContractValue: float
    averageHealthScore: float
    averageSatisfactionScore: float
    newCustomersThisMonth: int
    churnRate: float
    expansionOpportunities: int
    supportTicketsOpen: int

class InteractionSummary(BaseModel):
    id: int
    customerId: int
    type: str
    content: str
    employeeName: str
    employeeRole: str
    employeeDepartment: Optional[str] = None
    createdAt: str
    updatedAt: Optional[str] = None
    duration: Optional[int] = None
    outcome: Optional[str] = None
    subject: Optional[str] = None
    gmailMessageId: Optional[str] = None
    theme: Optional[str] = None
    source: Optional[str] = None
    sourceName: Optional[str] = None
    sourceType: Optional[str] = None

class CreateCustomerRequest(BaseModel):
    name: str
    primary_contact: str
    email: str
    phone: Optional[str] = ""
    industry: Optional[str] = "Business"
    location: Optional[str] = ""
    website: Optional[str] = ""
    preferred_language: Optional[str] = "en"
    source: Optional[str] = "website"
    status: Optional[str] = "active"
    notes: Optional[str] = ""
    client_type: Optional[str] = "lead"  # 'lead' or 'customer'
    
    # Optional fields for clients_details
    contract_value: Optional[float] = 0.0
    monthly_value: Optional[float] = 0.0
    renewal_date: Optional[str] = None  # YYYY-MM-DD format
    health_score: Optional[float] = 75.0
    churn_risk: Optional[str] = "low"
    satisfaction_score: Optional[float] = 80.0
    expansion_potential: Optional[str] = "medium"
    status: Optional[str] = "active"  # Customer status in clients_details: 'active', 'inactive', 'lost'
    progress: Optional[int] = 0
    contact_birthday: Optional[str] = None  # YYYY-MM-DD format

class UpdateCustomerRequest(BaseModel):
    """Model for updating customer fields - all fields are optional"""
    # clients_info fields
    company: Optional[str] = None
    primaryContact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    preferred_language: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    clientType: Optional[str] = None

    # clients_details fields
    status: Optional[str] = None  # MOVED: status is now in clients_details, not clients_info
    contractValue: Optional[float] = None
    monthlyValue: Optional[float] = None
    renewalDate: Optional[str] = None  # YYYY-MM-DD format
    healthScore: Optional[float] = None
    churnRisk: Optional[str] = None
    satisfactionScore: Optional[float] = None
    expansionPotential: Optional[str] = None
    currentStage: Optional[str] = None
    progress: Optional[int] = None
    contactBirthday: Optional[str] = None  # YYYY-MM-DD format

class Deal(BaseModel):
    """Deal model for API responses"""
    deal_id: int
    deal_name: str
    description: Optional[str] = None
    value_usd: Optional[float] = None
    stage: str
    employee_id: int
    client_id: int
    created_at: str
    updated_at: str
    completion_time: Optional[str] = None
    last_contact_date: Optional[str] = None
    expected_close_date: Optional[str] = None
    # Additional computed fields for frontend
    salesman_name: Optional[str] = None
    client_name: Optional[str] = None

class CreateDealRequest(BaseModel):
    """Model for creating new deals"""
    deal_name: str
    description: Optional[str] = None
    value_usd: Optional[float] = 0.0
    stage: str = "Opportunity"
    employee_id: Optional[int] = None  # Made optional - can be assigned later
    client_id: int
    expected_close_date: Optional[str] = None  # YYYY-MM-DD format

class UpdateDealRequest(BaseModel):
    """Model for updating deal fields - all fields are optional"""
    deal_name: Optional[str] = None
    description: Optional[str] = None
    value_usd: Optional[float] = None
    stage: Optional[str] = None
    employee_id: Optional[int] = None
    client_id: Optional[int] = None
    expected_close_date: Optional[str] = None  # YYYY-MM-DD format
    last_contact_date: Optional[str] = None

def safe_json_loads(json_str, default=None):
    """Safely parse JSON string"""
    if json_str is None:
        return default or {}
    try:
        if isinstance(json_str, str):
            return json.loads(json_str)
        return json_str
    except (json.JSONDecodeError, TypeError):
        return default or {}

@router.get("/dashboard/stats")
@cached(timeout=180)  # Cache for 3 minutes (dashboard data should be more fresh)
async def get_dashboard_stats(authenticated_user: dict = Depends(verify_auth_token)) -> DashboardStats:
    """Get CRM dashboard statistics from real database data"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get comprehensive stats with JOINs
        stats_query = """
        SELECT
            COUNT(ci.client_id) as total_customers,
            COUNT(CASE WHEN cd.status = 'active' THEN 1 END) as active_customers,
            COUNT(CASE WHEN cd.churn_risk = 'high' OR cd.status = 'at-risk' THEN 1 END) as at_risk_customers,
            COALESCE(SUM(cd.lifetime_value), 0) as total_contract_value,
            COALESCE(AVG(cd.health_score), 75) as avg_health_score,
            COALESCE(AVG(cd.satisfaction_score), 8) as avg_satisfaction_score,
            COUNT(CASE WHEN ci.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_customers_month,
            COALESCE(SUM(cd.support_tickets), 0) as total_support_tickets
        FROM clients_info ci
        LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
        """
        
        cursor.execute(stats_query)
        stats = cursor.fetchone()
        
        # Calculate churn rate (mock calculation based on at-risk customers)
        churn_rate = (stats['at_risk_customers'] / max(stats['total_customers'], 1)) * 100
        
        cursor.close()
        conn.close()
        
        return DashboardStats(
            totalCustomers=stats['total_customers'],
            activeCustomers=stats['active_customers'],
            atRiskCustomers=stats['at_risk_customers'],
            totalArr=float(stats['total_arr'] or 0),
            totalContractValue=float(stats['total_contract_value'] or 0),
            averageHealthScore=float(stats['avg_health_score'] or 75),
            averageSatisfactionScore=float(stats['avg_satisfaction_score'] or 8),
            newCustomersThisMonth=stats['new_customers_month'],
            churnRate=round(churn_rate, 1),
            expansionOpportunities=stats['expansion_opportunities'],
            supportTicketsOpen=stats['total_support_tickets']
        )
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers")
@cached(timeout=300)  # Cache for 5 minutes
async def get_all_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    industry: Optional[str] = None,
    churn_risk: Optional[str] = None,
    authenticated_user: dict = Depends(verify_auth_token)
) -> List[Customer]:
    """Get all customers with optional filtering and search"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build WHERE conditions based on filters
        where_conditions = []
        params = []
        
        if search:
            search_pattern = f"%{search}%"
            where_conditions.append("""
                (LOWER(ci.name) LIKE LOWER(%s) OR 
                 LOWER(ci.primary_contact) LIKE LOWER(%s) OR 
                 LOWER(ci.email) LIKE LOWER(%s) OR 
                 ci.phone LIKE %s OR 
                 LOWER(ci.industry) LIKE LOWER(%s) OR 
                 LOWER(ci.notes) LIKE LOWER(%s))
            """)
            params.extend([search_pattern] * 6)
        
        if status:
            where_conditions.append("cd.status = %s")
            params.append(status)
        
        if industry:
            where_conditions.append("LOWER(ci.industry) LIKE LOWER(%s)")
            params.append(f"%{industry}%")
        
        if churn_risk:
            where_conditions.append("cd.churn_risk = %s")
            params.append(churn_risk)
        
        # Build the final query
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        query = f"""
        SELECT 
            ci.client_id,
            ci.name,
            ci.primary_contact,
            ci.email,
            ci.phone,
            ci.industry,
            ci.location,
            ci.website,
            ci.preferred_language,
            ci.source,
            cd.status,
            ci.notes,
            ci.created_at,
            ci.updated_at,
            cd.lifetime_value as contract_value,
            cd.monthly_recurring_revenue as monthly_value,
            cd.renewal_date,
            cd.health_score,
            cd.churn_risk,
            cd.satisfaction_score,
            cd.upsell_potential as expansion_potential,
            cd.product_usage,
            cd.tags,
            cd.recent_activities,
            cd.last_interaction,
            cd.total_interactions,
            cd.support_tickets,
            cd.onboarding_complete,
            cd.status,
            cd.progress,
            ecl.employee_id as assigned_employee_id,
            ei.name as assigned_employee_name
        FROM clients_info ci
        LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
        LEFT JOIN LATERAL (
            SELECT employee_id, client_id
            FROM employee_client_links
            WHERE client_id = ci.client_id
            ORDER BY assigned_at DESC
            LIMIT 1
        ) ecl ON true
        LEFT JOIN employee_info ei ON ecl.employee_id = ei.employee_id
        ORDER BY ci.created_at DESC
        """
        
        cursor.execute(query, params if params else None)
        customers_data = cursor.fetchall()
        
        customers = []
        for customer_data in customers_data:
            # Parse JSON fields safely
            product_usage = safe_json_loads(customer_data.get('product_usage'), {})
            tags = safe_json_loads(customer_data.get('tags'), [])
            recent_activities = safe_json_loads(customer_data.get('recent_activities'), [])
            
            # Calculate ARR from monthly value or use contract value
            arr = 0
            if customer_data.get('monthly_value'):
                arr = float(customer_data['monthly_value']) * 12
            elif customer_data.get('contract_value'):
                arr = float(customer_data['contract_value'])
            
            # Calculate product usage percentage
            product_usage_pct = 85  # Default
            if isinstance(product_usage, dict) and 'usage_percentage' in product_usage:
                product_usage_pct = int(product_usage.get('usage_percentage', 85))
            
            # Calculate probabilities based on health score and other factors
            health_score = customer_data.get('health_score') or 75
            renewal_prob = min(95, max(20, int(health_score * 1.2)))
            
            expansion_potential = customer_data.get('expansion_potential', 'medium')
            expansion_prob = {
                'very high': 90,
                'high': 75,
                'medium': 50,
                'low': 25,
                'very low': 10
            }.get(expansion_potential, 50)

            customer = Customer(
                id=customer_data['client_id'],
                company=customer_data['name'] or "Unknown Company",
                primaryContact=customer_data['primary_contact'] or "Unknown Contact",
                email=customer_data['email'] or "",
                phone=customer_data['phone'] or "",
                industry=customer_data['industry'] or "Business",
                location=customer_data['location'] or "",
                website=customer_data.get('website') or "",
                status=customer_data['status'] or "active",
                clientType="customer",  # Default value since client_type column doesn't exist
                arr=arr,
                contractValue=float(customer_data['contract_value'] or 0),
                monthlyValue=float(customer_data['monthly_value'] or 0),
                renewalDate=customer_data['renewal_date'].strftime("%Y-%m-%d") if customer_data.get('renewal_date') else "",
                healthScore=float(health_score),
                churnRisk=customer_data.get('churn_risk') or "low",
                satisfactionScore=float(customer_data.get('satisfaction_score') or 8.0),
                expansionPotential=expansion_potential,
                productUsage=product_usage,
                tags=tags if isinstance(tags, list) else [],
                recentActivities=recent_activities if isinstance(recent_activities, list) else [],
                lastInteraction=customer_data['last_interaction'].isoformat() if customer_data.get('last_interaction') else "",
                totalInteractions=customer_data.get('total_interactions') or 0,
                supportTickets=customer_data.get('support_tickets') or 0,
                onboardingComplete=customer_data.get('onboarding_complete') or True,
                currentStage=customer_data.get('status') or "active",
                progress=customer_data.get('progress') or 0,
                renewalProbability=renewal_prob,
                expansionProbability=expansion_prob,
                lastContactDate=customer_data['last_interaction'].strftime("%Y-%m-%d") if customer_data.get('last_interaction') else "",
                productUsagePercentage=product_usage_pct,
                funnelStage="qualified" if customer_data['status'] == 'active' else "lead",
                nextFollowUp=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                recent_notes=customer_data['notes'] or f"Customer in {customer_data['industry'] or 'business'} industry",
                recent_timeline=f"Last interaction: {customer_data['last_interaction'].strftime('%Y-%m-%d') if customer_data.get('last_interaction') else 'Never'}",
                assignedEmployeeId=customer_data.get('assigned_employee_id'),
                assignedEmployeeName=customer_data.get('assigned_employee_name')
            )
            customers.append(customer)
        
        cursor.close()
        conn.close()
        
        return customers
    except Exception as e:
        logger.error(f"Error getting customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers/{customer_id}")
async def get_customer_by_id(customer_id: int, authenticated_user: dict = Depends(verify_auth_token)) -> Customer:
    """Get specific customer by ID with complete details"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT
            ci.client_id,
            ci.name,
            ci.primary_contact,
            ci.email,
            ci.phone,
            ci.industry,
            ci.location,
            ci.website,
            ci.preferred_language,
            ci.source,
            cd.status,
            ci.notes,
            ci.created_at,
            ci.updated_at,
            cd.lifetime_value as contract_value,
            cd.monthly_recurring_revenue as monthly_value,
            cd.renewal_date,
            cd.health_score,
            cd.churn_risk,
            cd.satisfaction_score,
            cd.upsell_potential as expansion_potential,
            cd.product_usage,
            cd.tags,
            cd.recent_activities,
            cd.last_interaction,
            cd.total_interactions,
            cd.support_tickets,
            cd.onboarding_complete,
            cd.status,
            cd.progress
        FROM clients_info ci
        LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
        LEFT JOIN LATERAL (
            SELECT employee_id, client_id
            FROM employee_client_links
            WHERE client_id = ci.client_id
            AND status = 'active'
            ORDER BY assigned_at DESC
            LIMIT 1
        ) ecl ON true
        LEFT JOIN employee_info ei ON ecl.employee_id = ei.employee_id
        WHERE ci.client_id = %s
        """
        
        cursor.execute(query, (customer_id,))
        customer_data = cursor.fetchone()
        
        if not customer_data:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Parse JSON fields safely (same logic as get_all_customers)
        product_usage = safe_json_loads(customer_data.get('product_usage'), {})
        tags = safe_json_loads(customer_data.get('tags'), [])
        recent_activities = safe_json_loads(customer_data.get('recent_activities'), [])
        
        # Calculate ARR
        arr = 0
        if customer_data.get('monthly_value'):
            arr = float(customer_data['monthly_value']) * 12
        elif customer_data.get('contract_value'):
            arr = float(customer_data['contract_value'])
        
        # Calculate metrics
        product_usage_pct = 85
        if isinstance(product_usage, dict) and 'usage_percentage' in product_usage:
            product_usage_pct = int(product_usage.get('usage_percentage', 85))
        
        health_score = customer_data.get('health_score') or 75
        renewal_prob = min(95, max(20, int(health_score * 1.2)))
        
        expansion_potential = customer_data.get('expansion_potential', 'medium')
        expansion_prob = {
            'very high': 90, 'high': 75, 'medium': 50, 'low': 25, 'very low': 10
        }.get(expansion_potential, 50)
        
        customer = Customer(
            id=customer_data['client_id'],
            company=customer_data['name'] or "Unknown Company",
            primaryContact=customer_data['primary_contact'] or "Unknown Contact",
            email=customer_data['email'] or "",
            phone=customer_data['phone'] or "",
            industry=customer_data['industry'] or "Business",
            location=customer_data['location'] or "",
            status=customer_data['status'] or "active",
            clientType="customer",  # Default value since client_type column doesn't exist
            arr=arr,
            contractValue=float(customer_data['contract_value'] or 0),
            monthlyValue=float(customer_data['monthly_value'] or 0),
            renewalDate=customer_data['renewal_date'].strftime("%Y-%m-%d") if customer_data.get('renewal_date') else "",
            healthScore=float(health_score),
            churnRisk=customer_data.get('churn_risk') or "low",
            satisfactionScore=float(customer_data.get('satisfaction_score') or 8.0),
            expansionPotential=expansion_potential,
            productUsage=product_usage,
            tags=tags if isinstance(tags, list) else [],
            recentActivities=recent_activities if isinstance(recent_activities, list) else [],
            lastInteraction=customer_data['last_interaction'].isoformat() if customer_data.get('last_interaction') else "",
            totalInteractions=customer_data.get('total_interactions') or 0,
            supportTickets=customer_data.get('support_tickets') or 0,
            onboardingComplete=customer_data.get('onboarding_complete') or True,
            currentStage=customer_data.get('current_stage') or "active",
            progress=customer_data.get('progress') or 0,
            renewalProbability=renewal_prob,
            expansionProbability=expansion_prob,
            lastContactDate=customer_data['last_interaction'].strftime("%Y-%m-%d") if customer_data.get('last_interaction') else "",
            productUsagePercentage=product_usage_pct,
            funnelStage="qualified" if customer_data['status'] == 'active' else "lead",
            nextFollowUp=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            recent_notes=customer_data['notes'] or f"Customer in {customer_data['industry'] or 'business'} industry",
            recent_timeline=f"Last interaction: {customer_data['last_interaction'].strftime('%Y-%m-%d') if customer_data.get('last_interaction') else 'Never'}",
            assignedEmployeeId=customer_data.get('assigned_employee_id'),
            assignedEmployeeName=customer_data.get('assigned_employee_name')
        )
        
        cursor.close()
        conn.close()
        
        return customer
    except Exception as e:
        logger.error(f"Error getting customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers/{customer_id}/interactions")
@cached(timeout=180)  # Cache for 3 minutes
async def get_customer_interactions(customer_id: int, authenticated_user: dict = Depends(verify_auth_token)) -> List[InteractionSummary]:
    """Get interactions for a specific customer, filtered by authenticated user's employee_id"""
    try:
        # Extract user information and get employee_id
        user_email = authenticated_user.get('email', '')
        
        # Get employee information by email
        employee_id = None
        if user_email:
            try:
                employee_id = get_employee_id_by_email(user_email)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"Employee not found for email {user_email}, using all interactions")
                else:
                    raise e
        
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if employee_id:
            # Filter by specific employee
            query = """
                SELECT
                    i.interaction_id,
                    i.customer_id,
                    i.type,
                    i.content,
                    i.created_at,
                    i.updated_at,
                    i.gmail_message_id,
                    i.theme,
                    i.source,
                    e.name as employee_name,
                    e.role as employee_role,
                    e.department as employee_department,
                    -- Resolve source field to names
                    CASE
                        WHEN i.source IS NOT NULL AND i.source ~ '^[0-9]+$' THEN
                            COALESCE(
                                (SELECT c.name FROM clients_info c WHERE c.client_id = CAST(i.source AS INTEGER)),
                                (SELECT emp.name FROM employee_info emp WHERE emp.employee_id = CAST(i.source AS INTEGER)),
                                i.source
                            )
                        ELSE i.source
                    END as source_name,
                    -- Determine if source is customer or employee
                    CASE
                        WHEN i.source IS NOT NULL AND i.source ~ '^[0-9]+$' THEN
                            CASE
                                WHEN EXISTS (SELECT 1 FROM clients_info c WHERE c.client_id = CAST(i.source AS INTEGER)) THEN 'customer'
                                WHEN EXISTS (SELECT 1 FROM employee_info emp WHERE emp.employee_id = CAST(i.source AS INTEGER)) THEN 'employee'
                                ELSE 'unknown'
                            END
                        ELSE 'unknown'
                    END as source_type,
                    -- Add static metadata fields for enhanced timeline display (removed RANDOM for caching)
                    CASE
                        WHEN i.type = 'email' THEN 0
                        ELSE 0
                    END as attachments,
                    CASE
                        WHEN i.type = 'call' THEN 30
                        WHEN i.type = 'meeting' THEN 60
                        ELSE NULL
                    END as duration,
                    CASE
                        WHEN i.type = 'call' THEN 'Connected'
                        WHEN i.type = 'meeting' THEN 'Completed'
                        WHEN i.type = 'email' THEN 'Sent'
                        ELSE NULL
                    END as outcome,
                    -- Extract subject from content for emails (first 50 chars)
                    CASE
                        WHEN i.type = 'email' THEN LEFT(i.content, 50) || '...'
                        ELSE NULL
                    END as subject
                FROM interaction_details i
                LEFT JOIN employee_info e ON i.employee_id = e.employee_id
                WHERE i.customer_id = %s AND i.employee_id = %s
                ORDER BY i.created_at DESC
            """
            cursor.execute(query, (customer_id, employee_id))
        else:
            # Get all interactions if employee not found
            query = """
                SELECT
                    i.interaction_id,
                    i.customer_id,
                    i.type,
                    i.content,
                    i.created_at,
                    i.updated_at,
                    i.gmail_message_id,
                    i.theme,
                    i.source,
                    e.name as employee_name,
                    e.role as employee_role,
                    e.department as employee_department,
                    -- Resolve source field to names
                    CASE
                        WHEN i.source IS NOT NULL AND i.source ~ '^[0-9]+$' THEN
                            COALESCE(
                                (SELECT c.name FROM clients_info c WHERE c.client_id = CAST(i.source AS INTEGER)),
                                (SELECT emp.name FROM employee_info emp WHERE emp.employee_id = CAST(i.source AS INTEGER)),
                                i.source
                            )
                        ELSE i.source
                    END as source_name,
                    -- Determine if source is customer or employee
                    CASE
                        WHEN i.source IS NOT NULL AND i.source ~ '^[0-9]+$' THEN
                            CASE
                                WHEN EXISTS (SELECT 1 FROM clients_info c WHERE c.client_id = CAST(i.source AS INTEGER)) THEN 'customer'
                                WHEN EXISTS (SELECT 1 FROM employee_info emp WHERE emp.employee_id = CAST(i.source AS INTEGER)) THEN 'employee'
                                ELSE 'unknown'
                            END
                        ELSE 'unknown'
                    END as source_type,
                    -- Add static metadata fields for enhanced timeline display (removed RANDOM for caching)
                    CASE
                        WHEN i.type = 'email' THEN 0
                        ELSE 0
                    END as attachments,
                    CASE
                        WHEN i.type = 'call' THEN 30
                        WHEN i.type = 'meeting' THEN 60
                        ELSE NULL
                    END as duration,
                    CASE
                        WHEN i.type = 'call' THEN 'Connected'
                        WHEN i.type = 'meeting' THEN 'Completed'
                        WHEN i.type = 'email' THEN 'Sent'
                        ELSE NULL
                    END as outcome,
                    -- Extract subject from content for emails (first 50 chars)
                    CASE
                        WHEN i.type = 'email' THEN LEFT(i.content, 50) || '...'
                        ELSE NULL
                    END as subject
                FROM interaction_details i
                LEFT JOIN employee_info e ON i.employee_id = e.employee_id
                WHERE i.customer_id = %s
                ORDER BY i.created_at DESC
            """
            cursor.execute(query, (customer_id,))
        
        interactions_data = cursor.fetchall()
        
        interactions = []
        for interaction_data in interactions_data:
            interaction = InteractionSummary(
                id=interaction_data['interaction_id'],
                customerId=interaction_data['customer_id'],
                type=interaction_data['type'],
                content=interaction_data['content'],
                employeeName=interaction_data['employee_name'] or "Unknown Employee",
                employeeRole=interaction_data['employee_role'] or "Unknown Role",
                employeeDepartment=interaction_data.get('employee_department'),
                createdAt=interaction_data['created_at'].isoformat() if interaction_data['created_at'] else "",
                updatedAt=interaction_data['updated_at'].isoformat() if interaction_data.get('updated_at') else None,
                duration=interaction_data.get('duration'),
                outcome=interaction_data.get('outcome'),
                subject=interaction_data.get('subject'),
                gmailMessageId=interaction_data.get('gmail_message_id'),
                theme=interaction_data.get('theme'),
                source=interaction_data.get('source'),
                sourceName=interaction_data.get('source_name'),
                sourceType=interaction_data.get('source_type')
            )
            interactions.append(interaction)
        
        cursor.close()
        conn.close()
        
        if employee_id:
            logger.info(f"Found {len(interactions)} interactions for customer {customer_id} and employee {employee_id}")
        else:
            logger.info(f"Found {len(interactions)} interactions for customer {customer_id} (all employees)")
        
        return interactions
    except Exception as e:
        logger.error(f"Error getting interactions for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/interactions/recent")
async def get_recent_interactions(limit: int = 10, authenticated_user: dict = Depends(verify_auth_token)) -> List[InteractionSummary]:
    """Get recent interactions across all customers"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                i.interaction_id,
                i.customer_id,
                i.type,
                i.content,
                i.created_at,
                e.name as employee_name,
                e.role as employee_role,
                ci.name as customer_company
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            LEFT JOIN clients_info ci ON i.customer_id = ci.client_id
            ORDER BY i.created_at DESC
            LIMIT %s
        """
        
        cursor.execute(query, (limit,))
        interactions_data = cursor.fetchall()
        
        interactions = []
        for interaction_data in interactions_data:
            # Truncate content for summary
            content = interaction_data['content'][:150] + "..." if len(interaction_data['content']) > 150 else interaction_data['content']
            # Add company name to content for context
            content_with_context = f"[{interaction_data.get('customer_company', 'Unknown Company')}] {content}"
            
            interaction = InteractionSummary(
                id=interaction_data['interaction_id'],
                customerId=interaction_data['customer_id'],
                type=interaction_data['type'],
                content=content_with_context,
                employeeName=interaction_data['employee_name'] or "Unknown Employee",
                employeeRole=interaction_data['employee_role'] or "Unknown Role",
                createdAt=interaction_data['created_at'].isoformat() if interaction_data['created_at'] else ""
            )
            interactions.append(interaction)
        
        cursor.close()
        conn.close()
        
        return interactions
    except Exception as e:
        logger.error(f"Error getting recent interactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employees")
@cached(timeout=600)  # Cache for 10 minutes (employees change less frequently)
async def get_all_employees():
    """Get all employees"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                employee_id,
                name,
                role,
                department,
                email,
                phone,
                hire_date,
                availability,
                timezone
            FROM employee_info
            ORDER BY name
        """
        
        cursor.execute(query)
        employees = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(employee) for employee in employees]
    except Exception as e:
        logger.error(f"Error getting employees: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customers")
async def create_customer(customer_data: CreateCustomerRequest, authenticated_user: dict = Depends(verify_auth_token)) -> Customer:
    """Create a new customer in both clients_info and clients_details tables"""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"➕ CREATE customer request: user_email={user_email}, customer_name={customer_data.name}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Start transaction
        cursor.execute("BEGIN")

        # Generate client_id manually (since table doesn't have auto-increment)
        cursor.execute("SELECT COALESCE(MAX(client_id), 0) + 1 as next_id FROM clients_info")
        result = cursor.fetchone()
        client_id = result['next_id']

        logger.info(f"📝 Generated client_id: {client_id}")

        # Insert into clients_info table (status removed - now in clients_details)
        clients_info_query = """
            INSERT INTO clients_info (
                client_id, name, primary_contact, email, phone, industry, location,
                website, preferred_language, source, created_at, updated_at,
                notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """

        current_time = datetime.now()

        cursor.execute(clients_info_query, (
            client_id,
            customer_data.name,
            customer_data.primary_contact,
            customer_data.email,
            customer_data.phone,
            customer_data.industry,
            customer_data.location,
            customer_data.website,
            customer_data.preferred_language,
            customer_data.source,
            current_time,
            current_time,
            customer_data.notes
        ))
        
        # Default JSON structures
        default_product_usage = {
            "logins": 0,
            "features_used": 0,
            "active_users": 0
        }
        
        default_tags = ["new-customer"]
        
        default_recent_activities = {
            "activities": [{
                "type": "created", 
                "date": current_time.strftime("%Y-%m-%d"), 
                "description": "Customer record created"
            }]
        }
        
        default_negotiation_steps = [
            {"id": 1, "title": "Initial Contact", "description": "Reach out to client and schedule first meeting", "done": False, "order": 1},
            {"id": 2, "title": "Needs Assessment", "description": "Understand client requirements and pain points", "done": False, "order": 2},
            {"id": 3, "title": "Solution Presentation", "description": "Present tailored solution to client", "done": False, "order": 3},
            {"id": 4, "title": "Proposal Review", "description": "Review proposal with client and address concerns", "done": False, "order": 4},
            {"id": 5, "title": "Contract Negotiation", "description": "Negotiate final terms and pricing", "done": False, "order": 5},
            {"id": 6, "title": "Contract Signing", "description": "Finalize and sign contract", "done": False, "order": 6}
        ]
        
        # Insert into clients_details table
        clients_details_query = """
            INSERT INTO clients_details (
                client_id, lifetime_value, monthly_recurring_revenue, renewal_date, health_score,
                churn_risk, satisfaction_score, upsell_potential, product_usage,
                tags, recent_activities, last_interaction, total_interactions,
                support_tickets, onboarding_complete, negotiation_steps, created_at,
                updated_at, status, progress, contact_birthday
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        # Parse dates safely
        renewal_date = None
        if customer_data.renewal_date:
            try:
                renewal_date = datetime.strptime(customer_data.renewal_date, "%Y-%m-%d").date()
            except ValueError:
                pass
                
        contact_birthday = None
        if customer_data.contact_birthday:
            try:
                contact_birthday = datetime.strptime(customer_data.contact_birthday, "%Y-%m-%d").date()
            except ValueError:
                pass
        
        cursor.execute(clients_details_query, (
            client_id,
            customer_data.contract_value,
            customer_data.monthly_value,
            renewal_date,
            customer_data.health_score,
            customer_data.churn_risk,
            customer_data.satisfaction_score,
            customer_data.expansion_potential,
            json.dumps(default_product_usage),
            json.dumps(default_tags),
            json.dumps(default_recent_activities),
            current_time,  # last_interaction
            0,  # total_interactions
            0,  # support_tickets
            False,  # onboarding_complete
            json.dumps(default_negotiation_steps),
            current_time,
            current_time,
            customer_data.status,
            customer_data.progress,
            contact_birthday
        ))

        # ═══════════════════════════════════════════════════════════
        # AUTO-LINKING LOGIC: Link customer to creating employee
        # ═══════════════════════════════════════════════════════════
        assignment_status = "not_attempted"
        assigned_employee_id = None

        try:
            logger.info(f"🔗 Auto-linking triggered for customer {client_id} created by user: {user_email}")

            # Get employee_id for the authenticated user
            auto_assigned_id = get_employee_id_by_email_safe(user_email, user_email)

            if auto_assigned_id is not None:
                assigned_employee_id = auto_assigned_id

                # Determine client_type based on customer status
                # 'lead' or 'prospect' status → client_type = 'lead'
                # All other statuses → client_type = 'customer'
                client_type = 'lead' if customer_data.status.lower() in ['lead', 'prospect'] else 'customer'

                logger.info(f" Client type determined: '{client_type}' based on status '{customer_data.status}'")

                # Try to link customer to employee
                # Use try-catch approach instead of checking table existence
                # This is simpler and handles all edge cases
                try:
                    # Check if assignment already exists
                    check_query = """
                        SELECT * FROM employee_client_links
                        WHERE employee_id = %s AND client_id = %s
                    """
                    cursor.execute(check_query, (assigned_employee_id, client_id))
                    existing = cursor.fetchone()

                    if existing:
                        assignment_status = "already_linked"
                        logger.info(f"ℹ️ Customer {client_id} already linked to employee {assigned_employee_id} - skipping")
                    else:
                        # Insert into employee_client_links table
                        logger.info(f" Attempting to insert into employee_client_links: employee_id={assigned_employee_id}, client_id={client_id}, client_type={client_type}")

                        link_query = """
                            INSERT INTO employee_client_links (
                                employee_id, client_id, matched_score, assigned_at,
                                notes, matched_by, status, client_type
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """

                        cursor.execute(link_query, (
                            assigned_employee_id,
                            client_id,
                            None,  # matched_score = NULL (manual creation, not AI match)
                            current_time,
                            "Auto-assigned to creator",
                            "auto_assigned_to_creator",
                            "active",
                            client_type
                        ))

                        assignment_status = "linked_successfully"
                        logger.info(f" Customer {client_id} auto-linked to employee {assigned_employee_id} as '{client_type}'")

                except Exception as link_table_error:
                    # Table might not exist or other error
                    if 'does not exist' in str(link_table_error).lower():
                        assignment_status = "table_not_found"
                        logger.warning(f"⚠️ employee_client_links table not found - skipping auto-linking")
                    else:
                        # Re-raise to be caught by outer exception handler
                        raise
            else:
                # User not found in employee_info table
                assignment_status = "user_not_employee"
                logger.info(f" User {user_email} not found in employee_info - customer created without assignment")

        except Exception as link_error:
            # Log error but don't fail customer creation
            assignment_status = "linking_failed"
            import traceback
            logger.error(f"❌ Error during auto-linking (customer creation will continue): {link_error}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")

        # ═══════════════════════════════════════════════════════════
        # END AUTO-LINKING LOGIC
        # ═══════════════════════════════════════════════════════════

        # Commit transaction
        cursor.execute("COMMIT")

        # Log final result
        logger.info(f" Customer {client_id} created successfully | Assignment: {assignment_status} | Employee: {assigned_employee_id}")

        cursor.close()
        conn.close()

        # Clear cache since we added a new customer
        clear_cache("get_all_customers")
        clear_cache("get_dashboard_stats")

        # Return the created customer by fetching it
        return await get_customer_by_id(client_id, authenticated_user)
        
    except Exception as e:
        # Rollback on error
        try:
            cursor.execute("ROLLBACK")
            cursor.close()
            conn.close()
        except:
            pass
        
        logger.error(f"Error creating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/customers/{customer_id}")
async def update_customer(customer_id: int, update_data: UpdateCustomerRequest, authenticated_user: dict = Depends(verify_auth_token)) -> Customer:
    """Update a customer's information in both clients_info and clients_details tables"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Start transaction
        cursor.execute("BEGIN")
        
        # First check if customer exists
        cursor.execute("SELECT client_id FROM clients_info WHERE client_id = %s", (customer_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Build update queries for clients_info
        info_updates = []
        info_params = []
        
        # Map frontend field names to database column names (status removed - now in clients_details)
        info_field_mapping = {
            'company': 'name',
            'primaryContact': 'primary_contact',
            'email': 'email',
            'phone': 'phone',
            'industry': 'industry',
            'location': 'location',
            'website': 'website',
            'preferred_language': 'preferred_language',
            'source': 'source',
            'notes': 'notes'
        }

        for frontend_field, db_field in info_field_mapping.items():
            value = getattr(update_data, frontend_field, None)
            if value is not None:
                info_updates.append(f"{db_field} = %s")
                info_params.append(value)
                logger.info(f" Updating clients_info: {db_field} = {value}")

        if info_updates:
            info_updates.append("updated_at = %s")
            info_params.append(datetime.now())
            info_params.append(customer_id)

            info_query = f"""
                UPDATE clients_info
                SET {', '.join(info_updates)}
                WHERE client_id = %s
            """
            logger.info(f" With params: {info_params}")
            cursor.execute(info_query, info_params)
            logger.info(f" clients_info updated successfully")
        else:
            logger.info(f" No clients_info fields to update")

        # Build update queries for clients_details
        details_updates = []
        details_params = []
        
        details_field_mapping = {
            'status': 'status',  # Frontend sends 'status', maps to clients_details.status
            'contractValue': 'lifetime_value',
            'monthlyValue': 'monthly_recurring_revenue',
            'renewalDate': 'renewal_date',
            'healthScore': 'health_score',
            'churnRisk': 'churn_risk',
            'satisfactionScore': 'satisfaction_score',
            'expansionPotential': 'upsell_potential',
            'currentStage': 'status',  # Also accept currentStage for backwards compatibility
            'progress': 'progress',
            'contactBirthday': 'contact_birthday'
        }
        
        for frontend_field, db_field in details_field_mapping.items():
            value = getattr(update_data, frontend_field, None)
            if value is not None:
                # Handle date fields
                if frontend_field in ['renewalDate', 'contactBirthday'] and value:
                    try:
                        value = datetime.strptime(value, "%Y-%m-%d").date()
                    except ValueError:
                        value = None

                if value is not None:
                    details_updates.append(f"{db_field} = %s")
                    details_params.append(value)
                    logger.info(f"📝 Updating clients_details: {db_field} = {value}")

        if details_updates:
            details_updates.append("updated_at = %s")
            details_params.append(datetime.now())
            details_params.append(customer_id)

            details_query = f"""
                UPDATE clients_details
                SET {', '.join(details_updates)}
                WHERE client_id = %s
            """
            logger.info(f"🔍 Executing clients_details query: {details_query}")
            logger.info(f"🔍 With params: {details_params}")
            cursor.execute(details_query, details_params)
            logger.info(f" clients_details updated successfully")
        else:
            logger.info(f" No clients_details fields to update")

        # Commit transaction
        cursor.execute("COMMIT")
        logger.info(f" Transaction committed for customer {customer_id}")

        cursor.close()
        conn.close()

        # Clear relevant caches
        logger.info(f" Clearing caches for customer {customer_id}")
        clear_cache("get_all_customers")
        clear_cache("get_dashboard_stats")
        clear_cache(f"get_customer_by_id:{customer_id}")

        # Return the updated customer
        logger.info(f" Fetching updated customer {customer_id} to return")
        updated_customer = await get_customer_by_id(customer_id, authenticated_user)
        logger.info(f" Customer {customer_id} update completed successfully")
        return updated_customer

    except HTTPException:
        # Re-raise HTTP exceptions
        logger.error(f" HTTP exception during customer update: {customer_id}")
        raise
    except Exception as e:
        # Rollback on error
        logger.error(f" Error updating customer {customer_id}: {e}")
        logger.error(f" Stack trace:", exc_info=True)
        try:
            cursor.execute("ROLLBACK")
            cursor.close()
            conn.close()
            logger.info(f"🔄 Transaction rolled back")
        except:
            pass

        logger.error(f"Error updating customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, authenticated_user: dict = Depends(verify_auth_token)) -> Dict[str, Any]:
    """Delete a customer and all related data (cascade delete)"""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"🗑️  DELETE customer request: customer_id={customer_id}, user_email={user_email}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor()

        # First check if customer exists
        cursor.execute("SELECT client_id FROM clients_info WHERE client_id = %s", (customer_id,))
        result = cursor.fetchone()

        if not result:
            logger.warning(f"❌ Customer {customer_id} not found in database for user {user_email}")
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Delete from clients_info (will cascade to other tables)
        cursor.execute("DELETE FROM clients_info WHERE client_id = %s", (customer_id,))
        
        # Get the number of rows affected
        deleted_count = cursor.rowcount
        
        # Commit the transaction
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Clear cache since we deleted a customer
        clear_cache("get_all_customers")
        clear_cache("get_dashboard_stats")
        
        logger.info(f"Deleted customer {customer_id} successfully")
        
        return {
            "success": True,
            "message": f"Customer {customer_id} and all related data deleted successfully",
            "deleted_count": deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Rollback on error
        try:
            conn.rollback()
            cursor.close()
            conn.close()
        except:
            pass
        
        logger.error(f"Error deleting customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Employee and interaction database functions
def get_employee_id_by_email(email: str) -> int:
    """Get employee_id by email from employee_info table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT employee_id
            FROM employee_info
            WHERE email = %s
        """
        
        cursor.execute(query, (email,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Employee with email {email} not found")
        
        logger.info(f"Found employee_id {result['employee_id']} for email {email}")
        return result['employee_id']
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employee_id for email {email}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching employee information: {str(e)}")

def get_employee_info_by_email(email: str) -> dict:
    """Get employee information (name, role, department) by email from employee_info table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT name, role, department
            FROM employee_info
            WHERE email = %s
        """

        cursor.execute(query, (email,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if not result:
            raise HTTPException(status_code=404, detail=f"Employee with email {email} not found")

        logger.info(f"Found employee info for email {email}: {result['name']} - {result['role']}")
        return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employee info for email {email}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching employee information: {str(e)}")

def get_employee_id_by_email_safe(email: str, user_email: str = None) -> Optional[int]:
    """
    Get employee_id by email from employee_info table.
    Returns None if not found (safe version for auto-assignment).

    Args:
        email: Email to lookup
        user_email: Authenticated user's email for database routing

    Returns:
        employee_id if found, None otherwise
    """
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT employee_id
            FROM employee_info
            WHERE email = %s
        """

        cursor.execute(query, (email,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            logger.info(f" Auto-assignment: Found employee_id {result['employee_id']} for email {email}")
            return result['employee_id']
        else:
            logger.warning(f" Auto-assignment: No employee found for email {email}")
            return None

    except Exception as e:
        logger.error(f"❌ Error fetching employee_id for email {email}: {e}")
        return None

def get_customer_interactions_by_employee(customer_id: str, employee_id: int):
    """Get interactions for a specific customer and employee from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Convert customer_id to int for database query
        try:
            customer_id_int = int(customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer ID format")
        
        query = """
            SELECT 
                i.interaction_id,
                i.type,
                i.content,
                i.created_at,
                i.updated_at,
                e.name as employee_name,
                e.role as employee_role,
                e.department as employee_department
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            WHERE i.customer_id = %s AND i.employee_id = %s
            ORDER BY i.created_at DESC
        """
        
        cursor.execute(query, (customer_id_int, employee_id))
        interactions = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        logger.info(f"Found {len(interactions)} interactions for customer {customer_id} and employee {employee_id}")
        return [dict(interaction) for interaction in interactions]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interactions for customer {customer_id} and employee {employee_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching interactions: {str(e)}")

def get_customer_interactions_all(customer_id: str):
    """Get all interactions for a specific customer from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Convert customer_id to int for database query
        try:
            customer_id_int = int(customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer ID format")
        
        query = """
            SELECT 
                i.interaction_id,
                i.type,
                i.content,
                i.created_at,
                i.updated_at,
                e.name as employee_name,
                e.role as employee_role,
                e.department as employee_department
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            WHERE i.customer_id = %s
            ORDER BY i.created_at DESC
        """
        
        cursor.execute(query, (customer_id_int,))
        interactions = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        logger.info(f"Found {len(interactions)} interactions for customer {customer_id}")
        return [dict(interaction) for interaction in interactions]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interactions for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching interactions: {str(e)}")

def get_recent_customer_interactions(customer_id: str, days_back: int = 30):
    """Get recent interactions for a specific customer from database within the specified time period"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Convert customer_id to int for database query
        try:
            customer_id_int = int(customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer ID format")
        
        # Calculate date threshold
        cutoff_date = datetime.now() - timedelta(days=days_back)

        # Get all interactions for the customer within the time period (no employee filtering)
        query = """
            SELECT
                i.interaction_id,
                i.type,
                i.content,
                i.created_at,
                i.updated_at,
                e.name as employee_name,
                e.role as employee_role,
                e.department as employee_department,
                e.email as employee_email
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            WHERE i.customer_id = %s
            AND i.created_at >= %s
            ORDER BY i.created_at DESC
        """
        cursor.execute(query, (customer_id_int, cutoff_date))
        
        interactions = cursor.fetchall()
        
        cursor.close()
        conn.close()

        logger.info(f"Found {len(interactions)} total interactions for customer {customer_id} in last {days_back} days")
        return [dict(interaction) for interaction in interactions]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recent interactions for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching interactions: {str(e)}")

def get_interaction_summary_options(customer_id: str, employee_id: int = None):
    """Get available options for interaction summary generation"""
    try:
        customer_id_int = int(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    
    # Get interaction counts for different time periods
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        periods = [7, 30, 90, 180]
        period_counts = {}
        
        for days in periods:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            if employee_id:
                # Filter by specific employee
                query = """
                    SELECT COUNT(*) as count
                    FROM interaction_details 
                    WHERE customer_id = %s AND employee_id = %s AND created_at >= %s
                """
                cursor.execute(query, (customer_id_int, employee_id, cutoff_date))
            else:
                # Get all interactions
                query = """
                    SELECT COUNT(*) as count
                    FROM interaction_details 
                    WHERE customer_id = %s AND created_at >= %s
                """
                cursor.execute(query, (customer_id_int, cutoff_date))
            
            result = cursor.fetchone()
            period_counts[f"last_{days}_days"] = result['count'] if result else 0
        
        cursor.close()
        conn.close()
        
        return {
            "customer_id": customer_id_int,
            "available_periods": period_counts,
            "recommended_period": 30 if period_counts["last_30_days"] > 0 else 90
        }
        
    except Exception as e:
        logger.error(f"Error getting interaction summary options: {e}")
        return {
            "customer_id": customer_id_int,
            "available_periods": {"last_30_days": 0},
            "recommended_period": 30
        }

def get_comprehensive_customer_data(employee_id: int = None):
    """Get all customer data with interactions and detailed metrics, optionally filtered by employee"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build the interactions subquery based on employee filter
        if employee_id:
            interactions_subquery = """
                (SELECT json_agg(
                    json_build_object(
                        'type', interactions_ordered.type,
                        'content', interactions_ordered.content,
                        'created_at', interactions_ordered.created_at,
                        'employee_name', interactions_ordered.employee_name,
                        'employee_role', interactions_ordered.employee_role
                    )
                )
                FROM (
                    SELECT 
                        i.type,
                        i.content,
                        i.created_at,
                        e.name as employee_name,
                        e.role as employee_role
                    FROM interaction_details i
                    LEFT JOIN employee_info e ON i.employee_id = e.employee_id
                    WHERE i.customer_id = ci.client_id AND i.employee_id = %s
                    ORDER BY i.created_at DESC
                    LIMIT 5
                ) interactions_ordered)
            """
        else:
            interactions_subquery = """
                (SELECT json_agg(
                    json_build_object(
                        'type', interactions_ordered.type,
                        'content', interactions_ordered.content,
                        'created_at', interactions_ordered.created_at,
                        'employee_name', interactions_ordered.employee_name,
                        'employee_role', interactions_ordered.employee_role
                    )
                )
                FROM (
                    SELECT 
                        i.type,
                        i.content,
                        i.created_at,
                        e.name as employee_name,
                        e.role as employee_role
                    FROM interaction_details i
                    LEFT JOIN employee_info e ON i.employee_id = e.employee_id
                    WHERE i.customer_id = ci.client_id
                    ORDER BY i.created_at DESC
                    LIMIT 5
                ) interactions_ordered)
            """
        
        # Get comprehensive customer data with interactions
        if employee_id:
            # Only get customers that have interactions with this specific employee
            query = f"""
            SELECT 
                ci.client_id,
                ci.name as company,
                ci.primary_contact,
                ci.email,
                ci.phone,
                ci.industry,
                ci.location,
                ci.created_at as customer_since,
                cd.lifetime_value as contract_value,
                cd.monthly_recurring_revenue as monthly_value,
                cd.renewal_date,
                cd.health_score,
                cd.churn_risk,
                cd.satisfaction_score,
                cd.last_interaction,
                cd.total_interactions,
                cd.support_tickets,
                cd.onboarding_complete,
                cd.status,
                cd.contact_birthday,
                -- Recent interactions
                COALESCE({interactions_subquery}, '[]'::json) as recent_interactions
            FROM clients_info ci
            LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
            WHERE EXISTS (
                SELECT 1 FROM interaction_details id 
                WHERE id.customer_id = ci.client_id 
                AND id.employee_id = %s
            )
            ORDER BY 
                CASE WHEN cd.churn_risk = 'high' THEN 1
                     WHEN cd.status = 'at-risk' THEN 2
                     WHEN cd.health_score < 60 THEN 3
                     ELSE 4 END,
                cd.lifetime_value DESC NULLS LAST
            """
        else:
            # Get all customers (original behavior)
            query = f"""
            SELECT 
                ci.client_id,
                ci.name as company,
                ci.primary_contact,
                ci.email,
                ci.phone,
                ci.industry,
                ci.location,
                cd.status,
                ci.created_at as customer_since,
                cd.lifetime_value as contract_value,
                cd.monthly_recurring_revenue as monthly_value,
                cd.renewal_date,
                cd.health_score,
                cd.churn_risk,
                cd.satisfaction_score,
                cd.last_interaction,
                cd.total_interactions,
                cd.support_tickets,
                cd.onboarding_complete,
                cd.status,
                cd.contact_birthday,
                -- Recent interactions
                COALESCE({interactions_subquery}, '[]'::json) as recent_interactions
            FROM clients_info ci
            LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
            WHERE cd.status IN ('active', 'at-risk')  -- Focus on active customers
            ORDER BY 
                CASE WHEN cd.churn_risk = 'high' THEN 1
                     WHEN cd.status = 'at-risk' THEN 2
                     WHEN cd.health_score < 60 THEN 3
                     ELSE 4 END,
                cd.lifetime_value DESC NULLS LAST
            """
        
        if employee_id:
            cursor.execute(query, (employee_id, employee_id))  # Pass employee_id twice - once for interactions, once for EXISTS
        else:
            cursor.execute(query)
            
        customers_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        if employee_id:
            logger.info(f"Found {len(customers_data)} customers with interactions for employee {employee_id}")
        else:
            logger.info(f"Found {len(customers_data)} customers with all interactions")
        
        return [dict(customer) for customer in customers_data]
        
    except Exception as e:
        logger.error(f"Error getting comprehensive customer data: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching customer data: {str(e)}")

# Gmail sync related database functions
def get_email_sync_state(employee_id: int = None):
    """Get email sync state from database for specific employee"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if employee_id:
            # First try to get existing sync state
            cursor.execute("""
                SELECT last_sync_timestamp, last_history_id, emails_synced_count
                FROM email_sync_state
                WHERE employee_id = %s
            """, (employee_id,))
            
            result = cursor.fetchone()
            
            if not result:
                # Create a new row with default values for this employee
                cursor.execute("""
                    INSERT INTO email_sync_state (employee_id, last_sync_timestamp, last_history_id, emails_synced_count)
                    VALUES (%s, NULL, NULL, 0)
                    ON CONFLICT (employee_id) DO NOTHING
                    RETURNING last_sync_timestamp, last_history_id, emails_synced_count
                """, (employee_id,))
                
                result = cursor.fetchone()
                conn.commit()
                
                # If RETURNING didn't work, fetch the newly created row
                if not result:
                    cursor.execute("""
                        SELECT last_sync_timestamp, last_history_id, emails_synced_count
                        FROM email_sync_state
                        WHERE employee_id = %s
                    """, (employee_id,))
                    result = cursor.fetchone()
        else:
            # Fallback to get sync state with NULL employee_id
            cursor.execute("""
                SELECT last_sync_timestamp, last_history_id, emails_synced_count
                FROM email_sync_state
                WHERE employee_id IS NULL
                LIMIT 1
            """)
            result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                'last_sync_timestamp': result[0],
                'last_history_id': result[1],
                'emails_synced_count': result[2] or 0
            }
        return None
    except Exception as e:
        logger.error(f"Error getting sync state: {e}")
        return None

def update_email_sync_state(history_id: str, emails_synced: int, employee_id: int = None):
    """Update email sync state in database for specific employee"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if employee_id is not None:
            # Use INSERT ... ON CONFLICT UPDATE for per-employee sync state
            cursor.execute("""
                INSERT INTO email_sync_state (employee_id, last_sync_timestamp, last_history_id, emails_synced_count)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (employee_id) 
                DO UPDATE SET
                    last_sync_timestamp = EXCLUDED.last_sync_timestamp,
                    last_history_id = EXCLUDED.last_history_id,
                    emails_synced_count = email_sync_state.emails_synced_count + EXCLUDED.emails_synced_count
            """, (employee_id, datetime.now(), history_id, emails_synced))
        else:
            # When employee_id is None, create a row with NULL employee_id
            cursor.execute("""
                INSERT INTO email_sync_state (employee_id, last_sync_timestamp, last_history_id, emails_synced_count)
                VALUES (NULL, %s, %s, %s)
                ON CONFLICT (employee_id) DO UPDATE SET
                    last_sync_timestamp = EXCLUDED.last_sync_timestamp,
                    last_history_id = EXCLUDED.last_history_id,
                    emails_synced_count = email_sync_state.emails_synced_count + EXCLUDED.emails_synced_count
            """, (datetime.now(), history_id, emails_synced))
        
        conn.commit()
        
    except Exception as e:
        logger.error(f"Error updating sync state: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_all_customer_emails() -> List[str]:
    """Get all customer emails from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT LOWER(email) FROM clients_info WHERE email IS NOT NULL AND email != ''")
        emails = [row[0] for row in cursor.fetchall() if row[0] and row[0].strip()]
        
        cursor.close()
        conn.close()
        
        return emails
    except Exception as e:
        logger.error(f"Error fetching customer emails: {e}")
        return []

def get_all_employee_emails() -> List[str]:
    """Get all employee emails from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT LOWER(email) FROM employee_info WHERE email IS NOT NULL AND email != ''")
        emails = [row[0] for row in cursor.fetchall() if row[0] and row[0].strip()]
        
        cursor.close()
        conn.close()
        
        return emails
    except Exception as e:
        logger.error(f"Error fetching employee emails: {e}")
        return []

def get_customer_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get customer info by email"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT client_id, name, email 
            FROM clients_info 
            WHERE LOWER(email) = LOWER(%s)
        """, (email,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            return {
                'client_id': result[0],
                'client_name': result[1],  # Changed from 'name' to 'client_name' to match gmail_sync.py
                'email': result[2]
            }
        return None
    except Exception as e:
        logger.error(f"Error fetching customer by email: {e}")
        return None

def get_employee_id_by_email_optional(email: str) -> Optional[int]:
    """Get employee_id by email from employee_info table without throwing exception if not found
    This is used for connected email scenarios where the employee might not exist
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT employee_id
            FROM employee_info
            WHERE LOWER(email) = LOWER(%s)
        """
        
        cursor.execute(query, (email,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            logger.info(f"No employee found for email {email}")
            return None
        
        logger.info(f"Found employee_id {result['employee_id']} for connected email {email}")
        return result['employee_id']
        
    except Exception as e:
        logger.error(f"Error fetching employee_id for email {email}: {e}")
        return None

def batch_create_email_interactions(email_batch: List[Dict[str, Any]], include_body: bool = False, synced_by_employee_id: Optional[int] = None) -> int:
    """
    Batch create interaction records from multiple emails efficiently.
    
    Args:
        email_batch: List of email records, each containing:
            - customer_id: The customer ID
            - email_data: Email data including from, to, subject, etc.
            - employee_id: Employee ID
        include_body: Whether to include email body
        synced_by_employee_id: Optional ID of manager/user who performed the sync
        
    Returns:
        Number of emails successfully inserted
    """
    if not email_batch:
        return 0
        
    conn = None
    cursor = None
    inserted_count = 0
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get next batch of interaction_ids
        cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 FROM interaction_details")
        next_id = cursor.fetchone()[0]
        
        # Prepare batch data
        interaction_records = []
        current_id = next_id
        
        for email_record in email_batch:
            try:
                customer_id = email_record['customer_id']
                email_data = email_record['email_data']
                employee_id = email_record.get('employee_id')
                
                # Prepare content
                subject = email_data.get('subject', 'No Subject')
                body = email_data.get('body', '')
                
                if include_body and body:
                    content = f"Subject: {subject}\n\n{body[:1000]}"  # Limit body to 1000 chars
                else:
                    content = f"Subject: {subject}"
                
                # Determine interaction direction and type
                from_email = email_data.get('from', '').lower()
                to_email = email_data.get('to', '').lower()
                
                # Get all employee emails for direction detection
                employee_emails = get_all_employee_emails()
                employee_email_set = {email.lower() for email in employee_emails}
                
                # Determine direction
                direction = 'received'  # Default
                if any(emp_email in from_email for emp_email in employee_email_set):
                    direction = 'sent'
                
                # Determine employee_id if not provided
                if employee_id is None:
                    if direction == 'sent':
                        # Try to find employee from sender
                        for emp_email in employee_email_set:
                            if emp_email in from_email:
                                try:
                                    employee_id = get_employee_id_by_email(emp_email)
                                    break
                                except:
                                    continue
                
                # Create interaction record tuple matching schema:
                # (interaction_id, customer_id, employee_id, type, content, gmail_message_id, created_at, updated_at, synced_by_employee_id)
                now = datetime.now()
                interaction_record = (
                    current_id,                        # interaction_id
                    customer_id,                       # customer_id
                    employee_id,                       # employee_id
                    'email',                          # type
                    content,                          # content
                    email_data.get('id', ''),         # gmail_message_id
                    now,                              # created_at
                    now,                              # updated_at
                    synced_by_employee_id             # synced_by_employee_id
                )
                interaction_records.append(interaction_record)
                current_id += 1
                
            except Exception as record_error:
                logger.error(f"Error preparing email record for batch insert: {record_error}")
                continue
        
        if not interaction_records:
            logger.warning("No valid email records to batch insert")
            return 0
        
        # Batch insert with ON CONFLICT DO NOTHING to handle duplicates
        insert_query = """
            INSERT INTO interaction_details (
                interaction_id, customer_id, employee_id, type, content, gmail_message_id, created_at, updated_at, synced_by_employee_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (gmail_message_id) DO NOTHING
        """
        
        # Execute batch insert using executemany for efficiency
        cursor.executemany(insert_query, interaction_records)
        
        # Get number of inserted rows
        inserted_count = cursor.rowcount
        
        conn.commit()
        logger.info(f"📦 Batch database insert: {inserted_count} emails inserted from {len(email_batch)} processed")
        
        return inserted_count
        
    except Exception as e:
        logger.error(f"Error in batch email creation: {e}")
        if conn:
            conn.rollback()
        return 0
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def create_email_interaction(customer_id: int, email_data: Dict[str, Any], include_body: bool = False, employee_id: Optional[int] = None, synced_by_employee_id: Optional[int] = None) -> bool:
    """Create interaction record from email
    
    Args:
        customer_id: The customer ID
        email_data: Email data including from, to, subject, etc.
        include_body: Whether to include email body
        employee_id: Optional employee ID (if not provided, will try to extract from sender email)
        synced_by_employee_id: Optional ID of manager/user who performed the sync
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Prepare content
        subject = email_data.get('subject', 'No Subject')
        body = email_data.get('body', '')
        
        if include_body and body:
            content = f"Subject: {subject}\n\n{body[:1000]}"  # Limit body to 1000 chars
        else:
            content = f"Subject: {subject}"
        
        # Get email date
        email_date = email_data.get('date')
        
        # Get next interaction_id
        cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 FROM interaction_details")
        next_id = cursor.fetchone()[0]
        logger.info(f"Generated next interaction_id: {next_id}")
        
        # Use provided employee_id or try to find from email
        if employee_id is None:
            # Try to find employee_id from the email
            from_field = email_data.get('from', '')
            logger.debug(f"Looking for employee from email: {from_field}")
            
            # Extract email address from "Name <email@domain.com>" format
            import re
            email_match = re.search(r'<([^>]+@[^>]+)>|([^\s,;<]+@[^\s,;<]+)', from_field)
            if email_match:
                from_email = email_match.group(1) or email_match.group(2)
                if from_email:
                    logger.debug(f"Searching for employee with email: {from_email}")
                    cursor.execute("SELECT employee_id FROM employee_info WHERE LOWER(email) = LOWER(%s)", (from_email.lower(),))
                    result = cursor.fetchone()
                    if result:
                        employee_id = result[0]
                        logger.debug(f"Found employee_id: {employee_id}")
                    else:
                        logger.debug(f"No employee found with email: {from_email}")
            
            # If no employee found, skip this email
            if not employee_id:
                logger.warning(f"No employee found for sender email: {from_field}. Skipping this email.")
                cursor.close()
                conn.close()
                return False
        else:
            logger.debug(f"Using provided employee_id: {employee_id}")
        
        # Log the values we're about to insert
        logger.info(f"Attempting to insert interaction: interaction_id={next_id}, customer_id={customer_id}, employee_id={employee_id}, gmail_message_id={email_data['id']}")
        
        # Insert interaction
        cursor.execute("""
            INSERT INTO interaction_details 
            (interaction_id, customer_id, employee_id, type, content, gmail_message_id, created_at, updated_at, synced_by_employee_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (gmail_message_id) DO NOTHING
        """, (
            next_id,
            customer_id,
            employee_id,
            'email',
            content,
            email_data['id'],
            email_date,
            datetime.now(),
            synced_by_employee_id
        ))
        
        inserted = cursor.rowcount > 0
        
        if inserted:
            logger.info(f"Successfully created email interaction {next_id} for customer {customer_id}")
        else:
            logger.info(f"Email interaction already exists for gmail_message_id: {email_data['id']}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return inserted
    except Exception as e:
        logger.error(f"Error creating email interaction: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

# CACHE MANAGEMENT ENDPOINT
@router.post("/admin/clear-cache")
async def clear_crm_cache(pattern: Optional[str] = None, authenticated_user: dict = Depends(verify_auth_token)) -> Dict[str, Any]:
    """Clear CRM cache entries. Optionally specify pattern to clear specific entries."""
    try:
        initial_count = len(_cache)
        clear_cache(pattern)
        final_count = len(_cache)
        cleared_count = initial_count - final_count
        
        return {
            "success": True,
            "message": f"Cache cleared successfully",
            "pattern": pattern,
            "entries_cleared": cleared_count,
            "remaining_entries": final_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# EMAIL PERMISSION MANAGEMENT FUNCTIONS

def can_user_sync_emails(employee_id: int, email: str = None) -> bool:
    """Check if employee can sync emails (must have manager permissions)"""
    try:
        conn = get_db_connection(email)
        cursor = conn.cursor()
        
        # Check if user has ANY email access permissions (making them a manager)
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM email_access_permissions 
                WHERE manager_employee_id = %s 
                AND is_active = true
                AND (expires_at IS NULL OR expires_at > NOW())
            )
        """, (employee_id,))
        
        result = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        logger.info(f"Email sync authorization check for employee {employee_id}: {'authorized' if result else 'not authorized'}")
        return result
        
    except Exception as e:
        logger.error(f"Error checking email sync authorization for employee {employee_id}: {e}")
        return False

def get_accessible_employees(manager_id: int, email: str = None) -> List[Dict]:
    """Get all employees a manager can access"""
    try:
        conn = get_db_connection(email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT DISTINCT e.employee_id, e.email, e.name, e.department, e.email_domain
            FROM employee_info e
            WHERE EXISTS (
                SELECT 1 FROM email_access_permissions p
                WHERE p.manager_employee_id = %s
                AND p.is_active = true
                AND (p.expires_at IS NULL OR p.expires_at > NOW())
                AND (
                    p.target_employee_id = e.employee_id OR              -- Individual access
                    p.department = e.department OR                        -- Department access  
                    (p.domain_pattern IS NOT NULL AND e.email_domain = LTRIM(p.domain_pattern, '@')) -- Domain access
                )
            )
            ORDER BY e.name
        """, (manager_id,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Error getting accessible employees for manager {manager_id}: {e}")
        return []

def has_email_access(manager_id: int, target_employee_id: int, email: str = None) -> bool:
    """Check if manager has permission to access employee's emails"""
    try:
        conn = get_db_connection(email)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM email_access_permissions p
                JOIN employee_info e ON e.employee_id = %s
                WHERE p.manager_employee_id = %s
                AND p.is_active = true
                AND (p.expires_at IS NULL OR p.expires_at > NOW())
                AND (
                    p.target_employee_id = %s OR
                    p.department = e.department OR
                    (p.domain_pattern IS NOT NULL AND e.email_domain = LTRIM(p.domain_pattern, '@'))
                )
            )
        """, (target_employee_id, manager_id, target_employee_id))
        
        result = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return result
        
    except Exception as e:
        logger.error(f"Error checking email access for manager {manager_id} and employee {target_employee_id}: {e}")
        return False

def create_email_permission(
    manager_employee_id: int, 
    permission_type: str = 'read_customer_related',
    target_employee_id: Optional[int] = None,
    department: Optional[str] = None,
    domain_pattern: Optional[str] = None,
    granted_by: Optional[int] = None,
    expires_at: Optional[datetime] = None,
    email: str = None
) -> bool:
    """Create a new email access permission"""
    try:
        # Validate that exactly one access type is provided
        access_types = [target_employee_id, department, domain_pattern]
        non_null_count = sum(1 for x in access_types if x is not None)
        
        if non_null_count != 1:
            logger.error("Exactly one of target_employee_id, department, or domain_pattern must be provided")
            return False
        
        conn = get_db_connection(email)
        cursor = conn.cursor()
        
        # Check if permission already exists and update, otherwise insert
        cursor.execute("""
            SELECT id FROM email_access_permissions 
            WHERE manager_employee_id = %s 
            AND COALESCE(target_employee_id, 0) = COALESCE(%s, 0)
            AND COALESCE(department, '') = COALESCE(%s, '')
            AND COALESCE(domain_pattern, '') = COALESCE(%s, '')
        """, (manager_employee_id, target_employee_id, department, domain_pattern))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing permission
            cursor.execute("""
                UPDATE email_access_permissions 
                SET permission_type = %s, granted_by = %s, expires_at = %s, 
                    is_active = true, granted_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (permission_type, granted_by, expires_at, existing[0]))
        else:
            # Insert new permission
            cursor.execute("""
                INSERT INTO email_access_permissions 
                (manager_employee_id, target_employee_id, department, domain_pattern, 
                 permission_type, granted_by, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (manager_employee_id, target_employee_id, department, domain_pattern, 
                  permission_type, granted_by, expires_at))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        access_type = "individual" if target_employee_id else ("department" if department else "domain")
        access_value = target_employee_id or department or domain_pattern
        logger.info(f"Created email permission: manager {manager_employee_id} can access {access_type} {access_value}")
        return True
        
    except Exception as e:
        logger.error(f"Error creating email permission: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def revoke_email_permission(permission_id: int, email: str = None) -> bool:
    """Revoke an email access permission by setting is_active to False"""
    try:
        conn = get_db_connection(email)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE email_access_permissions 
            SET is_active = false 
            WHERE id = %s
        """, (permission_id,))
        
        updated = cursor.rowcount > 0
        conn.commit()
        cursor.close()
        conn.close()
        
        if updated:
            logger.info(f"Revoked email permission {permission_id}")
        else:
            logger.warning(f"No permission found with id {permission_id}")
        
        return updated
        
    except Exception as e:
        logger.error(f"Error revoking email permission {permission_id}: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def get_manager_permissions(manager_id: int, email: str = None) -> List[Dict]:
    """Get all permissions for a manager"""
    try:
        conn = get_db_connection(email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                p.id,
                p.manager_employee_id,
                p.target_employee_id,
                te.name as target_employee_name,
                te.email as target_employee_email,
                p.department,
                p.domain_pattern,
                p.permission_type,
                p.granted_at,
                p.expires_at,
                p.is_active,
                gb.name as granted_by_name
            FROM email_access_permissions p
            LEFT JOIN employee_info te ON p.target_employee_id = te.employee_id
            LEFT JOIN employee_info gb ON p.granted_by = gb.employee_id
            WHERE p.manager_employee_id = %s
            ORDER BY p.granted_at DESC
        """, (manager_id,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Error getting manager permissions for manager {manager_id}: {e}")
        return []

def get_employee_managers(target_employee_id: int, email: str = None) -> List[Dict]:
    """Get all managers who can access a specific employee's emails"""
    try:
        conn = get_db_connection(email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT DISTINCT 
                m.employee_id as manager_id, 
                m.name as manager_name, 
                m.email as manager_email, 
                p.permission_type,
                p.granted_at,
                p.expires_at,
                CASE 
                    WHEN p.target_employee_id IS NOT NULL THEN 'individual'
                    WHEN p.department IS NOT NULL THEN 'department'
                    WHEN p.domain_pattern IS NOT NULL THEN 'domain'
                END as access_type
            FROM email_access_permissions p
            JOIN employee_info m ON m.employee_id = p.manager_employee_id
            JOIN employee_info e ON e.employee_id = %s
            WHERE p.is_active = true
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
            AND (
                p.target_employee_id = %s OR
                p.department = e.department OR
                (p.domain_pattern IS NOT NULL AND e.email_domain = LTRIM(p.domain_pattern, '@'))
            )
            ORDER BY p.granted_at DESC
        """, (target_employee_id, target_employee_id))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(row) for row in results]
        
    except Exception as e:
        logger.error(f"Error getting employee managers for employee {target_employee_id}: {e}")
        return []

# DEALS CRUD ENDPOINTS

@router.get("/deals")
@cached(timeout=300)  # Cache for 5 minutes
async def get_all_deals(authenticated_user: dict = Depends(verify_auth_token)) -> List[Deal]:
    """Get all deals with employee and client names"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            d.deal_id,
            d.deal_name,
            d.description,
            d.value_usd,
            d.stage,
            d.employee_id,
            d.client_id,
            d.created_at,
            d.updated_at,
            d.completion_time,
            d.last_contact_date,
            d.expected_close_date,
            e.name as salesman_name,
            c.name as client_name
        FROM deals d
        LEFT JOIN employee_info e ON d.employee_id = e.employee_id
        LEFT JOIN clients_info c ON d.client_id = c.client_id
        ORDER BY d.created_at DESC
        """
        
        cursor.execute(query)
        deals_data = cursor.fetchall()
        
        deals = []
        for deal_data in deals_data:
            deal = Deal(
                deal_id=deal_data['deal_id'],
                deal_name=deal_data['deal_name'] or "Untitled Deal",
                description=deal_data['description'] or "",
                value_usd=float(deal_data['value_usd']) if deal_data['value_usd'] else 0.0,
                stage=deal_data['stage'] or "qualification",
                employee_id=deal_data['employee_id'],
                client_id=deal_data['client_id'],
                created_at=deal_data['created_at'].isoformat() if deal_data.get('created_at') else "",
                updated_at=deal_data['updated_at'].isoformat() if deal_data.get('updated_at') else "",
                completion_time=deal_data['completion_time'].isoformat() if deal_data.get('completion_time') else None,
                last_contact_date=deal_data['last_contact_date'].strftime("%Y-%m-%d") if deal_data.get('last_contact_date') else None,
                expected_close_date=deal_data['expected_close_date'].strftime("%Y-%m-%d") if deal_data.get('expected_close_date') else None,
                salesman_name=deal_data['salesman_name'] or "Unknown Salesman",
                client_name=deal_data['client_name'] or "Unknown Client"
            )
            deals.append(deal)
        
        cursor.close()
        conn.close()
        
        return deals
    except Exception as e:
        logger.error(f"Error getting deals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deals/{deal_id}")
async def get_deal_by_id(deal_id: int, authenticated_user: dict = Depends(verify_auth_token)) -> Deal:
    """Get specific deal by ID with employee and client names"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            d.deal_id,
            d.deal_name,
            d.description,
            d.value_usd,
            d.stage,
            d.employee_id,
            d.client_id,
            d.created_at,
            d.updated_at,
            d.completion_time,
            d.last_contact_date,
            d.expected_close_date,
            e.name as salesman_name,
            c.name as client_name
        FROM deals d
        LEFT JOIN employee_info e ON d.employee_id = e.employee_id
        LEFT JOIN clients_info c ON d.client_id = c.client_id
        WHERE d.deal_id = %s
        """
        
        cursor.execute(query, (deal_id,))
        deal_data = cursor.fetchone()
        
        if not deal_data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        deal = Deal(
            deal_id=deal_data['deal_id'],
            deal_name=deal_data['deal_name'] or "Untitled Deal",
            description=deal_data['description'] or "",
            value_usd=float(deal_data['value_usd']) if deal_data['value_usd'] else 0.0,
            stage=deal_data['stage'] or "qualification",
            employee_id=deal_data['employee_id'],
            client_id=deal_data['client_id'],
            created_at=deal_data['created_at'].isoformat() if deal_data.get('created_at') else "",
            updated_at=deal_data['updated_at'].isoformat() if deal_data.get('updated_at') else "",
            completion_time=deal_data['completion_time'].isoformat() if deal_data.get('completion_time') else None,
            last_contact_date=deal_data['last_contact_date'].strftime("%Y-%m-%d") if deal_data.get('last_contact_date') else None,
            expected_close_date=deal_data['expected_close_date'].strftime("%Y-%m-%d") if deal_data.get('expected_close_date') else None,
            salesman_name=deal_data['salesman_name'] or "Unknown Salesman",
            client_name=deal_data['client_name'] or "Unknown Client"
        )
        
        cursor.close()
        conn.close()
        
        return deal
    except Exception as e:
        logger.error(f"Error getting deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deals")
async def create_deal(deal_data: CreateDealRequest, authenticated_user: dict = Depends(verify_auth_token)) -> Deal:
    """Create a new deal with automatic employee assignment"""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"➕ CREATE deal request: user_email={user_email}, deal_name={deal_data.deal_name}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Start transaction
        cursor.execute("BEGIN")

        # Generate deal_id manually (since table doesn't have auto-increment)
        cursor.execute("SELECT COALESCE(MAX(deal_id), 0) + 1 as next_id FROM deals")
        result = cursor.fetchone()
        deal_id = result['next_id']

        # ═══════════════════════════════════════════════════════════
        # AUTO-ASSIGNMENT LOGIC
        # ═══════════════════════════════════════════════════════════
        assigned_employee_id = deal_data.employee_id
        assignment_method = "manual"  # Track how assignment was made

        if assigned_employee_id is None:
            # No employee specified - auto-assign to authenticated user
            logger.info(f"🤖 Auto-assignment triggered for user: {user_email}")

            auto_assigned_id = get_employee_id_by_email_safe(user_email, user_email)

            if auto_assigned_id is not None:
                assigned_employee_id = auto_assigned_id
                assignment_method = "auto_assigned_to_creator"
                logger.info(f"✅ Deal auto-assigned to employee_id {assigned_employee_id} (creator: {user_email})")
            else:
                # User not found in employee_info table
                logger.warning(f"⚠️ Cannot auto-assign: User {user_email} not found in employee_info table")

                # CONFIGURABLE BEHAVIOR: Allow deal creation without assignment (NULL employee_id)
                assigned_employee_id = None
                assignment_method = "unassigned_user_not_found"
                logger.info(f"ℹ️ Deal will be created without assignment (employee_id = NULL)")
        else:
            # Employee explicitly specified by frontend (manual override)
            logger.info(f"👤 Manual assignment: employee_id {assigned_employee_id} specified by user {user_email}")
            assignment_method = "manual_override"

        # ═══════════════════════════════════════════════════════════
        # END AUTO-ASSIGNMENT LOGIC
        # ═══════════════════════════════════════════════════════════

        # Parse expected_close_date
        expected_close_date = None
        if deal_data.expected_close_date:
            try:
                expected_close_date = datetime.strptime(deal_data.expected_close_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        # Insert new deal
        current_time = datetime.now()

        cursor.execute("""
            INSERT INTO deals (
                deal_id, deal_name, description, value_usd, stage, employee_id, client_id,
                created_at, updated_at, expected_close_date
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            deal_id,
            deal_data.deal_name,
            deal_data.description,
            deal_data.value_usd,
            deal_data.stage,
            assigned_employee_id,  # ← CHANGED: Use auto-assigned or manual value
            deal_data.client_id,
            current_time,
            current_time,
            expected_close_date
        ))

        # Log successful assignment
        logger.info(f"✅ Deal {deal_id} created successfully | Assignment: {assignment_method} | Employee: {assigned_employee_id}")

        # Commit transaction
        cursor.execute("COMMIT")

        cursor.close()
        conn.close()

        # Clear cache since we added a new deal
        clear_cache("get_all_deals")

        # Return the created deal by fetching it
        return await get_deal_by_id(deal_id, authenticated_user)

    except Exception as e:
        # Rollback on error
        try:
            cursor.execute("ROLLBACK")
            cursor.close()
            conn.close()
        except:
            pass

        logger.error(f"❌ Error creating deal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/deals/{deal_id}")
async def update_deal(deal_id: int, update_data: UpdateDealRequest, authenticated_user: dict = Depends(verify_auth_token)) -> Deal:
    """Update a deal's information"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Start transaction
        cursor.execute("BEGIN")
        
        # First check if deal exists
        cursor.execute("SELECT deal_id FROM deals WHERE deal_id = %s", (deal_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Build update query
        updates = []
        params = []
        
        # Map all possible update fields
        field_mapping = {
            'deal_name': 'deal_name',
            'description': 'description',
            'value_usd': 'value_usd',
            'stage': 'stage',
            'employee_id': 'employee_id',
            'client_id': 'client_id',
            'expected_close_date': 'expected_close_date',
            'last_contact_date': 'last_contact_date'
        }
        
        for field_name, db_field in field_mapping.items():
            value = getattr(update_data, field_name, None)
            if value is not None:
                # Handle date fields
                if field_name in ['expected_close_date', 'last_contact_date'] and value:
                    try:
                        value = datetime.strptime(value, "%Y-%m-%d").date()
                    except ValueError:
                        value = None
                
                if value is not None:
                    updates.append(f"{db_field} = %s")
                    params.append(value)
        
        if updates:
            updates.append("updated_at = %s")
            params.append(datetime.now())
            params.append(deal_id)
            
            query = f"""
                UPDATE deals 
                SET {', '.join(updates)}
                WHERE deal_id = %s
            """
            cursor.execute(query, params)
        
        # Commit transaction
        cursor.execute("COMMIT")
        
        cursor.close()
        conn.close()
        
        # Clear relevant caches
        clear_cache("get_all_deals")
        clear_cache(f"get_deal_by_id:{deal_id}")
        
        # Return the updated deal
        return await get_deal_by_id(deal_id, authenticated_user)
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Rollback on error
        try:
            cursor.execute("ROLLBACK")
            cursor.close()
            conn.close()
        except:
            pass
        
        logger.error(f"Error updating deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update deal: {str(e)}")

@router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: int, authenticated_user: dict = Depends(verify_auth_token)) -> Dict[str, Any]:
    """Delete a deal"""
    try:
        user_email = authenticated_user.get('email', '')
        conn = get_db_connection(user_email)
        cursor = conn.cursor()
        
        # First check if deal exists
        cursor.execute("SELECT deal_id FROM deals WHERE deal_id = %s", (deal_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Delete the deal
        cursor.execute("DELETE FROM deals WHERE deal_id = %s", (deal_id,))
        
        # Get the number of rows affected
        deleted_count = cursor.rowcount
        
        # Commit the transaction
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Clear cache since we deleted a deal
        clear_cache("get_all_deals")
        
        logger.info(f"Deleted deal {deal_id} successfully")
        
        return {
            "success": True,
            "message": f"Deal {deal_id} deleted successfully",
            "deleted_count": deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Rollback on error
        try:
            conn.rollback()
            cursor.close()
            conn.close()
        except:
            pass
        
        logger.error(f"Error deleting deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# TEST ENDPOINTS
# ============================================================================

# DATABASE ROUTING TEST ENDPOINT
@router.get("/debug/database-routing")
async def test_database_routing(authenticated_user: dict = Depends(verify_auth_token)) -> Dict[str, Any]:
    """Test endpoint to demonstrate database routing based on user email"""
    user_email = authenticated_user.get('email', '')

    try:
        # Get user-specific database info
        from data.database_router import get_database_for_user, get_user_info

        db_name = get_database_for_user(user_email)
        user_info = get_user_info(user_email) if user_email else None

        # Create debug info
        debug_info = {
            "authenticated_user_email": user_email,
            "database_name": db_name,
            "routing_status": "SUCCESS" if user_info else "FALLBACK_TO_DEFAULT",
            "user_info": user_info,
            "timestamp": datetime.now().isoformat(),
            "message": f"User '{user_email}' is routed to database '{db_name}'"
        }

        # Print debug info to console (will show in browser console/logs)
        print(f"\n🔍 DATABASE ROUTING DEBUG:")
        print(f"   👤 User Email: {user_email}")
        print(f"   🗄️  Database: {db_name}")
        print(f"   📊 Status: {debug_info['routing_status']}")
        if user_info:
            print(f"   🏢 Company: {user_info['company']}")
            print(f"   👔 Role: {user_info['role']}")
            print(f"   📈 Level: {user_info['level']}")
        print(f"   🕐 Time: {debug_info['timestamp']}")

        logger.info(f"DATABASE ROUTING DEBUG: {debug_info}")

        return debug_info

    except Exception as e:
        logger.error(f"Database routing test failed: {e}")
        return {
            "authenticated_user_email": user_email,
            "error": str(e),
            "status": "ERROR",
            "timestamp": datetime.now().isoformat()
        }