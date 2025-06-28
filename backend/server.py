from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import shutil
import base64
import mimetypes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Mount static files for PDF serving
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Define Models
class PDFDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    description: Optional[str] = None
    filename: str
    file_path: str
    file_size: int
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    content_type: str = "application/pdf"

class PDFDocumentCreate(BaseModel):
    title: str
    subject: str
    description: Optional[str] = None

class PDFDocumentResponse(BaseModel):
    id: str
    title: str
    subject: str
    description: Optional[str] = None
    filename: str
    file_size: int
    upload_date: datetime
    file_url: str

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    due_date: str  # Store as ISO format string "YYYY-MM-DD"
    due_time: Optional[str] = None
    subject: Optional[str] = None
    completed: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str  # Accept ISO format string "YYYY-MM-DD"
    due_time: Optional[str] = None
    subject: Optional[str] = None

class Schedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    description: Optional[str] = None
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str
    end_time: str
    color: str = "#3B82F6"  # Default blue color
    created_date: datetime = Field(default_factory=datetime.utcnow)

class ScheduleCreate(BaseModel):
    title: str
    subject: str
    description: Optional[str] = None
    day_of_week: int
    start_time: str
    end_time: str
    color: str = "#3B82F6"

# PDF Management Endpoints
@api_router.post("/pdfs/upload", response_model=PDFDocumentResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    description: Optional[str] = Form(None)
):
    # Validate file type
    if not file.content_type or not file.content_type.startswith('application/pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Create PDF document
        pdf_doc = PDFDocument(
            title=title,
            subject=subject,
            description=description,
            filename=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            content_type=file.content_type
        )
        
        # Save to database
        await db.pdfs.insert_one(pdf_doc.dict())
        
        # Return response with file URL
        file_url = f"/uploads/{unique_filename}"
        return PDFDocumentResponse(
            id=pdf_doc.id,
            title=pdf_doc.title,
            subject=pdf_doc.subject,
            description=pdf_doc.description,
            filename=pdf_doc.filename,
            file_size=pdf_doc.file_size,
            upload_date=pdf_doc.upload_date,
            file_url=file_url
        )
    
    except Exception as e:
        # Clean up file if database save fails
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@api_router.get("/pdfs", response_model=List[PDFDocumentResponse])
async def get_pdfs(subject: Optional[str] = None):
    query = {}
    if subject:
        query["subject"] = subject
    
    pdfs = await db.pdfs.find(query).to_list(1000)
    
    response_pdfs = []
    for pdf in pdfs:
        # Generate file URL
        filename = os.path.basename(pdf["file_path"])
        file_url = f"/uploads/{filename}"
        
        response_pdfs.append(PDFDocumentResponse(
            id=pdf["id"],
            title=pdf["title"],
            subject=pdf["subject"],
            description=pdf.get("description"),
            filename=pdf["filename"],
            file_size=pdf["file_size"],
            upload_date=pdf["upload_date"],
            file_url=file_url
        ))
    
    return response_pdfs

@api_router.get("/pdfs/{pdf_id}", response_model=PDFDocumentResponse)
async def get_pdf(pdf_id: str):
    pdf = await db.pdfs.find_one({"id": pdf_id})
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    filename = os.path.basename(pdf["file_path"])
    file_url = f"/uploads/{filename}"
    
    return PDFDocumentResponse(
        id=pdf["id"],
        title=pdf["title"],
        subject=pdf["subject"],
        description=pdf.get("description"),
        filename=pdf["filename"],
        file_size=pdf["file_size"],
        upload_date=pdf["upload_date"],
        file_url=file_url
    )

@api_router.delete("/pdfs/{pdf_id}")
async def delete_pdf(pdf_id: str):
    pdf = await db.pdfs.find_one({"id": pdf_id})
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Delete file from filesystem
    file_path = Path(pdf["file_path"])
    if file_path.exists():
        os.remove(file_path)
    
    # Delete from database
    await db.pdfs.delete_one({"id": pdf_id})
    
    return {"message": "PDF deleted successfully"}

@api_router.get("/pdfs/subjects/list")
async def get_subjects():
    """Get list of unique subjects"""
    subjects = await db.pdfs.distinct("subject")
    return {"subjects": subjects}

# Reminders Endpoints
@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder_data: ReminderCreate):
    reminder = Reminder(**reminder_data.dict())
    await db.reminders.insert_one(reminder.dict())
    return reminder

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(completed: Optional[bool] = None):
    query = {}
    if completed is not None:
        query["completed"] = completed
    
    reminders = await db.reminders.find(query).sort("due_date", 1).to_list(1000)
    return [Reminder(**reminder) for reminder in reminders]

@api_router.put("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, reminder_data: ReminderCreate):
    reminder = await db.reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    update_data = reminder_data.dict()
    await db.reminders.update_one({"id": reminder_id}, {"$set": update_data})
    
    updated_reminder = await db.reminders.find_one({"id": reminder_id})
    return Reminder(**updated_reminder)

@api_router.patch("/reminders/{reminder_id}/complete")
async def toggle_reminder_completion(reminder_id: str):
    reminder = await db.reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    new_status = not reminder["completed"]
    await db.reminders.update_one({"id": reminder_id}, {"$set": {"completed": new_status}})
    
    updated_reminder = await db.reminders.find_one({"id": reminder_id})
    return Reminder(**updated_reminder)

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str):
    reminder = await db.reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    await db.reminders.delete_one({"id": reminder_id})
    return {"message": "Reminder deleted successfully"}

# Schedule Endpoints
@api_router.post("/schedules", response_model=Schedule)
async def create_schedule(schedule_data: ScheduleCreate):
    schedule = Schedule(**schedule_data.dict())
    await db.schedules.insert_one(schedule.dict())
    return schedule

@api_router.get("/schedules", response_model=List[Schedule])
async def get_schedules():
    schedules = await db.schedules.find().sort("day_of_week", 1).to_list(1000)
    return [Schedule(**schedule) for schedule in schedules]

@api_router.put("/schedules/{schedule_id}", response_model=Schedule)
async def update_schedule(schedule_id: str, schedule_data: ScheduleCreate):
    schedule = await db.schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    update_data = schedule_data.dict()
    await db.schedules.update_one({"id": schedule_id}, {"$set": update_data})
    
    updated_schedule = await db.schedules.find_one({"id": schedule_id})
    return Schedule(**updated_schedule)

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    schedule = await db.schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    await db.schedules.delete_one({"id": schedule_id})
    return {"message": "Schedule deleted successfully"}

# Basic endpoints
@api_router.get("/")
async def root():
    return {"message": "University PDF Manager API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()