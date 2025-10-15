"""
Scheduled Jobs Router - API endpoints for automated background jobs

This router provides HTTP endpoints that can be triggered by Google Cloud Scheduler.
Authentication is handled at the infrastructure level via OIDC tokens.

Endpoints:
- POST /scheduled-jobs/deal-stage-progression - Run deal stage progression analysis
- POST /scheduled-jobs/summary-batch - Run batch interaction summary generation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import logging
import asyncio
import os
from datetime import datetime

# Import services
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.deal_stage_progression_service import process_deal_stage_progression

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scheduled-jobs",
    tags=["Scheduled Jobs"]
)


@router.post("/deal-stage-progression")
async def trigger_deal_stage_progression(
    background_tasks: BackgroundTasks,
    batch_size: int = 10,
    days_lookback: int = 30,
    dry_run: bool = False
):
    """
    Trigger deal stage progression analysis.

    This endpoint runs the deal stage progression service which:
    1. Fetches all active deals (excluding Closed-Won and Closed-Lost)
    2. Analyzes recent emails and notes for each deal
    3. Uses AI to detect stage progression signals
    4. Updates deal stages when clear evidence is found

    **Authentication:**
    - Handled at infrastructure level via Cloud Run OIDC tokens
    - No authentication required in FastAPI code

    **Parameters:**
    - batch_size: Number of deals to process concurrently (default: 10)
    - days_lookback: Days to look back for communications (default: 30)
    - dry_run: If true, only log recommendations without updating database

    **Usage with Cloud Scheduler:**
    ```
    POST https://your-service.run.app/api/scheduled-jobs/deal-stage-progression
    Body:
      {
        "batch_size": 10,
        "days_lookback": 30,
        "dry_run": false
      }
    ```

    **Manual Testing:**
    ```bash
    curl -X POST "http://localhost:8003/api/scheduled-jobs/deal-stage-progression?dry_run=true" \\
         -H "Content-Type: application/json"
    ```

    **Returns:**
    - 200 OK: Job completed successfully (sync mode)
    - 500: Job execution failed
    """
    
    logger.info("=" * 80)
    logger.info("SCHEDULED JOB TRIGGERED: Deal Stage Progression")
    logger.info(f"Triggered at: {datetime.now()}")
    logger.info(f"Parameters: batch_size={batch_size}, days_lookback={days_lookback}, dry_run={dry_run}")
    logger.info("=" * 80)
    
    try:
        # Option 1: Run synchronously (wait for completion)
        # Good for: Small workloads, immediate feedback needed
        # Timeout: Cloud Run allows up to 60 minutes
        
        logger.info("Starting deal stage progression (synchronous mode)...")
        
        stats = await process_deal_stage_progression(
            batch_size=batch_size,
            days_lookback=days_lookback,
            dry_run=dry_run,
            user_email=None
        )
        
        logger.info("Deal stage progression completed successfully")
        
        return {
            "status": "completed",
            "message": "Deal stage progression completed successfully",
            "statistics": stats,
            "timestamp": datetime.now().isoformat(),
            "mode": "synchronous"
        }
        
        # Option 2: Run asynchronously (return immediately)
        # Uncomment this section if you want async mode
        """
        def run_job():
            asyncio.run(process_deal_stage_progression(
                batch_size=batch_size,
                days_lookback=days_lookback,
                dry_run=dry_run,
                user_email=None
            ))
        
        background_tasks.add_task(run_job)
        
        logger.info("Deal stage progression started in background")
        
        return {
            "status": "accepted",
            "message": "Deal stage progression job started in background",
            "timestamp": datetime.now().isoformat(),
            "mode": "asynchronous"
        }
        """
        
    except Exception as e:
        logger.error(f"Failed to run deal stage progression: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=500,
            detail=f"Job execution failed: {str(e)}"
        )


@router.get("/deal-stage-progression/status")
async def get_deal_stage_progression_status():
    """
    Get status of the deal stage progression service.

    This is a health check endpoint to verify the service is available.

    **Returns:**
    - Service status and configuration
    """
    return {
        "service": "deal-stage-progression",
        "status": "available",
        "description": "AI-powered deal stage progression analysis",
        "default_config": {
            "batch_size": 10,
            "days_lookback": 30,
            "ai_provider": "openai",
            "ai_model": "gpt-4o-mini"
        },
        "timestamp": datetime.now().isoformat()
    }


@router.post("/summary-batch")
async def trigger_summary_batch(
    test_mode: bool = False,
    max_customers: Optional[int] = None
):
    """
    Trigger batch interaction summary generation for all customers.

    This endpoint runs the automated summary generation service which:
    1. Fetches all customers requiring summary updates
    2. Generates AI-powered interaction summaries for each customer
    3. Caches summaries for fast retrieval
    4. Performs cleanup of old summaries

    **Authentication:**
    - Handled at infrastructure level via Cloud Run OIDC tokens
    - No authentication required in FastAPI code

    **Parameters:**
    - test_mode: Run in test mode with fewer customers (default: False)
    - max_customers: Optional limit on number of customers to process

    **Usage with Cloud Scheduler:**
    ```
    POST https://your-service.run.app/api/scheduled-jobs/summary-batch
    Body:
      {
        "test_mode": false,
        "max_customers": null
      }
    ```

    **Manual Testing:**
    ```bash
    curl -X POST "http://localhost:8003/api/scheduled-jobs/summary-batch?test_mode=true" \\
         -H "Content-Type: application/json"
    ```

    **Returns:**
    - Job execution result with status and statistics
    - 500: Job execution failed
    """
    logger.info("=" * 80)
    logger.info("SCHEDULED JOB TRIGGERED: Batch Summary Generation")
    logger.info(f"Triggered at: {datetime.now()}")
    logger.info(f"Parameters: test_mode={test_mode}, max_customers={max_customers}")
    logger.info("=" * 80)

    from services.interaction_summary_scheduler import summary_scheduler

    try:
        logger.info("Starting batch summary generation...")

        # Call the async method directly (we're already in an async context)
        await summary_scheduler._async_batch_generate_summaries(test_mode, max_customers)

        logger.info("Batch summary generation completed successfully")

        return {
            "status": "success",
            "message": "Batch summary generation completed successfully",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to run batch summary generation: {e}")
        import traceback
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=f"Batch job failed: {str(e)}"
        )




