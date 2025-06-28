import requests
import os
import json
from datetime import datetime, timedelta
import time

# Get the backend URL from frontend/.env
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.strip().split('=')[1].strip('"\'')
    raise ValueError("Backend URL not found in frontend/.env")

# Base URL for API requests
BASE_URL = f"{get_backend_url()}/api"
print(f"Using backend URL: {BASE_URL}")

def test_pdf_upload():
    """Test PDF upload functionality"""
    print("\n=== Testing PDF Upload ===")
    
    # Create a simple PDF file
    pdf_path = "/tmp/test.pdf"
    with open(pdf_path, "wb") as f:
        f.write(b"%PDF-1.4\n%Test PDF file\n")
        f.write(b"1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n")
        f.write(b"2 0 obj\n<</Type/Pages/Kids[]/Count 0>>\nendobj\n")
        f.write(b"xref\n0 3\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n")
        f.write(b"trailer\n<</Size 3/Root 1 0 R>>\nstartxref\n100\n%%EOF\n")
    
    try:
        # Upload the PDF
        with open(pdf_path, "rb") as pdf_file:
            files = {"file": ("test.pdf", pdf_file, "application/pdf")}
            data = {
                "title": "Test PDF",
                "subject": "Computer Science",
                "description": "A test PDF file"
            }
            response = requests.post(f"{BASE_URL}/pdfs/upload", files=files, data=data)
            
            print(f"Upload response status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                pdf_id = result["id"]
                file_url = result["file_url"]
                print(f"PDF ID: {pdf_id}")
                print(f"File URL: {file_url}")
                
                # Test file serving
                full_url = f"{get_backend_url()}{file_url}"
                print(f"Testing file access at: {full_url}")
                file_response = requests.get(full_url)
                print(f"File access status: {file_response.status_code}")
                print(f"Content-Type: {file_response.headers.get('Content-Type', 'Not specified')}")
                
                # Test PDF listing
                list_response = requests.get(f"{BASE_URL}/pdfs")
                print(f"PDF list status: {list_response.status_code}")
                if list_response.status_code == 200:
                    pdfs = list_response.json()
                    print(f"Number of PDFs: {len(pdfs)}")
                
                # Test PDF deletion
                delete_response = requests.delete(f"{BASE_URL}/pdfs/{pdf_id}")
                print(f"PDF deletion status: {delete_response.status_code}")
                if delete_response.status_code == 200:
                    print(f"Deletion message: {delete_response.json().get('message', '')}")
            else:
                print(f"Upload failed: {response.text}")
    finally:
        # Clean up
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

def test_reminders():
    """Test reminders functionality"""
    print("\n=== Testing Reminders ===")
    
    # Create a reminder
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    reminder_data = {
        "title": "Test Reminder",
        "description": "This is a test reminder",
        "due_date": tomorrow,
        "due_time": "14:30",
        "subject": "Computer Science"
    }
    
    print(f"Creating reminder with data: {json.dumps(reminder_data)}")
    response = requests.post(f"{BASE_URL}/reminders", json=reminder_data)
    print(f"Create reminder status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        reminder_id = result["id"]
        print(f"Reminder ID: {reminder_id}")
        
        # Test reminder listing
        list_response = requests.get(f"{BASE_URL}/reminders")
        print(f"Reminder list status: {list_response.status_code}")
        if list_response.status_code == 200:
            reminders = list_response.json()
            print(f"Number of reminders: {len(reminders)}")
        
        # Test reminder update
        update_data = {
            "title": "Updated Reminder",
            "description": "This reminder has been updated",
            "due_date": tomorrow,
            "due_time": "16:00",
            "subject": "Updated Subject"
        }
        update_response = requests.put(f"{BASE_URL}/reminders/{reminder_id}", json=update_data)
        print(f"Reminder update status: {update_response.status_code}")
        
        # Test toggle completion
        toggle_response = requests.patch(f"{BASE_URL}/reminders/{reminder_id}/complete")
        print(f"Toggle completion status: {toggle_response.status_code}")
        if toggle_response.status_code == 200:
            print(f"Completed status: {toggle_response.json().get('completed', False)}")
        
        # Test reminder deletion
        delete_response = requests.delete(f"{BASE_URL}/reminders/{reminder_id}")
        print(f"Reminder deletion status: {delete_response.status_code}")
        if delete_response.status_code == 200:
            print(f"Deletion message: {delete_response.json().get('message', '')}")
    else:
        print(f"Create reminder failed: {response.text}")

def test_schedules():
    """Test schedules functionality"""
    print("\n=== Testing Schedules ===")
    
    # Create a schedule
    schedule_data = {
        "title": "Test Schedule",
        "subject": "Physics",
        "description": "Weekly physics lecture",
        "day_of_week": 1,  # Tuesday
        "start_time": "10:00",
        "end_time": "12:00",
        "color": "#FF5733"
    }
    
    print(f"Creating schedule with data: {json.dumps(schedule_data)}")
    response = requests.post(f"{BASE_URL}/schedules", json=schedule_data)
    print(f"Create schedule status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        schedule_id = result["id"]
        print(f"Schedule ID: {schedule_id}")
        
        # Test schedule listing
        list_response = requests.get(f"{BASE_URL}/schedules")
        print(f"Schedule list status: {list_response.status_code}")
        if list_response.status_code == 200:
            schedules = list_response.json()
            print(f"Number of schedules: {len(schedules)}")
        
        # Test schedule update
        update_data = {
            "title": "Updated Schedule",
            "subject": "Updated Subject",
            "description": "This schedule has been updated",
            "day_of_week": 2,
            "start_time": "11:00",
            "end_time": "13:00",
            "color": "#3366FF"
        }
        update_response = requests.put(f"{BASE_URL}/schedules/{schedule_id}", json=update_data)
        print(f"Schedule update status: {update_response.status_code}")
        
        # Test schedule deletion
        delete_response = requests.delete(f"{BASE_URL}/schedules/{schedule_id}")
        print(f"Schedule deletion status: {delete_response.status_code}")
        if delete_response.status_code == 200:
            print(f"Deletion message: {delete_response.json().get('message', '')}")
    else:
        print(f"Create schedule failed: {response.text}")

if __name__ == "__main__":
    test_pdf_upload()
    test_reminders()
    test_schedules()