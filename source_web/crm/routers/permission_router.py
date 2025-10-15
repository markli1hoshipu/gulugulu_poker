"""Permission management API for manager email access"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from enum import Enum

from auth.providers import verify_auth_token
from routers.crm_data_router import (
    get_accessible_employees,
    has_email_access,
    create_email_permission,
    revoke_email_permission,
    get_manager_permissions,
    get_employee_managers,
    get_employee_id_by_email,
    get_employee_info_by_email
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Enums and Models
class PermissionType(str, Enum):
    READ_ALL = "read_all"
    READ_CUSTOMER_RELATED = "read_customer_related"
    READ_NONE = "read_none"

class AccessType(str, Enum):
    INDIVIDUAL = "individual"
    DEPARTMENT = "department"
    DOMAIN = "domain"

class GrantPermissionRequest(BaseModel):
    """Request to grant email access permission"""
    manager_employee_id: int
    access_type: AccessType
    permission_type: PermissionType = PermissionType.READ_CUSTOMER_RELATED
    
    # Access type specific fields
    target_employee_id: Optional[int] = Field(None, description="For individual access")
    department: Optional[str] = Field(None, description="For department access")
    domain_pattern: Optional[str] = Field(None, description="For domain access (e.g., '@preludeos.com')")
    
    # Optional fields
    expires_at: Optional[datetime] = Field(None, description="Permission expiration date")
    notes: Optional[str] = Field(None, description="Notes about this permission")

class PermissionResponse(BaseModel):
    """Response model for permission operations"""
    success: bool
    message: str
    permission_id: Optional[int] = None

class PermissionInfo(BaseModel):
    """Information about a permission"""
    id: int
    manager_employee_id: int
    target_employee_id: Optional[int] = None
    target_employee_name: Optional[str] = None
    target_employee_email: Optional[str] = None
    department: Optional[str] = None
    domain_pattern: Optional[str] = None
    permission_type: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    granted_by_name: Optional[str] = None
    access_type: str

class EmployeeInfo(BaseModel):
    """Employee information"""
    employee_id: int
    name: str
    email: str
    department: Optional[str] = None
    email_domain: Optional[str] = None

class AccessibleEmployeesResponse(BaseModel):
    """Response for accessible employees"""
    manager_id: int
    manager_email: str
    accessible_employees: List[EmployeeInfo]
    total_accessible: int
    message: str

class ManagerInfo(BaseModel):
    """Manager information for employee access"""
    manager_id: int
    manager_name: str
    manager_email: str
    permission_type: str
    access_type: str
    granted_at: datetime
    expires_at: Optional[datetime] = None

# Permission Management Endpoints

@router.post("/permissions/grant")
async def grant_email_permission(
    request: GrantPermissionRequest,
    authenticated_user: dict = Depends(verify_auth_token)
) -> PermissionResponse:
    """Grant email access permission to a manager"""
    try:
        logger.info(f"Permission grant requested by user: {authenticated_user.get('email', 'unknown')}")
        
        # Get the requesting user's employee ID (they must be admin or have permission to grant)
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            granting_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Validate request based on access type
        if request.access_type == AccessType.INDIVIDUAL:
            if not request.target_employee_id:
                raise HTTPException(status_code=400, detail="target_employee_id is required for individual access")
        elif request.access_type == AccessType.DEPARTMENT:
            if not request.department:
                raise HTTPException(status_code=400, detail="department is required for department access")
        elif request.access_type == AccessType.DOMAIN:
            if not request.domain_pattern:
                raise HTTPException(status_code=400, detail="domain_pattern is required for domain access")
            # Ensure domain pattern starts with @
            if not request.domain_pattern.startswith('@'):
                request.domain_pattern = '@' + request.domain_pattern
        
        # Create the permission
        success = create_email_permission(
            manager_employee_id=request.manager_employee_id,
            permission_type=request.permission_type.value,
            target_employee_id=request.target_employee_id,
            department=request.department,
            domain_pattern=request.domain_pattern,
            granted_by=granting_employee_id,
            expires_at=request.expires_at
        )
        
        if success:
            # Determine access description for logging
            if request.access_type == AccessType.INDIVIDUAL:
                access_desc = f"employee {request.target_employee_id}"
            elif request.access_type == AccessType.DEPARTMENT:
                access_desc = f"department '{request.department}'"
            else:
                access_desc = f"domain '{request.domain_pattern}'"
            
            logger.info(f"Successfully granted {request.permission_type.value} permission to manager {request.manager_employee_id} for {access_desc}")
            
            return PermissionResponse(
                success=True,
                message=f"Successfully granted {request.permission_type.value} access to {access_desc}"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create permission")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error granting email permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/permissions/{permission_id}")
async def revoke_email_permission_endpoint(
    permission_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> PermissionResponse:
    """Revoke an email access permission"""
    try:
        logger.info(f"Permission revocation requested by user: {authenticated_user.get('email', 'unknown')} for permission {permission_id}")
        
        # Verify user is authenticated employee
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            revoking_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Revoke the permission
        success = revoke_email_permission(permission_id)
        
        if success:
            logger.info(f"Successfully revoked permission {permission_id}")
            return PermissionResponse(
                success=True,
                message=f"Successfully revoked permission {permission_id}"
            )
        else:
            raise HTTPException(status_code=404, detail="Permission not found or already inactive")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking email permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/manager/{manager_id}")
async def get_manager_permissions_endpoint(
    manager_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Get all permissions for a specific manager"""
    try:
        logger.info(f"Manager permissions requested for manager {manager_id} by user: {authenticated_user.get('email', 'unknown')}")
        
        # Get permissions
        permissions = get_manager_permissions(manager_id)
        
        # Convert to response format
        permission_list = []
        for perm in permissions:
            # Determine access type
            if perm['target_employee_id']:
                access_type = "individual"
            elif perm['department']:
                access_type = "department"
            elif perm['domain_pattern']:
                access_type = "domain"
            else:
                access_type = "unknown"
            
            permission_list.append(PermissionInfo(
                id=perm['id'],
                manager_employee_id=perm['manager_employee_id'],
                target_employee_id=perm['target_employee_id'],
                target_employee_name=perm['target_employee_name'],
                target_employee_email=perm['target_employee_email'],
                department=perm['department'],
                domain_pattern=perm['domain_pattern'],
                permission_type=perm['permission_type'],
                granted_at=perm['granted_at'],
                expires_at=perm['expires_at'],
                is_active=perm['is_active'],
                granted_by_name=perm['granted_by_name'],
                access_type=access_type
            ))
        
        return {
            "manager_id": manager_id,
            "total_permissions": len(permission_list),
            "active_permissions": len([p for p in permission_list if p.is_active]),
            "permissions": permission_list
        }
        
    except Exception as e:
        logger.error(f"Error getting manager permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/employee/{employee_id}/managers")
