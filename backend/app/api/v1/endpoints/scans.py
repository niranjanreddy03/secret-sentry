"""
Vault Sentry - Scan Management Endpoints
"""

import uuid
import tempfile
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from pydantic import BaseModel, Field
from loguru import logger

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.repository import Repository
from app.models.scan import Scan, ScanStatus, ScanTrigger
from app.models.secret import Secret, SecretType, RiskLevel, SecretStatus
from app.scanner import scanner


router = APIRouter()


# ============================================
# Pydantic Schemas
# ============================================

class ScanCreate(BaseModel):
    """Scan creation schema"""
    repository_id: Optional[int] = None
    branch: Optional[str] = None
    target_path: Optional[str] = None


class ScanResponse(BaseModel):
    """Scan response schema"""
    id: int
    scan_id: str
    repository_id: Optional[int]
    target_path: Optional[str]
    branch: Optional[str]
    trigger: str
    status: str
    progress: int
    files_scanned: int
    total_findings: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    risk_score: float
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ScanListResponse(BaseModel):
    """Paginated scan list response"""
    items: List[ScanResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ScanResultResponse(BaseModel):
    """Detailed scan result with findings"""
    scan: ScanResponse
    findings: List[dict]


# ============================================
# Background Tasks
# ============================================

async def run_scan_task(
    scan_id: int,
    target_path: str,
    db_url: str
):
    """Background task to run a scan"""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # Get scan record
            result = await db.execute(select(Scan).where(Scan.id == scan_id))
            scan = result.scalar_one()
            
            # Update scan status
            scan.status = ScanStatus.RUNNING.value
            scan.started_at = datetime.utcnow()
            await db.commit()
            
            # Run the scan
            scan_result = scanner.scan_directory(Path(target_path))
            
            # Save findings to database
            for finding in scan_result.findings:
                secret = Secret(
                    finding_id=finding.finding_id,
                    scan_id=scan.id,
                    type=finding.type,
                    file_path=finding.file_path,
                    line_number=finding.line_number,
                    column_start=finding.column_start,
                    column_end=finding.column_end,
                    secret_value_masked=finding.secret_masked,
                    secret_hash=finding.secret_hash,
                    code_snippet=finding.code_snippet,
                    match_rule=finding.match_rule,
                    risk_level=finding.severity,
                    risk_score=finding.risk_score,
                    entropy_score=finding.entropy_score,
                    is_test_file=finding.is_test_file,
                    status=SecretStatus.OPEN.value
                )
                db.add(secret)
            
            # Update scan record
            scan.status = ScanStatus.COMPLETED.value
            scan.completed_at = datetime.utcnow()
            scan.files_scanned = scan_result.files_scanned
            scan.total_findings = scan_result.total_findings
            scan.high_risk_count = scan_result.high_risk_count
            scan.medium_risk_count = scan_result.medium_risk_count
            scan.low_risk_count = scan_result.low_risk_count
            scan.risk_score = scan_result.risk_score
            scan.duration_seconds = scan_result.duration_seconds
            
            # Update repository stats if applicable
            if scan.repository_id:
                repo_result = await db.execute(
                    select(Repository).where(Repository.id == scan.repository_id)
                )
                repo = repo_result.scalar_one_or_none()
                if repo:
                    repo.total_scans += 1
                    repo.secrets_found += scan_result.total_findings
                    repo.last_scan_at = datetime.utcnow()
            
            await db.commit()
            logger.info(f"Scan completed: {scan.scan_id}")
            
        except Exception as e:
            logger.error(f"Scan failed: {e}")
            scan.status = ScanStatus.FAILED.value
            scan.error_message = str(e)
            scan.completed_at = datetime.utcnow()
            await db.commit()
        
        finally:
            # Cleanup temporary files if needed
            if target_path.startswith(tempfile.gettempdir()):
                try:
                    shutil.rmtree(target_path, ignore_errors=True)
                except:
                    pass


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=ScanListResponse)
async def list_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    repository_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all scans for the current user.
    """
    query = select(Scan).where(Scan.user_id == current_user.id)
    count_query = select(func.count(Scan.id)).where(Scan.user_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.where(Scan.status == status)
        count_query = count_query.where(Scan.status == status)
    
    if repository_id:
        query = query.where(Scan.repository_id == repository_id)
        count_query = count_query.where(Scan.repository_id == repository_id)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Scan.created_at.desc())
    
    result = await db.execute(query)
    scans = result.scalars().all()
    
    return ScanListResponse(
        items=scans,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.post("", response_model=ScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    scan_data: ScanCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Initiate a new scan for a repository.
    """
    target_path = None
    
    # Validate repository if specified
    if scan_data.repository_id:
        result = await db.execute(
            select(Repository).where(
                (Repository.id == scan_data.repository_id) &
                (Repository.owner_id == current_user.id)
            )
        )
        repository = result.scalar_one_or_none()
        
        if not repository:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository not found"
            )
        
        # TODO: Clone repository to temp directory
        # For now, use target_path if provided
        target_path = scan_data.target_path
    else:
        target_path = scan_data.target_path
    
    if not target_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either repository_id or target_path must be provided"
        )
    
    # Create scan record
    scan = Scan(
        scan_id=str(uuid.uuid4()),
        repository_id=scan_data.repository_id,
        target_path=target_path,
        branch=scan_data.branch,
        user_id=current_user.id,
        trigger=ScanTrigger.MANUAL.value,
        status=ScanStatus.PENDING.value,
        progress=0
    )
    
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    
    # Queue background scan task
    background_tasks.add_task(
        run_scan_task,
        scan.id,
        target_path,
        settings.DATABASE_URL
    )
    
    logger.info(f"Scan initiated: {scan.scan_id} by {current_user.email}")
    
    return scan


