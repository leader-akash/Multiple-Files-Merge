import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Use local worker script from pdfjs-dist
import { GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

function PDFViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully, pages:', numPages); // Debug
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setError(`Failed to load PDF preview: ${error.message}. The file may be corrupted or invalid.`);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <div className="flex flex-col items-center">
      {error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <button
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1}
              className="px-4 py-2 bg-blue-500 text-white rounded-l hover:bg-blue-600 disabled:bg-gray-400"
            >
              Previous
            </button>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 disabled:bg-gray-400"
            >
              Next
            </button>
          </div>
          <p className="text-center mb-4">
            Page {pageNumber} of {numPages || '...'}
          </p>
          <div className="flex justify-center w-full">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="border border-gray-300"
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={Math.min(800, window.innerWidth * 0.8)} // Responsive width
                renderMode="canvas" // Use canvas for better compatibility
              />
            </Document>
          </div>
        </>
      )}
    </div>
  );
}

export default PDFViewer;