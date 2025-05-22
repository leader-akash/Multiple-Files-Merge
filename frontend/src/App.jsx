import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import './App.css';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const canvasRef = useRef(null);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Render PDF page when preview is open
  useEffect(() => {
    if (isPreviewOpen && previewUrl && canvasRef.current) {
      const renderPdf = async () => {
        try {
          // Load PDF with pdf-lib to validate
          const arrayBuffer = await fetch(previewUrl).then((res) => res.arrayBuffer());
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pdfBytes = await pdfDoc.save();

          // Load PDF with pdf.js for rendering
          const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
          setNumPages(pdf.numPages);

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale });

          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
          setPdfError(null);
        } catch (error) {
          console.error('PDF load error:', error);
          setPdfError('Failed to load PDF: ' + error.message);
          showMessage('Failed to load PDF preview', 'error');
        }
      };
      renderPdf();
    }
  }, [isPreviewOpen, previewUrl, pageNumber, scale]);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files).filter((file) =>
      ['.pdf', '.doc', '.docx', '.rtf', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'].includes(
        file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      )
    );

    if (selectedFiles.length === 0) {
      showMessage('No valid files selected. Please use supported file types.', 'error');
      return;
    }

    setFiles(selectedFiles);
    showMessage(`${selectedFiles.length} file(s) selected`, 'success');
    setPdfError(null);
  };

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      ['.pdf', '.doc', '.docx', '.rtf', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'].includes(
        file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      )
    );

    if (droppedFiles.length === 0) {
      showMessage('No valid files dropped. Please use supported file types.', 'error');
      return;
    }

    setFiles(droppedFiles);
    showMessage(`${droppedFiles.length} file(s) added`, 'success');
    setPdfError(null);
  }, []);

  const handleMerge = async () => {
    if (files.length === 0) {
      showMessage('Please select at least one file.', 'error');
      return;
    }

    setIsMerging(true);
    showMessage('Merging files...', 'info');
    setPdfError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch('http://localhost:5000/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const blob = await response.blob();
      if (blob.type !== 'application/pdf') {
        throw new Error('The merged file is not a valid PDF');
      }

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
      setPageNumber(1);
      showMessage('Files merged successfully!', 'success');
    } catch (error) {
      console.error('Merge error:', error);
      setPdfError(error.message);
      showMessage(`Failed to merge files: ${error.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `merged-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showMessage('Download started!', 'success');
    }
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewUrl(null);
    setNumPages(null);
    setPageNumber(1);
    setScale(1.0);
    setPdfError(null);
  };

  const clearFiles = () => {
    setFiles([]);
    showMessage('Files cleared', 'info');
    setPdfError(null);
  };

  const changePage = (offset) => {
    setPageNumber((prev) => Math.max(1, Math.min(numPages, prev + offset)));
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    showMessage('File removed', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">PDF Merger</h1>
        <p className="text-sm text-gray-500 mb-4 text-center">
          Combine PDFs, Word, Excel, PowerPoint, and text files into one PDF
        </p>

        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.rtf,.txt,.ppt,.pptx,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />
          <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
            <svg className="w-12 h-12 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600 mb-1">
              {isDragging ? 'Drop files here' : 'Drag and drop files or click to browse'}
            </p>
            <p className="text-xs text-gray-400">Supported formats: PDF, DOC, DOCX, RTF, TXT, PPT, PPTX, XLS, XLSX</p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Selected Files ({files.length})</h2>
              <button
                onClick={clearFiles}
                className="text-sm text-red-500 hover:text-red-700 hover:underline"
              >
                Clear All
              </button>
            </div>
            <ul className="max-h-48 overflow-y-auto border rounded divide-y">
              {files.map((file, index) => (
                <li key={index} className="p-2 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <FileIcon extension={file.name.split('.').pop().toLowerCase()} />
                    <span className="truncate ml-2 text-sm">{file.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-600 p-1"
                      aria-label="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleMerge}
          disabled={files.length === 0 || isMerging}
          className={`w-full py-3 px-4 rounded-md font-medium flex items-center justify-center transition-colors ${
            files.length === 0 || isMerging
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
          }`}
        >
          {isMerging ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Merging...
            </>
          ) : (
            'Merge Files'
          )}
        </button>

        {message.text && (
          <div className={`mt-4 p-3 rounded text-sm ${
            message.type === 'error' ? 'bg-red-100 text-red-700' :
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">PDF Preview</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                  aria-label="Zoom out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 2.5}
                  className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                  aria-label="Zoom in"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
              <button
                onClick={closePreview}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex justify-center items-center bg-gray-100">
              {pdfError ? (
                <div className="text-red-500 p-6 text-center max-w-md">
                  <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                  <p className="text-sm">{pdfError}</p>
                </div>
              ) : (
                <canvas ref={canvasRef} className="border shadow-md bg-white" />
              )}
            </div>

            <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 bg-gray-50">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1}
                  className="px-3 py-1 bg-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-300 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page <span className="font-medium">{pageNumber}</span> of{' '}
                  <span className="font-medium">{numPages || '--'}</span>
                </span>
                <button
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= (numPages || 0)}
                  className="px-3 py-1 bg-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-300 flex items-center"
                >
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleDownload}
                disabled={!!pdfError}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FileIcon = ({ extension }) => {
  const iconMap = {
    pdf: 'M4 4v16a2 2 0 002 2h12a2 2 0 002-2V8M4 4l5-5h7l5 5M9 13h6m-6 4h6m2-9h-4V4',
    doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    docx: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    rtf: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    txt: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    ppt: 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7m-7 3v2m-4-2v2m8-2v2',
    pptx: 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7m-7 3v2m-4-2v2m8-2v2',
    xls: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    xlsx: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    default: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  };

  const color = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    rtf: 'text-blue-400',
    txt: 'text-gray-500',
    ppt: 'text-orange-500',
    pptx: 'text-orange-500',
    xls: 'text-green-500',
    xlsx: 'text-green-500',
    default: 'text-gray-400',
  }[extension] || 'text-gray-400';

  return (
    <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconMap[extension] || iconMap.default} />
    </svg>
  );
};

export default App;







{/*
 import React, { useState } from 'react';
import Modal from 'react-modal';
import './App.css';
import PDFViewer from './components/PDFViewer';
import FileUploader from './components/FileUploader';

// Bind modal to app element for accessibility
Modal.setAppElement('#root');

function App() {
  const [files, setFiles] = useState([]);
  const [mergedPdfUrl, setMergedPdfUrl] = useState(null);
  const [mergedPdfBlob, setMergedPdfBlob] = useState(null); // Store blob for download
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFilesSelected = (selectedFiles) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = Array.from(selectedFiles).filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      setMessage('Some files exceed 10MB limit.');
      setFiles([]);
      return;
    }
    setFiles(selectedFiles);
    setMessage('');
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    setIsModalOpen(false); // Close modal on new file selection
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
      setMessage('Merging files...');
      const response = await fetch('http://localhost:5000/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to merge files: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Blob type:', blob.type, 'Size:', blob.size); // Debug blob
      if (blob.type !== 'application/pdf' || blob.size === 0) {
        throw new Error('Received file is not a valid PDF');
      }

      const url = window.URL.createObjectURL(blob);
      setMergedPdfUrl(url);
      setMergedPdfBlob(blob); // Store blob for download
      setIsModalOpen(true); // Open modal for preview
      setMessage('Files merged successfully! Preview in modal.');
    } catch (error) {
      console.error('Merge error:', error);
      setMessage('Error merging files: ' + error.message);
      setMergedPdfUrl(null);
      setMergedPdfBlob(null);
      setIsModalOpen(false);
    }
  };

  const handleDownload = () => {
    if (mergedPdfBlob) {
      const url = window.URL.createObjectURL(mergedPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (mergedPdfUrl) {
      window.URL.revokeObjectURL(mergedPdfUrl); // Clean up blob URL
      setMergedPdfUrl(null);
      setMergedPdfBlob(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">PDF Merger</h1>
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
        <FileUploader onFilesSelected={handleFilesSelected} files={files} />
        <button
          onClick={handleMerge}
          disabled={files.length === 0}
          className="w-full bg-blue-500 text-white p-2 rounded mt-4 hover:bg-blue-600 disabled:bg-gray-400"
        >
          Merge Files
        </button>
        {message && (
          <p className={`mt-4 text-center ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="bg-white p-6 rounded-lg max-w-4xl w-full mx-auto my-8 max-h-[80vh] overflow-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        contentLabel="PDF Preview Modal"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">PDF Preview</h2>
          <div>
            <button
              onClick={handleDownload}
              disabled={!mergedPdfBlob}
              className="px-4 py-2 bg-green-500 text-white rounded mr-2 hover:bg-green-600 disabled:bg-gray-400"
            >
              Download
            </button>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
        {mergedPdfUrl ? (
          <PDFViewer pdfUrl={mergedPdfUrl} />
        ) : (
          <p className="text-red-500 text-center">No PDF available for preview</p>
        )}
      </Modal>
    </div>
  );
}

export default App; 
  */}