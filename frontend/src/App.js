import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

// PDF List Component
const PDFList = ({ pdfs, onDelete, onView }) => {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">My PDFs</h2>
      {pdfs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No PDFs uploaded yet. Upload your first PDF above!
        </p>
      ) : (
        <div className="space-y-4">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {pdf.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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

// Main Dashboard Component
const Dashboard = () => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState(null);

  useEffect(() => {
    fetchPdfs();
  }, []);

  const fetchPdfs = async () => {
    try {
      const response = await axios.get(`${API}/pdfs`);
      setPdfs(response.data);
    } catch (error) {
      console.error("Failed to fetch PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newPdf) => {
    setPdfs([newPdf, ...pdfs]);
  };

  const handleDelete = async (pdfId) => {
    if (window.confirm("Are you sure you want to delete this PDF?")) {
      try {
        await axios.delete(`${API}/pdfs/${pdfId}`);
        setPdfs(pdfs.filter((pdf) => pdf.id !== pdfId));
      } catch (error) {
        console.error("Failed to delete PDF:", error);
        alert("Failed to delete PDF");
      }
    }
  };

  const handleView = (pdf) => {
    setSelectedPdf(pdf);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                📚 University PDF Manager
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {pdfs.length} PDF{pdfs.length !== 1 ? "s" : ""} uploaded
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Manage Your University Documents
          </h2>
          <p className="text-gray-600">
            Upload, organize, and access your lecture notes, assignments, and study materials.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PDFUpload onUploadSuccess={handleUploadSuccess} />
            
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total PDFs</span>
                  <span className="font-semibold">{pdfs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Size</span>
                  <span className="font-semibold">
                    {(
                      pdfs.reduce((sum, pdf) => sum + pdf.file_size, 0) /
                      (1024 * 1024)
                    ).toFixed(1)}{" "}
                    MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subjects</span>
                  <span className="font-semibold">
                    {new Set(pdfs.map((pdf) => pdf.subject)).size}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            ) : (
              <PDFList
                pdfs={pdfs}
                onDelete={handleDelete}
                onView={handleView}
              />
            )}
          </div>
        </div>
      </main>

      {selectedPdf && (
        <PDFViewer
          pdfUrl={selectedPdf.file_url}
          onClose={() => setSelectedPdf(null)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <Dashboard />
    </div>
  );
}

export default App;