async def get_employee_managers_endpoint(
    employee_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Get all managers who can access a specific employee's emails"""
    try:
        logger.info(f"Employee managers requested for employee {employee_id} by user: {authenticated_user.get('email', 'unknown')}")
        
        # Get managers
        managers = get_employee_managers(employee_id)
        
        # Convert to response format
        manager_list = []
        for mgr in managers:
            manager_list.append(ManagerInfo(
                manager_id=mgr['manager_id'],
                manager_name=mgr['manager_name'],
                manager_email=mgr['manager_email'],
                permission_type=mgr['permission_type'],
                access_type=mgr['access_type'],
                granted_at=mgr['granted_at'],
                expires_at=mgr['expires_at']
            ))
        
        return {
            "employee_id": employee_id,
            "total_managers": len(manager_list),
            "managers": manager_list
        }
        
    except Exception as e:
        logger.error(f"Error getting employee managers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/accessible-employees")
async def get_accessible_employees_endpoint(
    authenticated_user: dict = Depends(verify_auth_token)
) -> AccessibleEmployeesResponse:
    """Get all employees accessible to the current user (if they're a manager)"""
    try:
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            manager_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Get accessible employees
        accessible_employees = get_accessible_employees(manager_employee_id)
        
        # Convert to response format
        employee_list = []
        for emp in accessible_employees:
            employee_list.append(EmployeeInfo(
                employee_id=emp['employee_id'],
                name=emp['name'],
                email=emp['email'],
                department=emp.get('department'),
                email_domain=emp.get('email_domain')
            ))
        
        return AccessibleEmployeesResponse(
            manager_id=manager_employee_id,
            manager_email=user_email,
            accessible_employees=employee_list,
            total_accessible=len(employee_list),
            message=f"Found {len(employee_list)} accessible employees"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting accessible employees: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/permissions/check-access")
async def check_email_access_endpoint(
    target_employee_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Check if the current user has access to a specific employee's emails"""
    try:
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            manager_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Check access
        has_access = has_email_access(manager_employee_id, target_employee_id)
        
        return {
            "manager_id": manager_employee_id,
            "target_employee_id": target_employee_id,
            "has_access": has_access,
            "message": f"Manager {'can' if has_access else 'cannot'} access employee {target_employee_id}'s emails"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking email access: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Operations

@router.post("/permissions/grant-department")
async def grant_department_access(
    department: str,
    manager_employee_id: int,
    permission_type: PermissionType = PermissionType.READ_CUSTOMER_RELATED,
    expires_at: Optional[datetime] = None,
    authenticated_user: dict = Depends(verify_auth_token)
) -> PermissionResponse:
    """Grant access to all employees in a specific department"""
    try:
        logger.info(f"Department access grant requested for department '{department}' to manager {manager_employee_id}")
        
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            granting_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Create department permission
        success = create_email_permission(
            manager_employee_id=manager_employee_id,
            permission_type=permission_type.value,
            department=department,
            granted_by=granting_employee_id,
            expires_at=expires_at
        )
        
        if success:
            return PermissionResponse(
                success=True,
                message=f"Successfully granted {permission_type.value} access to department '{department}'"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create department permission")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error granting department access: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/permissions/grant-domain")
async def grant_domain_access(
    domain_pattern: str,
    manager_employee_id: int,
    permission_type: PermissionType = PermissionType.READ_CUSTOMER_RELATED,
    expires_at: Optional[datetime] = None,
    authenticated_user: dict = Depends(verify_auth_token)
) -> PermissionResponse:
    """Grant access to all employees in a specific domain"""
    try:
        logger.info(f"Domain access grant requested for domain '{domain_pattern}' to manager {manager_employee_id}")
        
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            granting_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Ensure domain pattern starts with @
        if not domain_pattern.startswith('@'):
            domain_pattern = '@' + domain_pattern
        
        # Create domain permission
        success = create_email_permission(
            manager_employee_id=manager_employee_id,
            permission_type=permission_type.value,
            domain_pattern=domain_pattern,
            granted_by=granting_employee_id,
            expires_at=expires_at
        )
        
        if success:
            return PermissionResponse(
                success=True,
                message=f"Successfully granted {permission_type.value} access to domain '{domain_pattern}'"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create domain permission")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error granting domain access: {e}")
        raise HTTPException(status_code=500, detail=str(e))