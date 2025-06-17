import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  onAccept: () => void;
  onReject: () => void;
  isVisible: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldCode,
  newCode,
  onAccept,
  onReject,
  isVisible,
}) => {
  const diffStyles = {
    diffContainer: {
      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
      fontSize: '13px',
      backgroundColor: '#212121',
      color: '#ffffff',
    },
    diffAdded: {
      backgroundColor: 'rgba(0, 255, 0, 0.15)',
      color: '#ffffff',
    },
    diffRemoved: {
      backgroundColor: 'rgba(255, 0, 0, 0.15)',
      color: '#ffffff',
    },
    lineNumber: {
      color: '#888888',
      backgroundColor: '#2F2F2F',
    },
    wordAdded: {
      backgroundColor: 'rgba(0, 255, 0, 0.25)',
    },
    wordRemoved: {
      backgroundColor: 'rgba(255, 0, 0, 0.25)',
    },
    marker: {
      backgroundColor: '#2F2F2F',
    },
    codeFold: {
      backgroundColor: '#2F2F2F',
    },
    contentText: {
      color: '#ffffff',
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-6xl max-h-[90vh] border border-gray-600/30 rounded-3xl overflow-hidden"
            style={{ backgroundColor: '#212121' }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-600/30" style={{ backgroundColor: '#000000' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Review Changes</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Review the proposed changes to your LaTeX code
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onReject}
                    className="px-6 py-2 border border-gray-600/50 rounded-3xl text-gray-300 hover:text-white hover:border-gray-500/50 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onAccept}
                    className="px-6 py-2 rounded-3xl text-white font-medium hover:opacity-90 transition-all"
                    style={{ backgroundColor: '#2F2F2F' }}
                  >
                    Accept Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Diff Content */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <ReactDiffViewer
                oldValue={oldCode}
                newValue={newCode}
                splitView={true}
                useDarkTheme={true}
                leftTitle="Current Code"
                rightTitle="Proposed Changes"
                styles={diffStyles}
                hideLineNumbers={false}
                showDiffOnly={false}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-600/30" style={{ backgroundColor: '#000000' }}>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(0, 255, 0, 0.3)' }}></div>
                    <span>Added lines</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(255, 0, 0, 0.3)' }}></div>
                    <span>Removed lines</span>
                  </div>
                </div>
                <span>Press Esc to cancel, Enter to accept</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DiffViewer; 