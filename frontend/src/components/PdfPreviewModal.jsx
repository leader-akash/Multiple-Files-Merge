import React, { memo, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import styles from '../styles/Modal.module.css';

const PdfPreviewModal = ({
  isOpen,
  previewUrl,
  pageNumber,
  numPages,
  scale,
  pdfError,
  setPageNumber,
  setNumPages,
  setScale,
  onClose,
  onDownload,
}) => {
  const canvasRef = useRef(null);

  // useEffect(() => {
  //   if (!isOpen || !previewUrl || !canvasRef.current) return;

  //   const renderPdf = async () => {
  //     try {
  //       const arrayBuffer = await fetch(previewUrl).then((res) => res.arrayBuffer());
  //       const pdfDoc = await PDFDocument.load(arrayBuffer);
  //       const pdfBytes = await pdfDoc.save();

  //       const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  //       setNumPages(pdf.numPages);

  //       const page = await pdf.getPage(pageNumber);
  //       const viewport = page.getViewport({ scale });

  //       const canvas = canvasRef.current;
  //       const context = canvas.getContext('2d');
  //       canvas.height = viewport.height;
  //       canvas.width = viewport.width;

  //       await page.render({ canvasContext: context, viewport }).promise;
  //     } catch (error) {
  //       console.error('PDF load error:', error);
  //     }
  //   };

  //   renderPdf();
  // }, [isOpen, previewUrl, pageNumber, scale, setNumPages]);


  // In PdfPreviewModal.js
  useEffect(() => {
    if (!isOpen || !previewUrl || !canvasRef.current) return;

    const renderPdf = async () => {
      try {
        // First try rendering with pdf-lib (better for images)
        const arrayBuffer = await fetch(previewUrl).then((res) => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pdfBytes = await pdfDoc.save();

        // Fallback to pdf.js if needed
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
      } catch (error) {
        console.error('PDF render error:', error);
        // Try alternative rendering for image-heavy PDFs
        try {
          const img = document.createElement('img');
          img.src = previewUrl;
          img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
          };
        } catch (fallbackError) {
          console.error('Fallback render failed:', fallbackError);
          setPdfError('Failed to render document. The file may contain unsupported elements.');
        }
      }
    };

    renderPdf();
  }, [isOpen, previewUrl, pageNumber, scale, setNumPages]);

  const changePage = (offset) => {
    setPageNumber((prev) => Math.max(1, Math.min(numPages, prev + offset)));
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
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
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {pdfError ? (
            <div className="text-red-500 p-6 text-center max-w-md">
              <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
              <p className="text-sm">{pdfError}</p>
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} className="border shadow-md bg-white" />
              {/* Fallback image display for image-only PDFs */}
              <img
                src={previewUrl}
                alt="PDF Preview"
                className="hidden"
                onError={(e) => {
                  // If canvas fails, try to show as image
                  if (pdfError) {
                    e.target.classList.remove('hidden');
                  }
                }}
              />
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
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
            onClick={onDownload}
            disabled={!!pdfError}
            className="px-4 py-2 bg-green-600 text-blue-500 rounded-md hover:bg-green-700 flex items-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(PdfPreviewModal);