import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Navigation Component
const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📚' },
    { id: 'pdfs', name: 'My PDFs', icon: '📄' },
    { id: 'reminders', name: 'Reminders', icon: '⏰' },
    { id: 'scheduler', name: 'Scheduler', icon: '📅' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              🎓 University PDF Manager
            </h1>
          </div>
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

// PDF Viewer Component
const PDFViewer = ({ pdfUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-4xl max-h-full overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">PDF Viewer</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        <iframe
          src={`${BACKEND_URL}${pdfUrl}`}
          className="w-full h-96 border-0"
          title="PDF Viewer"
        />
      </div>
    </div>
  );
};

// PDF Upload Component
const PDFUpload = ({ onUploadSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", formData.file);
    uploadData.append("title", formData.title);
    uploadData.append("subject", formData.subject);
    uploadData.append("description", formData.description);

    try {
      const response = await axios.post(`${API}/pdfs/upload`, uploadData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      onUploadSuccess(response.data);
      setFormData({ title: "", subject: "", description: "", file: null });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload PDF</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter PDF title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            required
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Mathematics, Physics, Computer Science"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="Brief description of the document"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PDF File
          </label>
          <input
            type="file"
            accept=".pdf"
            required
            onChange={(e) =>
              setFormData({ ...formData, file: e.target.files[0] })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </form>
    </div>
  );
};

// Subject-wise PDF Organization Component
const SubjectPDFs = ({ pdfs, onDelete, onView, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredPdfs = selectedSubject === 'all' 
    ? pdfs 
    : pdfs.filter(pdf => pdf.subject === selectedSubject);

  const subjectColors = {
    'Mathematics': 'bg-blue-100 text-blue-800',
    'Physics': 'bg-green-100 text-green-800',
    'Chemistry': 'bg-purple-100 text-purple-800',
    'Computer Science': 'bg-indigo-100 text-indigo-800',
    'Biology': 'bg-pink-100 text-pink-800',
    'default': 'bg-gray-100 text-gray-800'
  };

  const getSubjectColor = (subject) => {
    return subjectColors[subject] || subjectColors.default;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">My PDFs</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedSubject === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({pdfs.length})
          </button>
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedSubject === subject
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {subject} ({pdfs.filter(pdf => pdf.subject === subject).length})
            </button>
          ))}
        </div>
      </div>

      {filteredPdfs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {selectedSubject === 'all' 
            ? "No PDFs uploaded yet. Upload your first PDF!"
            : `No PDFs found for ${selectedSubject}.`
          }
        </p>
      ) : (
        <div className="grid gap-4">
          {filteredPdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {pdf.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubjectColor(pdf.subject)}`}>
                      {pdf.subject}
                    </span>
                    <span>{formatFileSize(pdf.file_size)}</span>
                    <span>{formatDate(pdf.upload_date)}</span>
                  </div>
                  {pdf.description && (
                    <p className="text-gray-600 text-sm">{pdf.description}</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => onView(pdf)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
                  >
                    View
                  </button>
                  <a
                    href={`${BACKEND_URL}${pdf.file_url}`}
                    download={pdf.filename}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => onDelete(pdf.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Reminders Component
const RemindersPage = () => {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    subject: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await axios.get(`${API}/reminders`);
      setReminders(response.data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/reminders`, formData);
      setReminders([response.data, ...reminders]);
      setFormData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        subject: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create reminder:', error);
      alert('Failed to create reminder');
    }
  };

  const toggleComplete = async (reminderId) => {
    try {
      const response = await axios.patch(`${API}/reminders/${reminderId}/complete`);
      setReminders(reminders.map(reminder => 
        reminder.id === reminderId ? response.data : reminder
      ));
    } catch (error) {
      console.error('Failed to toggle reminder:', error);
    }
  };

  const deleteReminder = async (reminderId) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await axios.delete(`${API}/reminders/${reminderId}`);
        setReminders(reminders.filter(reminder => reminder.id !== reminderId));
      } catch (error) {
        console.error('Failed to delete reminder:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate + 'T00:00:00');
    return due < today;
  };

  const sortedReminders = reminders.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(a.due_date) - new Date(b.due_date);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reminders & Deadlines</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Reminder'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Reminder</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Assignment, Exam, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Time (Optional)
                </label>
                <input
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({...formData, due_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Additional details about this reminder"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Reminder
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Reminders</h3>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : sortedReminders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No reminders yet. Create your first reminder to stay organized!
          </p>
        ) : (
          <div className="space-y-4">
            {sortedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`border rounded-lg p-4 transition-colors ${
                  reminder.completed 
                    ? 'bg-gray-50 border-gray-200 opacity-60' 
                    : isOverdue(reminder.due_date)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="checkbox"
                        checked={reminder.completed}
                        onChange={() => toggleComplete(reminder.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <h4 className={`font-semibold ${reminder.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {reminder.title}
                      </h4>
                      {reminder.subject && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {reminder.subject}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className={`font-medium ${isOverdue(reminder.due_date) && !reminder.completed ? 'text-red-600' : ''}`}>
                        📅 {formatDate(reminder.due_date)}
                        {reminder.due_time && ` at ${reminder.due_time}`}
                        {isOverdue(reminder.due_date) && !reminder.completed && ' (Overdue)'}
                      </span>
                    </div>
                    {reminder.description && (
                      <p className={`text-sm ${reminder.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {reminder.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="ml-4 text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Scheduler Component
const SchedulerPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    day_of_week: 0,
    start_time: '',
    end_time: '',
    color: '#3B82F6'
  });
  const [loading, setLoading] = useState(true);

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const colors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Pink', value: '#EC4899' }
  ];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/schedules`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/schedules`, formData);
      setSchedules([...schedules, response.data]);
      setFormData({
        title: '',
        subject: '',
        description: '',
        day_of_week: 0,
        start_time: '',
        end_time: '',
        color: '#3B82F6'
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule');
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await axios.delete(`${API}/schedules/${scheduleId}`);
        setSchedules(schedules.filter(schedule => schedule.id !== scheduleId));
      } catch (error) {
        console.error('Failed to delete schedule:', error);
      }
    }
  };

  const getSchedulesForDay = (dayIndex) => {
    return schedules
      .filter(schedule => schedule.day_of_week === dayIndex)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Weekly Scheduler</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Schedule'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Schedule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Lecture, Lab, Study Session"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {daysOfWeek.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex space-x-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({...formData, color: color.value})}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color.value ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Room number, professor, notes, etc."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add to Schedule
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly Calendar</h3>
        {loading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-7 gap-4">
              {Array.from({length: 7}).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {daysOfWeek.map((day, dayIndex) => (
              <div key={dayIndex} className="border rounded-lg p-3">
                <h4 className="font-semibold text-gray-800 mb-3 text-center">
                  {day}
                </h4>
                <div className="space-y-2">
                  {getSchedulesForDay(dayIndex).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-2 rounded text-white text-xs relative group"
                      style={{ backgroundColor: schedule.color }}
                    >
                      <div className="font-medium">{schedule.subject}</div>
                      <div className="text-xs opacity-90">
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                      <div className="text-xs opacity-80">{schedule.title}</div>
                      <button
                        onClick={() => deleteSchedule(schedule.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-white hover:text-red-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {getSchedulesForDay(dayIndex).length === 0 && (
                    <div className="text-gray-400 text-xs text-center py-4">
                      No classes
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ pdfs, reminders, schedules }) => {
  const upcomingReminders = reminders
    .filter(r => !r.completed)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3);

  const todaySchedules = schedules.filter(s => 
    s.day_of_week === new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );

  const subjectStats = pdfs.reduce((acc, pdf) => {
    acc[pdf.subject] = (acc[pdf.subject] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Overview */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total PDFs</h3>
                <p className="text-2xl font-bold text-gray-900">{pdfs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">⏰</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pending Reminders</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {reminders.filter(r => !r.completed).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">📅</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Today's Classes</h3>
                <p className="text-2xl font-bold text-gray-900">{todaySchedules.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">🎯</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Subjects</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(subjectStats).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Reminders</h3>
          {upcomingReminders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming reminders</p>
          ) : (
            <div className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">{reminder.title}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(reminder.due_date + 'T00:00:00').toLocaleDateString()}
                      {reminder.due_time && ` at ${reminder.due_time}`}
                    </p>
                  </div>
                  {reminder.subject && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {reminder.subject}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
          {todaySchedules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No classes today</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((schedule) => (
                  <div 
                    key={schedule.id} 
                    className="p-3 rounded-lg text-white"
                    style={{ backgroundColor: schedule.color }}
                  >
                    <h4 className="font-medium">{schedule.subject}</h4>
                    <p className="text-sm opacity-90">
                      {schedule.start_time} - {schedule.end_time}
                    </p>
                    <p className="text-xs opacity-80">{schedule.title}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pdfs, setPdfs] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [pdfsRes, remindersRes, schedulesRes] = await Promise.all([
        axios.get(`${API}/pdfs`),
        axios.get(`${API}/reminders`),
        axios.get(`${API}/schedules`)
      ]);
      
      setPdfs(pdfsRes.data);
      setReminders(remindersRes.data);
      setSchedules(schedulesRes.data);
      
      // Extract unique subjects
      const uniqueSubjects = [...new Set(pdfsRes.data.map(pdf => pdf.subject))];
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newPdf) => {
    setPdfs([newPdf, ...pdfs]);
    if (!subjects.includes(newPdf.subject)) {
      setSubjects([...subjects, newPdf.subject]);
    }
  };

  const handleDeletePdf = async (pdfId) => {
    if (window.confirm('Are you sure you want to delete this PDF?')) {
      try {
        await axios.delete(`${API}/pdfs/${pdfId}`);
        setPdfs(pdfs.filter(pdf => pdf.id !== pdfId));
      } catch (error) {
        console.error('Failed to delete PDF:', error);
        alert('Failed to delete PDF');
      }
    }
  };

  const handleViewPdf = (pdf) => {
    setSelectedPdf(pdf);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <Dashboard pdfs={pdfs} reminders={reminders} schedules={schedules} />
        )}
        
        {activeTab === 'pdfs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <PDFUpload onUploadSuccess={handleUploadSuccess} />
            </div>
            <div className="lg:col-span-2">
              <SubjectPDFs 
                pdfs={pdfs} 
                subjects={subjects}
                onDelete={handleDeletePdf}
                onView={handleViewPdf}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'reminders' && <RemindersPage />}
        
        {activeTab === 'scheduler' && <SchedulerPage />}
      </main>

      {selectedPdf && (
        <PDFViewer
          pdfUrl={selectedPdf.file_url}
          onClose={() => setSelectedPdf(null)}
        />
      )}
    </div>
  );
}

export default App;