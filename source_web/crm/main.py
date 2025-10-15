"""Main FastAPI application for CRM Service."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import configuration
from config.settings import settings
from config.constants import API_PREFIX

# Import routers
from routers.email_router import router as email_router
from routers.analytics_router import router as analytics_router
from routers.crm_data_router import router as data_router
from routers.interaction_router import router as interaction_router
from routers.gmail_sync_router import router as gmail_router
from routers.outlook_sync_router import router as outlook_router
from routers.permission_router import router as permission_router
from routers.customer_router import router as customer_router
from routers.upload_router import router as upload_router
from routers.notes_router import router as notes_router
from routers.meetings_router import router as meetings_router
from routers.oauth_token_router import router as oauth_token_router
from routers.scheduled_jobs_router import router as scheduled_jobs_router
from routers.call_summary_router import router as call_summary_router

# Initialize auth
from auth.providers import init_auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME}...")

    # Initialize authentication
    try:
        init_auth(
            settings.GOOGLE_CLIENT_ID,
            settings.GOOGLE_CLIENT_SECRET,
            settings.JWT_SECRET,
            microsoft_client_id=settings.MICROSOFT_CLIENT_ID,
            microsoft_client_secret=settings.MICROSOFT_CLIENT_SECRET,
            microsoft_tenant_id=settings.MICROSOFT_TENANT_ID
        )
        logger.info("Authentication system initialized (Google + Microsoft)")
    except Exception as e:
        logger.error(f"Failed to initialize auth: {e}")

    logger.info("💡 Interaction summaries are triggered by Google Cloud Scheduler")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}...")

# Create FastAPI app with lifespan management
app = FastAPI(
    title=settings.APP_NAME,
    description="Customer Relationship Management service with AI-powered features and automated summary generation",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Authentication is now handled in lifespan function

# Include routers
app.include_router(email_router, prefix=API_PREFIX, tags=["Emails"])
app.include_router(analytics_router, prefix=API_PREFIX, tags=["Analytics"])
app.include_router(data_router, prefix=API_PREFIX, tags=["CRM Data"])
app.include_router(interaction_router, prefix=API_PREFIX, tags=["Interactions"])
app.include_router(gmail_router, prefix=API_PREFIX, tags=["Gmail Sync"])
app.include_router(outlook_router, prefix=API_PREFIX, tags=["Outlook Sync"])
app.include_router(permission_router, prefix=API_PREFIX, tags=["Permissions"])
app.include_router(customer_router, prefix=API_PREFIX, tags=["Customers"])
app.include_router(upload_router, prefix=API_PREFIX + "/upload", tags=["Customer Upload"])
app.include_router(notes_router, prefix=API_PREFIX, tags=["Notes"])
app.include_router(meetings_router, prefix=API_PREFIX, tags=["Meetings & Calendar"])
app.include_router(oauth_token_router, tags=["OAuth Tokens"])
app.include_router(scheduled_jobs_router, prefix=API_PREFIX, tags=["Scheduled Jobs"])
app.include_router(call_summary_router, prefix=API_PREFIX, tags=["Call Summaries"])


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "endpoints": {
            "customers": f"{API_PREFIX}/customers",
            "analytics": f"{API_PREFIX}/generate-analytics-insights",
            "emails": f"{API_PREFIX}/generate-email",
            "interactions": f"{API_PREFIX}/interaction-summaries",
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "prelude-crm"}


if __name__ == "__main__":
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info(f"API Documentation: http://localhost:{settings.PORT}/docs")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
