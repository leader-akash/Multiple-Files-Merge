import React from 'react';
import { useDropzone } from 'react-dropzone';

function FileUploader({ onFilesSelected, files }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/rtf': ['.rtf'],
      'text/plain': ['.txt'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      // 'image/jpeg': ['.jpg', '.jpeg'],
      // 'image/png': ['.png'],
      // 'image/gif': ['.gif'],
      // 'image/bmp': ['.bmp'],
      // 'image/webp': ['.webp'],

    },
    multiple: true,
    onDrop: (acceptedFiles) => {
      onFilesSelected(acceptedFiles);
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-6 rounded-lg text-center ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">Drop the files here...</p>
        ) : (
          <p className="text-gray-600">
            Drag and drop files here, or click to select files <br />
            (Supported: .pdf, .doc, .docx, .rtf, .txt, .ppt, .pptx, .xls, .xlsx)
          </p>
        )}
      </div>
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Selected Files:</h3>
          <ul className="list-disc pl-5">
            {Array.from(files).map((file, index) => (
              <li key={index} className="text-gray-700">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FileUploader;