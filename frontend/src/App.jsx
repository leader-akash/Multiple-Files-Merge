import React, { useState } from 'react';
import './App.css'; // Assuming you'll add Tailwind CSS or custom styles

function App() {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');

  const handleFileChange = (event) => {
    setFiles(event.target.files);
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      setMessage('Please select at least one file.');
      return;
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      const response = await fetch('http://localhost:5000/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to merge files');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage('Files merged successfully!');
    } catch (error) {
      setMessage('Error merging files: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">PDF Merger</h1>
        <input
          type="file"
          multiple
          accept=".ppt, .pptx, .xls, .xlsx, .pdf,.doc,.docx,.rtf,.txt,.ppt,.pptx,.xls,.xlsx"
          onChange={handleFileChange}
          className="w-full mb-4 p-2 border rounded"
        />
        <button
          onClick={handleMerge}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Merge Files
        </button>
        {message && (
          <p className="mt-4 text-center text-red-500">{message}</p>
        )}
      </div>
    </div>
  );
}

export default App;