class ScanTriggerRequest(BaseModel):
    """Request to trigger a scan for a Supabase scan record"""
    scan_id: int
    repository_id: int
    repository_url: str
    branch: str = "main"


@router.post("/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(
    request: ScanTriggerRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger a scan for an existing Supabase scan record.
    This endpoint is called by the frontend after creating a scan record in Supabase.
    """
    from app.core.supabase_client import is_supabase_configured
    from app.workers.tasks.scan_tasks import run_repository_scan
    
    if not is_supabase_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )
    
    # Queue the Celery task to run the scan
    try:
        run_repository_scan.delay(
            scan_id=request.scan_id,
            repository_id=request.repository_id,
            repository_url=request.repository_url,
            branch=request.branch,
            scan_type="full",
            options={"entropy_enabled": True}
        )
        logger.info(f"Scan triggered for Supabase scan_id={request.scan_id}, repo_id={request.repository_id}")
        return {"status": "queued", "scan_id": request.scan_id}
    except Exception as e:
        logger.error(f"Failed to queue scan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue scan: {str(e)}"
        )


@router.post("/upload", response_model=ScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_and_scan(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a zip file and scan its contents.
    """
    # Validate file type
    if not file.filename.endswith(('.zip', '.tar.gz', '.tar')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .zip, .tar.gz, or .tar files are allowed"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Create temp directory and extract
    temp_dir = tempfile.mkdtemp(prefix="VaultSentry_")
    try:
        file_path = Path(temp_dir) / file.filename
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Extract based on file type
        extract_dir = Path(temp_dir) / "extracted"
        extract_dir.mkdir()
        
        if file.filename.endswith('.zip'):
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
        else:
            shutil.unpack_archive(file_path, extract_dir)
        
        # Create scan record
        scan = Scan(
            scan_id=str(uuid.uuid4()),
            target_path=str(extract_dir),
            user_id=current_user.id,
            trigger=ScanTrigger.MANUAL.value,
            status=ScanStatus.PENDING.value,
            progress=0
        )
        
        db.add(scan)
        await db.commit()
        await db.refresh(scan)
        
        # Queue background scan task
        background_tasks.add_task(
            run_scan_task,
            scan.id,
            str(extract_dir),
            settings.DATABASE_URL
        )
        
        logger.info(f"Upload scan initiated: {scan.scan_id} by {current_user.email}")
        
        return scan
        
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process upload: {str(e)}"
        )


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific scan by ID.
    """
    result = await db.execute(
        select(Scan).where(
            (Scan.scan_id == scan_id) &
            (Scan.user_id == current_user.id)
        )
    )
    scan = result.scalar_one_or_none()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    return scan


@router.get("/{scan_id}/findings", response_model=List[dict])
async def get_scan_findings(
    scan_id: str,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all findings for a specific scan.
    """
    # Get scan
    result = await db.execute(
        select(Scan).where(
            (Scan.scan_id == scan_id) &
            (Scan.user_id == current_user.id)
        )
    )
    scan = result.scalar_one_or_none()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    # Query findings
    query = select(Secret).where(Secret.scan_id == scan.id)
    
    if risk_level:
        query = query.where(Secret.risk_level == risk_level)
    if status:
        query = query.where(Secret.status == status)
    
    query = query.order_by(Secret.risk_score.desc())
    
    result = await db.execute(query)
    secrets = result.scalars().all()
    
    return [s.to_dict() for s in secrets]


@router.post("/{scan_id}/cancel")
async def cancel_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a running scan.
    """
    result = await db.execute(
        select(Scan).where(
            (Scan.scan_id == scan_id) &
            (Scan.user_id == current_user.id)
        )
    )
    scan = result.scalar_one_or_none()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    if scan.status not in [ScanStatus.PENDING.value, ScanStatus.RUNNING.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scan cannot be cancelled"
        )
    
    scan.status = ScanStatus.CANCELLED.value
    scan.completed_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Scan cancelled successfully"}


@router.delete("/{scan_id}")
async def delete_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a scan and all its findings.
    """
    result = await db.execute(
        select(Scan).where(
            (Scan.scan_id == scan_id) &
            (Scan.user_id == current_user.id)
        )
    )
    scan = result.scalar_one_or_none()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    await db.delete(scan)
    await db.commit()
    
    logger.info(f"Scan deleted: {scan_id} by {current_user.email}")
    
    return {"message": "Scan deleted successfully"}
