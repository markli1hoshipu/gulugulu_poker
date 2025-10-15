import React, { useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

/**
 * DeleteConfirmationModal - A reusable, accessible modal for delete confirmations
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed without deletion
 * @param {function} onCancel - Alternative callback (fallback for onClose)
 * @param {function} onConfirm - Callback when deletion is confirmed
 * @param {string} title - Modal title
 * @param {string} itemName - Name of the item being deleted (e.g., "Customer: Acme Corp")
 * @param {object} customer - Customer object (alternative to itemName, will use customer.company)
 * @param {string} itemType - Type of item (e.g., "customer", "deal", "note")
 * @param {string} warningMessage - Custom warning message
 * @param {array} relatedItems - Array of related items that will be affected
 * @param {boolean} isDeleting - Whether deletion is in progress
 * @param {string} deleteButtonText - Custom text for delete button
 */
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Deletion',
  itemName,
  customer,
  itemType = 'item',
  warningMessage,
  relatedItems = [],
  isDeleting = false,
  deleteButtonText = 'Delete'
}) => {
  // Support both onClose and onCancel for backward compatibility
  const handleClose = onClose || onCancel;

  // Extract itemName from customer object if provided
  const displayItemName = itemName || (customer?.company);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        handleClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isDeleting, handleClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      handleClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 id="delete-modal-title" className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          {!isDeleting && (
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Confirmation Message */}
          <div className="space-y-3">
            {displayItemName ? (
              <div>
                <p className="text-base text-gray-700 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-gray-900 px-1.5 py-0.5 bg-red-50 rounded">
                    {displayItemName}
                  </span>
                  ?
                </p>
              </div>
            ) : (
              <p className="text-base text-gray-700 leading-relaxed">
                Are you sure you want to delete this {itemType}?
              </p>
            )}

            {/* Warning Message */}
            {warningMessage ? (
              <p className="text-sm text-gray-600 leading-relaxed">{warningMessage}</p>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                This action cannot be undone. All associated data will be permanently deleted.
              </p>
            )}
          </div>

          {/* Related Items Warning */}
          {relatedItems && relatedItems.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    The following related items will also be affected:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                    {relatedItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-w-[100px] justify-center"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{deleteButtonText}</span>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

export default DeleteConfirmationModal;
