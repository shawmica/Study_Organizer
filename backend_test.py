import requests
import os
import json
import unittest
import tempfile
from datetime import datetime, date, timedelta
import uuid
import time
from pathlib import Path

# Get the backend URL from frontend/.env
def get_backend_url():
    env_file = Path('/app/frontend/.env')
    with open(env_file, 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.strip().split('=')[1].strip('"\'')
    raise ValueError("Backend URL not found in frontend/.env")

# Base URL for API requests
BASE_URL = f"{get_backend_url()}/api"
print(f"Using backend URL: {BASE_URL}")

class UniversityPDFManagerTests(unittest.TestCase):
    """Test suite for University PDF Manager backend APIs"""
    
    def setUp(self):
        """Setup for tests - create test data"""
        self.pdf_ids = []
        self.reminder_ids = []
        self.schedule_ids = []
        
        # Create a small test PDF file
        self.test_pdf_path = os.path.join(tempfile.gettempdir(), "test.pdf")
        with open(self.test_pdf_path, "wb") as f:
            f.write(b"%PDF-1.4\n%Test PDF file for testing\n")
            f.write(b"1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n")
            f.write(b"2 0 obj\n<</Type/Pages/Kids[]/Count 0>>\nendobj\n")
            f.write(b"xref\n0 3\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n")
            f.write(b"trailer\n<</Size 3/Root 1 0 R>>\nstartxref\n100\n%%EOF\n")
    
    def tearDown(self):
        """Cleanup after tests - delete test data"""
        # Delete any created PDFs
        for pdf_id in self.pdf_ids:
            try:
                requests.delete(f"{BASE_URL}/pdfs/{pdf_id}")
            except:
                pass
        
        # Delete any created reminders
        for reminder_id in self.reminder_ids:
            try:
                requests.delete(f"{BASE_URL}/reminders/{reminder_id}")
            except:
                pass
        
        # Delete any created schedules
        for schedule_id in self.schedule_ids:
            try:
                requests.delete(f"{BASE_URL}/schedules/{schedule_id}")
            except:
                pass
        
        # Delete test PDF file
        if os.path.exists(self.test_pdf_path):
            os.remove(self.test_pdf_path)
    
    # ===== PDF Upload and Management API Tests =====
    
    def test_pdf_upload_valid(self):
        """Test uploading a valid PDF file"""
        with open(self.test_pdf_path, "rb") as pdf_file:
            files = {"file": ("test.pdf", pdf_file, "application/pdf")}
            data = {
                "title": "Test PDF",
                "subject": "Computer Science",
                "description": "A test PDF file for API testing"
            }
            response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
            
            self.assertEqual(response.status_code, 200, f"Failed to upload PDF: {response.text}")
            result = response.json()
            self.assertIn("id", result)
            self.assertEqual(result["title"], "Test PDF")
            self.assertEqual(result["subject"], "Computer Science")
            self.assertEqual(result["description"], "A test PDF file for API testing")
            self.assertIn("file_url", result)
            
            # Save ID for cleanup
            self.pdf_ids.append(result["id"])
            
            # Test file serving
            file_url = f"{get_backend_url()}{result['file_url']}"
            file_response = requests.get(file_url)
            self.assertEqual(file_response.status_code, 200, "Failed to retrieve uploaded PDF")
            self.assertEqual(file_response.headers["Content-Type"], "application/pdf")
    
    def test_pdf_upload_invalid_file(self):
        """Test uploading an invalid file type (non-PDF)"""
        # Create a text file
        text_file_path = os.path.join(tempfile.gettempdir(), "test.txt")
        with open(text_file_path, "w") as f:
            f.write("This is not a PDF file")
        
        try:
            with open(text_file_path, "rb") as text_file:
                files = {"file": ("test.txt", text_file, "text/plain")}
                data = {
                    "title": "Invalid File",
                    "subject": "Test",
                    "description": "This should be rejected"
                }
                response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
                
                self.assertEqual(response.status_code, 400, "Non-PDF file was accepted")
                self.assertIn("Only PDF files are allowed", response.text)
        finally:
            if os.path.exists(text_file_path):
                os.remove(text_file_path)
    
    def test_pdf_list(self):
        """Test listing all PDFs"""
        # First upload a PDF
        with open(self.test_pdf_path, "rb") as pdf_file:
            files = {"file": ("test_list.pdf", pdf_file, "application/pdf")}
            data = {
                "title": "Test List PDF",
                "subject": "Mathematics",
                "description": "Testing PDF listing"
            }
            upload_response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
            self.assertEqual(upload_response.status_code, 200)
            pdf_id = upload_response.json()["id"]
            self.pdf_ids.append(pdf_id)
        
        # Now get the list of PDFs
        response = requests.get(f"{BASE_URL}/pdfs")
        self.assertEqual(response.status_code, 200)
        pdfs = response.json()
        self.assertIsInstance(pdfs, list)
        
        # Check if our uploaded PDF is in the list
        found = False
        for pdf in pdfs:
            if pdf["id"] == pdf_id:
                found = True
                self.assertEqual(pdf["title"], "Test List PDF")
                self.assertEqual(pdf["subject"], "Mathematics")
                break
        
        self.assertTrue(found, "Uploaded PDF not found in list")
    
    def test_pdf_filter_by_subject(self):
        """Test filtering PDFs by subject"""
        # Upload two PDFs with different subjects
        subjects = ["Physics", "Chemistry"]
        for i, subject in enumerate(subjects):
            with open(self.test_pdf_path, "rb") as pdf_file:
                files = {"file": (f"test_subject_{i}.pdf", pdf_file, "application/pdf")}
                data = {
                    "title": f"Test Subject {i}",
                    "subject": subject,
                    "description": f"Testing subject filtering for {subject}"
                }
                response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
                self.assertEqual(response.status_code, 200)
                self.pdf_ids.append(response.json()["id"])
        
        # Test filtering by subject
        for subject in subjects:
            response = requests.get(f"{BASE_URL}/pdfs?subject={subject}")
            self.assertEqual(response.status_code, 200)
            pdfs = response.json()
            
            # All PDFs should have the requested subject
            for pdf in pdfs:
                self.assertEqual(pdf["subject"], subject)
    
    def test_pdf_get_by_id(self):
        """Test getting a PDF by ID"""
        # First upload a PDF
        with open(self.test_pdf_path, "rb") as pdf_file:
            files = {"file": ("test_get.pdf", pdf_file, "application/pdf")}
            data = {
                "title": "Test Get PDF",
                "subject": "Biology",
                "description": "Testing get PDF by ID"
            }
            upload_response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
            self.assertEqual(upload_response.status_code, 200)
            pdf_id = upload_response.json()["id"]
            self.pdf_ids.append(pdf_id)
        
        # Now get the PDF by ID
        response = requests.get(f"{BASE_URL}/pdfs/{pdf_id}")
        self.assertEqual(response.status_code, 200)
        pdf = response.json()
        
        self.assertEqual(pdf["id"], pdf_id)
        self.assertEqual(pdf["title"], "Test Get PDF")
        self.assertEqual(pdf["subject"], "Biology")
        self.assertEqual(pdf["description"], "Testing get PDF by ID")
    
    def test_pdf_get_nonexistent(self):
        """Test getting a non-existent PDF"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/pdfs/{fake_id}")
        self.assertEqual(response.status_code, 404)
    
    def test_pdf_delete(self):
        """Test deleting a PDF"""
        # First upload a PDF
        with open(self.test_pdf_path, "rb") as pdf_file:
            files = {"file": ("test_delete.pdf", pdf_file, "application/pdf")}
            data = {
                "title": "Test Delete PDF",
                "subject": "History",
                "description": "Testing PDF deletion"
            }
            upload_response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
            self.assertEqual(upload_response.status_code, 200)
            pdf_id = upload_response.json()["id"]
            file_url = upload_response.json()["file_url"]
        
        # Now delete the PDF
        response = requests.delete(f"{BASE_URL}/pdfs/{pdf_id}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("deleted successfully", response.json()["message"])
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/pdfs/{pdf_id}")
        self.assertEqual(get_response.status_code, 404)
        
        # Verify the file is no longer accessible
        file_response = requests.get(f"{get_backend_url()}{file_url}")
        self.assertEqual(file_response.status_code, 404)
    
    def test_get_subjects(self):
        """Test getting unique subjects"""
        # Upload PDFs with different subjects
        subjects = ["Math", "Science", "History"]
        for i, subject in enumerate(subjects):
            with open(self.test_pdf_path, "rb") as pdf_file:
                files = {"file": (f"test_subjects_{i}.pdf", pdf_file, "application/pdf")}
                data = {
                    "title": f"Test Subjects {i}",
                    "subject": subject,
                    "description": f"Testing subjects list for {subject}"
                }
                response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
                self.assertEqual(response.status_code, 200)
                self.pdf_ids.append(response.json()["id"])
        
        # Get subjects list
        response = requests.get(f"{BASE_URL}/pdfs/subjects/list")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        
        self.assertIn("subjects", result)
        for subject in subjects:
            self.assertIn(subject, result["subjects"])
    
    # ===== Reminders CRUD API Tests =====
    
    def test_reminder_create(self):
        """Test creating a reminder"""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        reminder_data = {
            "title": "Test Reminder",
            "description": "This is a test reminder",
            "due_date": tomorrow,
            "due_time": "14:30",
            "subject": "Computer Science"
        }
        
        response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
        self.assertEqual(response.status_code, 200, f"Failed to create reminder: {response.text}")
        
        result = response.json()
        self.assertIn("id", result)
        self.assertEqual(result["title"], "Test Reminder")
        self.assertEqual(result["description"], "This is a test reminder")
        self.assertEqual(result["due_date"], tomorrow)
        self.assertEqual(result["due_time"], "14:30")
        self.assertEqual(result["subject"], "Computer Science")
        self.assertFalse(result["completed"])
        
        # Save ID for cleanup
        self.reminder_ids.append(result["id"])
    
    def test_reminder_list(self):
        """Test listing all reminders"""
        # Create a few reminders
        for i in range(3):
            due_date = (date.today() + timedelta(days=i+1)).isoformat()
            reminder_data = {
                "title": f"Test Reminder {i}",
                "description": f"This is test reminder {i}",
                "due_date": due_date,
                "due_time": f"{10+i}:00",
                "subject": "Test Subject"
            }
            response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
            self.assertEqual(response.status_code, 200)
            self.reminder_ids.append(response.json()["id"])
        
        # Get all reminders
        response = requests.get(f"{BASE_URL}/reminders")
        self.assertEqual(response.status_code, 200)
        reminders = response.json()
        
        # Check if our created reminders are in the list
        created_titles = [f"Test Reminder {i}" for i in range(3)]
        found_titles = [r["title"] for r in reminders if r["title"] in created_titles]
        self.assertEqual(len(found_titles), 3, "Not all created reminders were found")
    
    def test_reminder_filter_by_completion(self):
        """Test filtering reminders by completion status"""
        # Create two reminders
        reminder_ids = []
        for i in range(2):
            due_date = (date.today() + timedelta(days=i+1)).isoformat()
            reminder_data = {
                "title": f"Completion Test {i}",
                "description": f"Testing completion filtering {i}",
                "due_date": due_date,
                "subject": "Test"
            }
            response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
            self.assertEqual(response.status_code, 200)
            reminder_id = response.json()["id"]
            reminder_ids.append(reminder_id)
            self.reminder_ids.append(reminder_id)
        
        # Mark one as completed
        response = requests.patch(f"{BASE_URL}/reminders/{reminder_ids[0]}/complete")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["completed"])
        
        # Test filtering by completed=true
        response = requests.get(f"{BASE_URL}/reminders?completed=true")
        self.assertEqual(response.status_code, 200)
        completed_reminders = response.json()
        completed_ids = [r["id"] for r in completed_reminders]
        self.assertIn(reminder_ids[0], completed_ids)
        self.assertNotIn(reminder_ids[1], completed_ids)
        
        # Test filtering by completed=false
        response = requests.get(f"{BASE_URL}/reminders?completed=false")
        self.assertEqual(response.status_code, 200)
        incomplete_reminders = response.json()
        incomplete_ids = [r["id"] for r in incomplete_reminders]
        self.assertIn(reminder_ids[1], incomplete_ids)
        self.assertNotIn(reminder_ids[0], incomplete_ids)
    
    def test_reminder_update(self):
        """Test updating a reminder"""
        # First create a reminder
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        reminder_data = {
            "title": "Original Title",
            "description": "Original description",
            "due_date": tomorrow,
            "due_time": "09:00",
            "subject": "Original Subject"
        }
        
        response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
        self.assertEqual(response.status_code, 200)
        reminder_id = response.json()["id"]
        self.reminder_ids.append(reminder_id)
        
        # Now update it
        updated_data = {
            "title": "Updated Title",
            "description": "Updated description",
            "due_date": tomorrow,
            "due_time": "10:30",
            "subject": "Updated Subject"
        }
        
        response = requests.put(f"{BASE_URL}/reminders/{reminder_id}", json=updated_data)
        self.assertEqual(response.status_code, 200)
        updated = response.json()
        
        self.assertEqual(updated["id"], reminder_id)
        self.assertEqual(updated["title"], "Updated Title")
        self.assertEqual(updated["description"], "Updated description")
        self.assertEqual(updated["due_time"], "10:30")
        self.assertEqual(updated["subject"], "Updated Subject")
    
    def test_reminder_toggle_completion(self):
        """Test toggling reminder completion status"""
        # Create a reminder
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        reminder_data = {
            "title": "Toggle Test",
            "description": "Testing completion toggling",
            "due_date": tomorrow
        }
        
        response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
        self.assertEqual(response.status_code, 200)
        reminder_id = response.json()["id"]
        self.reminder_ids.append(reminder_id)
        self.assertFalse(response.json()["completed"])
        
        # Toggle to completed
        response = requests.patch(f"{BASE_URL}/reminders/{reminder_id}/complete")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["completed"])
        
        # Toggle back to incomplete
        response = requests.patch(f"{BASE_URL}/reminders/{reminder_id}/complete")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["completed"])
    
    def test_reminder_delete(self):
        """Test deleting a reminder"""
        # Create a reminder
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        reminder_data = {
            "title": "Delete Test",
            "description": "Testing reminder deletion",
            "due_date": tomorrow
        }
        
        response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
        self.assertEqual(response.status_code, 200)
        reminder_id = response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/reminders/{reminder_id}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("deleted successfully", response.json()["message"])
        
        # Verify it's gone
        response = requests.get(f"{BASE_URL}/reminders")
        self.assertEqual(response.status_code, 200)
        reminders = response.json()
        reminder_ids = [r["id"] for r in reminders]
        self.assertNotIn(reminder_id, reminder_ids)
    
    # ===== Schedule/Calendar CRUD API Tests =====
    
    def test_schedule_create(self):
        """Test creating a schedule entry"""
        schedule_data = {
            "title": "Test Schedule",
            "subject": "Physics",
            "description": "Weekly physics lecture",
            "day_of_week": 1,  # Tuesday
            "start_time": "10:00",
            "end_time": "12:00",
            "color": "#FF5733"
        }
        
        response = requests.post(f"{BASE_URL}/schedules", json=schedule_data)
        self.assertEqual(response.status_code, 200, f"Failed to create schedule: {response.text}")
        
        result = response.json()
        self.assertIn("id", result)
        self.assertEqual(result["title"], "Test Schedule")
        self.assertEqual(result["subject"], "Physics")
        self.assertEqual(result["description"], "Weekly physics lecture")
        self.assertEqual(result["day_of_week"], 1)
        self.assertEqual(result["start_time"], "10:00")
        self.assertEqual(result["end_time"], "12:00")
        self.assertEqual(result["color"], "#FF5733")
        
        # Save ID for cleanup
        self.schedule_ids.append(result["id"])
    
    def test_schedule_list(self):
        """Test listing all schedules"""
        # Create a few schedules
        for i in range(3):
            schedule_data = {
                "title": f"Schedule {i}",
                "subject": f"Subject {i}",
                "description": f"Description {i}",
                "day_of_week": i % 7,
                "start_time": f"{9+i}:00",
                "end_time": f"{10+i}:00",
                "color": f"#00{i}FFF"
            }
            response = requests.post(f"{BASE_URL}/schedules", json=schedule_data)
            self.assertEqual(response.status_code, 200)
            self.schedule_ids.append(response.json()["id"])
        
        # Get all schedules
        response = requests.get(f"{BASE_URL}/schedules")
        self.assertEqual(response.status_code, 200)
        schedules = response.json()
        
        # Check if our created schedules are in the list
        created_titles = [f"Schedule {i}" for i in range(3)]
        found_titles = [s["title"] for s in schedules if s["title"] in created_titles]
        self.assertEqual(len(found_titles), 3, "Not all created schedules were found")
    
    def test_schedule_update(self):
        """Test updating a schedule"""
        # First create a schedule
        schedule_data = {
            "title": "Original Schedule",
            "subject": "Original Subject",
            "description": "Original description",
            "day_of_week": 3,
            "start_time": "14:00",
            "end_time": "16:00",
            "color": "#3B82F6"
        }
        
        response = requests.post(f"{BASE_URL}/schedules", json=schedule_data)
        self.assertEqual(response.status_code, 200)
        schedule_id = response.json()["id"]
        self.schedule_ids.append(schedule_id)
        
        # Now update it
        updated_data = {
            "title": "Updated Schedule",
            "subject": "Updated Subject",
            "description": "Updated description",
            "day_of_week": 4,
            "start_time": "15:00",
            "end_time": "17:00",
            "color": "#10B981"
        }
        
        response = requests.put(f"{BASE_URL}/schedules/{schedule_id}", json=updated_data)
        self.assertEqual(response.status_code, 200)
        updated = response.json()
        
        self.assertEqual(updated["id"], schedule_id)
        self.assertEqual(updated["title"], "Updated Schedule")
        self.assertEqual(updated["subject"], "Updated Subject")
        self.assertEqual(updated["description"], "Updated description")
        self.assertEqual(updated["day_of_week"], 4)
        self.assertEqual(updated["start_time"], "15:00")
        self.assertEqual(updated["end_time"], "17:00")
        self.assertEqual(updated["color"], "#10B981")
    
    def test_schedule_delete(self):
        """Test deleting a schedule"""
        # Create a schedule
        schedule_data = {
            "title": "Delete Test Schedule",
            "subject": "Test Subject",
            "description": "Testing schedule deletion",
            "day_of_week": 5,
            "start_time": "09:00",
            "end_time": "10:00"
        }
        
        response = requests.post(f"{BASE_URL}/schedules", json=schedule_data)
        self.assertEqual(response.status_code, 200)
        schedule_id = response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/schedules/{schedule_id}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("deleted successfully", response.json()["message"])
        
        # Verify it's gone
        response = requests.get(f"{BASE_URL}/schedules")
        self.assertEqual(response.status_code, 200)
        schedules = response.json()
        schedule_ids = [s["id"] for s in schedules]
        self.assertNotIn(schedule_id, schedule_ids)

if __name__ == "__main__":
    unittest.main(verbosity=2)