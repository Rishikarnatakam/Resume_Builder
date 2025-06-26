import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useResume } from '../context/ResumeContext';
import { motion } from 'framer-motion';
import AIChat, { AIChatRef } from '../components/AIChat';
import ThreePanelSplitter from '../components/ThreePanelSplitter';

const LaTeXEditor: React.FC = () => {
  const { resumeId } = useParams<{ resumeId?: string }>();
  const { user, logout } = useAuth();
  const { setCurrentResume } = useResume();
  
  const [latexContent, setLatexContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileLog, setCompileLog] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [resumeTitle, setResumeTitle] = useState<string>('Untitled Resume');
  
  // New states for AI chat and inline editing
  const [proposedLatex, setProposedLatex] = useState<string>('');
  const [showInlineChanges, setShowInlineChanges] = useState(false);
  const [editorDecorations, setEditorDecorations] = useState<any[]>([]);
  
  // Auto-save states
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const editorRef = useRef<any>(null);
  const aiChatRef = useRef<AIChatRef>(null);
  const API_BASE = 'http://localhost:8000/api';

  // Utility function to format time since last save
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString();
  };

  // Debug logging for inline changes state
  useEffect(() => {
    console.log('🔍 EDITOR: showInlineChanges changed to:', showInlineChanges, 'proposedLatex length:', proposedLatex.length);
  }, [showInlineChanges, proposedLatex]);

  // Apply Monaco decorations when they change
  useEffect(() => {
    if (editorRef.current && editorDecorations.length > 0) {
      editorRef.current.deltaDecorations([], editorDecorations);
    }
  }, [editorDecorations]);

  // Load resume if resumeId is provided
  useEffect(() => {
    if (resumeId && user) {
      loadResume(parseInt(resumeId));
    } else {
      // Start with empty template
      setLatexContent(`\\documentclass{resume}
\\begin{document}

\\name{Your Name}
\\address{Email: your.email@example.com | Phone: (123) 456-7890 | Location: City, State}

\\begin{rSection}{Professional Summary}
Write your professional summary here...
\\end{rSection}

\\begin{rSection}{Experience}
\\begin{rSubsection}{Company Name}{Start - End Date}{Job Title}{Location}
\\resumeItem{Achievement or responsibility that demonstrates relevant skills}
\\resumeItem{Another achievement with quantifiable results}
\\end{rSubsection}
\\end{rSection}

\\begin{rSection}{Education}
\\begin{rSubsection}{University Name}{Graduation Date}{Degree}{Location}
\\end{rSubsection}
\\end{rSection}

\\begin{rSection}{Skills}
Programming Languages, Frameworks, Tools, etc.
\\end{rSection}

\\end{document}`);
    }
  }, [resumeId, user]);

  // Auto-save effect - debounced save when content changes
  useEffect(() => {
    if (!resumeId) return; // Only auto-save existing resumes
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveResume();
    }, 2000); // Save after 2 seconds of inactivity

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [latexContent, resumeTitle, jobDescription, resumeId]);

  const loadResume = async (id: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/resumes/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const resume = await response.json();
        setCurrentResume(resume);
        setLatexContent(resume.latex_content || '');
        setJobDescription(resume.job_description || '');
        setResumeTitle(resume.title || 'Untitled Resume');
        setLastSaved(new Date(resume.updated_at));
      }
    } catch (error) {
      console.error('Failed to load resume:', error);
    }
  };

  const autoSaveResume = async () => {
    if (!resumeId || isSaving) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/resumes/${resumeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: resumeTitle,
          latex_content: latexContent,
          job_description: jobDescription
        }),
      });

      if (response.ok) {
        const savedResume = await response.json();
        setCurrentResume(savedResume);
        setLastSaved(new Date());
        console.log('✅ Auto-saved resume successfully');
      } else {
        console.error('❌ Auto-save failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const compileLatexWithContent = async (overrideContent?: string) => {
    // Use override content if provided, otherwise use current state
    const contentToCompile = overrideContent || latexContent;
    
    if (!contentToCompile.trim()) return;

    setIsCompiling(true);
    setCompileLog('');

    try {
      const token = localStorage.getItem('access_token');
      console.log('🔄 Starting LaTeX compilation...', {
        contentLength: contentToCompile.length,
        isOverride: !!overrideContent
      });
      
      const response = await fetch(`${API_BASE}/latex/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latex_content: contentToCompile,
          compiler: 'pdflatex',
          resume_title: resumeTitle
        }),
      });

      console.log('📊 Compile response status:', response.status);
      const result = await response.json();
      console.log('📊 Compile response data:', result);

      if (result.success && result.pdf_url) {
        const fullPdfUrl = `http://localhost:8000${result.pdf_url}`;
        console.log('✅ Compilation successful!');
        console.log('📄 PDF URL from server:', result.pdf_url);
        console.log('📄 Full PDF URL:', fullPdfUrl);
        
        setPdfUrl(fullPdfUrl);
        setCompileLog(result.log_output || '');
        
        // Debug logging
        console.log('📝 Compilation log details:', {
          hasLogOutput: !!result.log_output,
          logLength: result.log_output?.length || 0,
          logPreview: result.log_output?.substring(0, 200) || 'No log'
        });
        
        // Log will always be visible in dedicated section
        
        // Test if PDF is accessible
        try {
          const pdfTest = await fetch(fullPdfUrl);
          console.log('📊 PDF accessibility test:', pdfTest.status, pdfTest.statusText);
          console.log('📊 PDF content-type:', pdfTest.headers.get('content-type'));
        } catch (pdfError) {
          console.error('❌ PDF accessibility test failed:', pdfError);
        }
      } else {
        console.error('❌ Compilation failed:', result);
        setCompileLog(result.log_output || result.errors || 'Compilation failed');
      }
    } catch (error) {
      console.error('❌ Compile error:', error);
      setCompileLog(`Error: ${error}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // Wrapper for onClick handlers that don't need content override
  const compileLatex = () => compileLatexWithContent();

  const generateWithAI = async () => {
    if (!jobDescription.trim()) {
      alert('Please enter a job description first');
      return;
    }

    // Expert ATS-focused LaTeX generation prompt
    const tailoringPrompt = `You are an expert LaTeX resume generator specializing in ATS-friendly, machine-readable resumes.

TARGET POSITION:
${jobDescription}

TASK: Generate a complete, ATS-optimized LaTeX resume using my existing template and data.

REQUIREMENTS:
✅ ATS-FRIENDLY: Use clear section headers, standard fonts, proper spacing
✅ MACHINE-READABLE: Avoid complex formatting, tables, or graphics that confuse ATS
✅ KEYWORD-OPTIMIZED: Include relevant keywords from the job description naturally
✅ QUANTIFIED IMPACT: Use specific numbers, percentages, and metrics
✅ TEMPLATE-COMPLIANT: Keep exact same LaTeX structure and commands

OUTPUT: Return ONLY the complete LaTeX code from \\documentclass{} to \\end{document}. No explanations or commentary.

Tailor the content to match this specific role while maintaining professional, scannable formatting.`;

    // Populate AI chat input, focus it, and auto-send
    aiChatRef.current?.populateInput(tailoringPrompt);
    aiChatRef.current?.focusInput();
    
    // Auto-send the message after a brief delay to ensure input is populated
    setTimeout(() => {
      aiChatRef.current?.sendMessage();
    }, 100);
    
    // Close the job form
        setShowJobForm(false);
  };

  const downloadPDF = async () => {
    if (!pdfUrl) {
      alert('Please compile the PDF first before downloading');
      return;
    }

    setIsDownloading(true);
    try {
      // Method 1: Try to find and click the PDF viewer's download button
      const iframe = document.querySelector('iframe[title="PDF Preview"]') as HTMLIFrameElement;
      if (iframe?.contentDocument) {
        // Look for download button in PDF viewer
        const downloadButton = iframe.contentDocument.querySelector('[title="Download"], [aria-label="Download"], button[download]');
        if (downloadButton) {
          (downloadButton as HTMLElement).click();
          console.log('📥 Used PDF viewer download button');
          return;
        }
      }
      
      // Method 2: Force download using fetch + blob (more reliable)
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      // Create filename from resume title
      const filename = resumeTitle ? 
        `${resumeTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.pdf` : 
        'resume.pdf';
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('📥 Download triggered using blob method:', filename);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle AI chat proposing new LaTeX code - now with inline editing
  const handleAILatexChange = (newLatex: string) => {
    if (newLatex !== latexContent) {
      setShowInlineChanges(true);
      // Store original content for reject functionality
      setProposedLatex(latexContent); // Store ORIGINAL, not new
      createInlineDecorations(latexContent, newLatex);
    }
  };

  // Create clean merged content with visual-only diff
  const createInlineDecorations = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const mergedLines: string[] = [];
    
    // Simple line-by-line comparison
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine !== newLine) {
        // Add old line as comment (will be styled red)
        if (oldLine.trim()) {
          mergedLines.push(`%% ${oldLine}`);
        }
        // Add new line normally (will be styled green)
        if (newLine.trim()) {
          mergedLines.push(newLine);
        }
        // PRESERVE EMPTY LINES - check if newLine is empty but should be kept
        if (newLine === '' && oldLine !== '') {
          mergedLines.push(''); // Add empty line
        }
      } else {
        // Unchanged line
        if (oldLine.trim() || newLine.trim()) {
          mergedLines.push(oldLine || newLine);
        } else if (oldLine === '' || newLine === '') {
          // Preserve empty lines even if they're "unchanged"
          mergedLines.push('');
        }
      }
    }
    
    // Update the editor content with merged version
    const mergedContent = mergedLines.join('\n');
    setLatexContent(mergedContent);
    
    // Create decorations for styling
    setTimeout(() => applyDiffStyling(mergedContent), 100);
    
    // Auto-compile to show what the result would look like
    setTimeout(() => {
      try {
        const cleanContent = mergedContent
          .split('\n')
          .filter(line => !line.trim().startsWith('%%'))  // Remove red lines but KEEP empty lines
          .join('\n');
        
        console.log('🔄 Auto-compiling cleaned content:', cleanContent.length, 'characters');
        
        if (cleanContent.trim()) {
          compileLatexWithContent(cleanContent);
        } else {
          console.log('⚠️ Skipping compilation - no content after cleaning');
        }
      } catch (error) {
        console.error('❌ Auto-compilation error:', error);
      }
    }, 500);
  };

  // Apply red/green styling based on line content
  const applyDiffStyling = (content: string) => {
    if (!editorRef.current) return;
    
    const lines = content.split('\n');
    const decorations: any[] = [];
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('%%')) {
        // Red styling for old content (commented lines)
        decorations.push({
          range: { startLineNumber: index + 1, startColumn: 1, endLineNumber: index + 1, endColumn: 1000 },
          options: {
            isWholeLine: true,
            className: 'diff-line-red',
            minimap: { color: '#ef4444', position: 2 }
          }
        });
      } else if (isNewContentLine(line, index, lines)) {
        // Green styling for new content
        decorations.push({
          range: { startLineNumber: index + 1, startColumn: 1, endLineNumber: index + 1, endColumn: 1000 },
          options: {
            isWholeLine: true,
            className: 'diff-line-green',
            minimap: { color: '#22c55e', position: 2 }
          }
        });
      }
    });
    
    setEditorDecorations(decorations);
    editorRef.current.deltaDecorations([], decorations);
  };

  // Helper to detect if a line is new content (follows a %% line or is substantially different)
  const isNewContentLine = (line: string, index: number, allLines: string[]) => {
    if (line.trim() === '' || line.trim().startsWith('%%')) return false;
    
    // Check if previous line was a comment (indicating this is replacement content)
    if (index > 0 && allLines[index - 1].trim().startsWith('%%')) {
      return true;
    }
    
    // For now, we'll be conservative and only highlight lines that follow %% comments
    return false;
  };

  // Handle individual line clicks for accept/reject
  const handleLineClick = (lineNumber: number) => {
    const lines = latexContent.split('\n');
    const clickedLine = lines[lineNumber - 1]; // Convert to 0-based index
    
    if (!clickedLine) {
      console.log('❌ No line found at:', lineNumber);
      return;
    }
    
    console.log('🖱️ Clicked line:', lineNumber, 'Content:', `"${clickedLine}"`);
    console.log('🔍 Is red line (comment)?', clickedLine.trim().startsWith('%%'));
    console.log('🔍 Is green line (new)?', isNewContentLine(clickedLine, lineNumber - 1, lines));
    
    if (clickedLine.trim().startsWith('%%')) {
      // Clicked on RED line (old content) - REJECT this change
      console.log('🔴 Rejecting red line');
      handleIndividualReject(lineNumber, lines);
    } else if (isNewContentLine(clickedLine, lineNumber - 1, lines)) {
      // Clicked on GREEN line (new content) - ACCEPT this change  
      console.log('🟢 Accepting green line');
      handleIndividualAccept(lineNumber, lines);
    } else {
      console.log('⚪ Clicked on unchanged line - no action');
    }
  };

  // Accept individual change (keep green line, remove red line above it)
  const handleIndividualAccept = (greenLineNumber: number, allLines: string[]) => {
    const newLines = [...allLines];
    const greenIndex = greenLineNumber - 1;
    
    // Find and remove the red line (comment) that this green line replaces
    if (greenIndex > 0 && newLines[greenIndex - 1].trim().startsWith('%%')) {
      // Remove the red line above
      newLines.splice(greenIndex - 1, 1);
      console.log('✅ Accepted individual change - removed red line');
    }
    
    // Update content and re-apply styling
    const updatedContent = newLines.join('\n');
    setLatexContent(updatedContent);
    setTimeout(() => applyDiffStyling(updatedContent), 100);
  };

  // Reject individual change (restore red line content, remove green line)
  const handleIndividualReject = (redLineNumber: number, allLines: string[]) => {
    const newLines = [...allLines];
    const redIndex = redLineNumber - 1;
    const redLine = newLines[redIndex];
    
    // Restore original content by uncommenting the red line
    if (redLine.trim().startsWith('%%')) {
      const originalContent = redLine.substring(2).trim(); // Remove %% and trim
      newLines[redIndex] = originalContent;
      
      // Remove the green line below if it exists and is a replacement
      if (redIndex + 1 < newLines.length && 
          isNewContentLine(newLines[redIndex + 1], redIndex + 1, newLines)) {
        newLines.splice(redIndex + 1, 1);
        console.log('❌ Rejected individual change - restored original and removed green line');
      }
    }
    
    // Update content and re-apply styling
    const updatedContent = newLines.join('\n');
    setLatexContent(updatedContent);
    setTimeout(() => applyDiffStyling(updatedContent), 100);
  };

  // Accept the AI suggested changes - keep green lines, remove red lines
  const handleAcceptChanges = () => {
    console.log('🔄 EDITOR: Accepting AI changes');
    
    const cleanContent = latexContent
      .split('\n')
      .filter(line => !line.trim().startsWith('%%'))  // Remove red lines (commented old content)
      .join('\n');
    
    setLatexContent(cleanContent);
    setShowInlineChanges(false);
    setProposedLatex('');
    setEditorDecorations([]);
    
    // Clear decorations from editor
    if (editorRef.current) {
      editorRef.current.deltaDecorations(editorDecorations, []);
    }
    
    // Auto-compile with the new content
    setTimeout(() => compileLatexWithContent(cleanContent), 500);
  };

  // Reject the AI suggested changes - restore original content
  const handleRejectChanges = () => {
    console.log('🔄 EDITOR: Rejecting AI changes');
    
    // Restore the original content (stored in proposedLatex)
    setLatexContent(proposedLatex);
    setShowInlineChanges(false);
    setProposedLatex('');
    setEditorDecorations([]);
    
    // Clear decorations from editor
    if (editorRef.current) {
      editorRef.current.deltaDecorations(editorDecorations, []);
    }
  };

  // Create the LaTeX editor content
  const latexEditorContent = (
    <div className="h-full flex flex-col">
      {/* LaTeX Code Section - 75% height */}
      <div className="flex-3" style={{ height: '75%' }}>
        <div className="h-full flex flex-col">
          <div className="border-b border-gray-600/20 px-4 py-3" style={{ backgroundColor: '#0A0A0A' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">LaTeX Code</h3>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="latex"
              value={latexContent}
              onChange={(value) => setLatexContent(value || '')}
              theme="vs-dark"
              onMount={(editor) => {
                editorRef.current = editor;
                
                // Add click handler for individual change acceptance/rejection
                editor.onDidChangeModelContent(() => {
                  // Detect if content changed due to our diff operations
                  if (showInlineChanges) {
                    setTimeout(() => applyDiffStyling(latexContent), 50);
                  }
                });
                
                // Use mouse up instead of mouse down for better click detection
                editor.onMouseUp((e) => {
                  if (showInlineChanges && e.target.position) {
                    const lineNumber = e.target.position.lineNumber;
                    const lines = latexContent.split('\n');
                    const clickedLine = lines[lineNumber - 1];
                    
                    // Check if clicking on a diff line (red or green)
                    if (clickedLine && (
                      clickedLine.trim().startsWith('%%') || 
                      isNewContentLine(clickedLine, lineNumber - 1, lines)
                    )) {
                      handleLineClick(lineNumber);
                    }
                  }
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                readOnly: showInlineChanges, // Make read-only when showing changes
                selectOnLineNumbers: false, // Disable line number selection in diff mode
                selectionHighlight: !showInlineChanges, // Disable selection highlight in diff mode
              }}
            />
            
            {/* Inline Accept/Reject Controls */}
            {showInlineChanges && (
              <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10">
                <div className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                  💡 Click red lines to reject • Click green lines to accept
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRejectChanges}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={handleAcceptChanges}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Section - 25% height */}
      <div className="flex-1 border-t border-gray-600/20" style={{ height: '25%', backgroundColor: '#0A0A0A' }}>
        <div className="h-full flex flex-col">
          <div className="border-b border-gray-600/20 px-4 py-2" style={{ backgroundColor: '#0A0A0A' }}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">
                Compilation Log
                {compileLog && (
                  compileLog.toLowerCase().includes('error') || 
                  compileLog.toLowerCase().includes('warning') || 
                  compileLog.toLowerCase().includes('failed')
                ) && (
                  <span className="ml-2 text-yellow-400 text-xs">⚠️</span>
                )}
              </h4>
              {compileLog && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(compileLog);
                      // Brief visual feedback
                      const button = document.activeElement as HTMLButtonElement;
                      if (button) {
                        const originalText = button.textContent;
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                          button.textContent = originalText;
                        }, 1000);
                      }
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-xs px-2 py-1 rounded border border-gray-600/30 hover:border-gray-500/50"
                    title="Copy log to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setCompileLog('')}
                    className="text-gray-400 hover:text-white transition-colors text-xs"
                    title="Clear log"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {compileLog ? (
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                {compileLog}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#2A2A2A' }}>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">No compilation log yet</p>
                  <p className="text-xs text-gray-600">Compile your LaTeX to see logs here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Create the AI chat content
  const aiChatContent = (
    <AIChat 
      ref={aiChatRef}
      currentLatex={latexContent}
      onLatexChange={handleAILatexChange}
      isLoading={isCompiling}
      resumeId={resumeId}
    />
  );

  return (
    <>
      {/* CSS for clean diff highlighting */}
      <style>
        {`
          .diff-line-red {
            background-color: rgba(239, 68, 68, 0.15) !important;
            color: #ef4444 !important;
            text-decoration: line-through !important;
            border-left: 3px solid #ef4444 !important;
            opacity: 0.8 !important;
            cursor: pointer !important;
          }
          .diff-line-red:hover {
            background-color: rgba(239, 68, 68, 0.25) !important;
          }
          .diff-line-green {
            background-color: rgba(34, 197, 94, 0.15) !important;
            color: #22c55e !important;
            border-left: 3px solid #22c55e !important;
            font-weight: 500 !important;
            cursor: pointer !important;
          }
          .diff-line-green:hover {
            background-color: rgba(34, 197, 94, 0.25) !important;
          }
        `}
      </style>
    <div className="h-screen text-white flex flex-col" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="backdrop-blur-xl border-b border-gray-600/20 sticky top-0 z-50" style={{ backgroundColor: '#000000' }}>
        <div className="px-6 py-2">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-6">
              <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-3xl flex items-center justify-center" style={{ backgroundColor: '#2A2A2A' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xl font-semibold">LaTeX Resume AI</span>
              </Link>
              
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  className="border border-gray-600/30 rounded-3xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all"
                  style={{ backgroundColor: '#151515' }}
                  placeholder="Resume title..."
                />
                {/* Save status indicator */}
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  {isSaving ? (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span>Saving...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Saved {formatTime(lastSaved)}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span>Not saved</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Center buttons */}
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowJobForm(!showJobForm)}
                className="text-white px-4 py-2 rounded-3xl transition-all text-sm font-medium flex items-center space-x-2 hover:opacity-90"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI Tailor</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={compileLatex}
                disabled={isCompiling || !latexContent.trim()}
                className="text-white px-4 py-2 rounded-3xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center space-x-2"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                {isCompiling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>{isCompiling ? 'Compiling...' : 'Compile PDF'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={downloadPDF}
                disabled={isDownloading || !pdfUrl}
                className="text-white px-4 py-2 rounded-3xl transition-all text-sm font-medium flex items-center space-x-2 hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                {isDownloading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2-7h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h3" />
                  </svg>
                )}
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </motion.button>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">{user?.username}</span>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Job Description Modal */}
      {showJobForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="border border-gray-600/20 rounded-3xl p-8 max-w-2xl w-full"
            style={{ backgroundColor: '#0A0A0A' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">AI Resume Tailoring</h3>
              <button
                onClick={() => setShowJobForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full h-32 border border-gray-600/30 rounded-3xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all"
                  style={{ backgroundColor: '#151515' }}
                  placeholder="Paste the job description here to tailor your resume content..."
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowJobForm(false)}
                  className="text-white px-6 py-2 rounded-3xl transition-all hover:opacity-90"
                  style={{ backgroundColor: '#2A2A2A' }}
                >
                  Cancel
                </button>
                <button
                  onClick={generateWithAI}
                  disabled={!jobDescription.trim() || isCompiling}
                  className="text-white px-6 py-2 rounded-3xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  style={{ backgroundColor: '#2A2A2A' }}
                >
                  Start Tailoring
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Main Content - Three Panel Layout: LaTeX | AI Chat | PDF */}
      <div className="flex-1 overflow-hidden">
        <ThreePanelSplitter
          leftContent={latexEditorContent}
          centerContent={aiChatContent}
          rightContent={
                    <div className="h-full" style={{ backgroundColor: '#0A0A0A' }}>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#2A2A2A' }}>
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No PDF Generated</h3>
                  <p className="text-gray-500 mb-6">Compile your LaTeX code to see the PDF preview</p>
                  <button
                    onClick={compileLatex}
                    disabled={isCompiling || !latexContent.trim()}
                    className="text-white px-6 py-3 rounded-3xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    style={{ backgroundColor: '#2A2A2A' }}
                  >
                    {isCompiling ? 'Compiling...' : 'Compile PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
          }
          initialLeftWidth={30}
          initialCenterWidth={33}
          initialRightWidth={37}
          minLeftWidth={20}
          minCenterWidth={15}
          minRightWidth={20}
        />
      </div>


    </div>
    </>
  );
};

export default LaTeXEditor; 