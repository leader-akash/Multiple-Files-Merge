import React, { memo } from 'react';
import FileIcon from './FileIcon';

const FileList = ({ files, onClear, onRemove }) => {
  if (files.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Selected Files ({files.length})</h2>
        <button
          onClick={onClear}
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
                onClick={() => onRemove(index)}
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
  );
};

export default memo(FileList);