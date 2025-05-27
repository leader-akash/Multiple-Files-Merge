import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import FileDropZone from '../components/FileDropZone';
import FileList from '../components/FileList';
import MergeButton from '../components/MergeButton';
import PdfPreviewModal from '../components/PdfPreviewModal';
import Message from '../components/Message';
import PurchaseButton from '../components/PurchaseButton';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

function HomePage() {
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
    const [isPurchaseButton, setIsPurchaseButton] = useState(false);


    const showMessage = useCallback((text, type = 'info') => {
        setMessage({ text, type });
        if (!isPurchaseButton)
            setTimeout(() => setMessage({ text: '', type: '' }), 8000);
    }, []);

    const handleFiles = useCallback(
        (newFiles) => {
            const validFiles = Array.from(newFiles).filter((file) =>
                ['.pdf', '.doc', '.docx', '.rtf', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'].includes(
                    file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
                )
            );

            if (validFiles.length === 0) {
                showMessage('No valid files selected. Please use supported file types.', 'error');
                return;
            }

            if (validFiles.length > 3) {
                showMessage('Only 3 files can be merged at a time. Please purchase a subscription plan for extra files.', 'error');
                setIsPurchaseButton(true);
                return;
            }

            setIsPurchaseButton(false);

            setFiles(validFiles);
            showMessage(`${validFiles.length} file(s) selected`, 'success');
            setPdfError(null);
        },
        [showMessage]
    );

    const handleMerge = useCallback(async () => {
        if (files.length === 0) {
            showMessage('Please select at least one file.', 'error');
            return;
        }

        setIsMerging(true);
        showMessage('Merging files...', 'info');

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
            setPdfError(error.message);
            showMessage(`Failed to merge files: ${error.message}`, 'error');
        } finally {
            setIsMerging(false);
        }
    }, [files, showMessage]);

    const handleDownload = useCallback(() => {
        if (previewUrl) {
            const link = document.createElement('a');
            link.href = previewUrl;
            link.download = `merged-${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage('Download started!', 'success');
        }
    }, [previewUrl, showMessage]);

    const clearFiles = useCallback(() => {
        setFiles([]);
        showMessage('Files cleared', 'info');
        setPdfError(null);
    }, [showMessage]);

    const removeFile = useCallback(
        (index) => {
            setFiles((prev) => prev.filter((_, i) => i !== index));
            showMessage('File removed', 'info');
        },
        [showMessage]
    );

    useEffect(() => {
        // Reset preview state when files change
        if (files.length > 3) {
            showMessage('Only 3 files will be merged, Purchase a subscription for more than 3 files merge', 'info');
        }
    }, [files])

    // Clean up preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
            <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">PDF Merger</h1>
            <p className="text-sm text-gray-500 mb-4 text-center">
                Combine PDFs, Word, Excel, PowerPoint, and text files into one PDF
            </p>

            <FileDropZone
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                onFilesSelected={handleFiles}
            />
            <FileList files={files} onClear={clearFiles} onRemove={removeFile} />
            <MergeButton onMerge={handleMerge} disabled={files.length > 3 || files?.length === 0 || isMerging} isMerging={isMerging} />
            <PurchaseButton />
            
            <Message message={message} />
            <PdfPreviewModal
                isOpen={isPreviewOpen}
                previewUrl={previewUrl}
                pageNumber={pageNumber}
                numPages={numPages}
                scale={scale}
                pdfError={pdfError}
                setPageNumber={setPageNumber}
                setNumPages={setNumPages}
                setScale={setScale}
                onClose={() => {
                    setIsPreviewOpen(false);
                    setPreviewUrl(null);
                    setNumPages(null);
                    setPageNumber(1);
                    setScale(1.0);
                    setPdfError(null);
                }}
                onDownload={handleDownload}
            />
        </div>
    );
}

export default HomePage;