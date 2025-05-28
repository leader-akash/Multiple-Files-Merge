import React, { memo } from 'react';

const FileDropZone = ({ isDragging, setIsDragging, onFilesSelected }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    onFilesSelected(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    onFilesSelected(e.target.files);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50 isDragging' : 'border-gray-300 hover:border-blue-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.rtf,.txt,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.bmp,.gif"
        onChange={handleFileChange}
        className="hidden"
        id="fileInput"
      />
      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
        <svg className="w-12 h-12 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-600 mb-1">{isDragging ? 'Drop files here' : 'Drag and drop files or click to browse'}</p>
        <p className="text-xs text-gray-400"> Supported formats: PDF, DOC, DOCX, RTF, TXT, PPT, PPTX, XLS, XLSX, JPG, JPEG, PNG, BMP, GIF</p>
      </label>
    </div>
  );
};

export default memo(FileDropZone);