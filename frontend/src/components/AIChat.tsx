import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: {
    data: string;
    type: string;
    name: string;
  };
}

interface AIChatProps {
  currentLatex: string;
  onLatexChange: (newLatex: string) => void;
  isLoading?: boolean;
  resumeId?: string;
  onPopulateInput?: (message: string) => void;
}

// Export the ref interface for parent to call methods
export interface AIChatRef {
  populateInput: (message: string) => void;
  focusInput: () => void;
  sendMessage: () => void;
}

const AIChat = forwardRef<AIChatRef, AIChatProps>(({ currentLatex, onLatexChange, isLoading = false, resumeId }, ref) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I can help you modify your resume. Just describe what changes you\'d like to make, such as:\n\n• "Make my name bigger and bold"\n• "Add a skills section with Python, React, and Node.js"\n• "Change the font size of experience section"\n• "Make the margins smaller"',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('resume');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{data: string, type: string, name: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (resumeId) {
      loadResumeTemplate();
    }
  }, [resumeId]);

  // Add clipboard paste support for images
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Convert to the same format as file upload
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = reader.result as string;
              const base64String = base64Data.split(',')[1];
              
              setSelectedImage({
                data: base64String,
                type: item.type.split('/')[1],
                name: `clipboard-image-${Date.now()}.${item.type.split('/')[1]}`
              });
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const loadResumeTemplate = async () => {
    if (!resumeId) return;

    setTemplateLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      const resumeResponse = await fetch(`http://localhost:8000/api/resumes/${resumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (resumeResponse.ok) {
        const resume = await resumeResponse.json();
        const resumeTemplateName = resume.template_name || 'resume';
        setTemplateName(resumeTemplateName);

        const templateResponse = await fetch(`http://localhost:8000/api/templates/${resumeTemplateName}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (templateResponse.ok) {
          const templateData = await templateResponse.json();
          setTemplateContent(templateData.content || '');
          console.log('✅ FRONTEND: Loaded template for AI chat:', {
            templateName: resumeTemplateName,
            contentLength: templateData.content?.length || 0
          });
          
          setMessages(prev => prev.map(msg => 
            msg.id === '1' ? {
              ...msg,
              content: `Hello! I can help you modify your **${templateData.name || resumeTemplateName}** resume. I understand the specific commands and structure of this template.\n\nJust describe what changes you'd like to make, such as:\n\n• "Make my name bigger and bold"\n• "Add a skills section with Python, React, and Node.js"\n• "Change the font size of experience section"\n• "Make the margins smaller"\n• "Reorganize the sections"`
            } : msg
          ));
        } else {
          console.error('❌ Failed to load template content');
        }
      } else {
        console.error('❌ Failed to load resume data');
      }
    } catch (error) {
      console.error('❌ Error loading template:', error);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, WEBP, or PDF file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const base64String = base64Data.split(',')[1]; // Remove data URL prefix
        
        const fileExtension = file.type.split('/')[1];
        setSelectedImage({
          data: base64String,
          type: fileExtension,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Store image data for API call, then clear it
    const imageForAPI = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const token = localStorage.getItem('access_token');
      
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      conversationHistory.push({
        role: 'user',
        content: userMessage.content
      });

      console.log('🔄 FRONTEND: Sending template-aware chat request:', {
        message: userMessage.content,
        historyLength: conversationHistory.length,
        templateName,
        hasTemplateContent: !!templateContent
      });

      const requestBody: any = {
        message: userMessage.content,
        current_latex: currentLatex,
        conversation_history: conversationHistory,
        template_name: templateName,
        template_content: templateContent
      };

      // Add image data if present
      if (imageForAPI) {
        requestBody.image_data = imageForAPI.data;
        requestBody.image_type = imageForAPI.type;
        console.log('📸 FRONTEND: Sending image with chat request:', {
          fileName: imageForAPI.name,
          fileType: imageForAPI.type,
          dataLength: imageForAPI.data.length
        });
      }

      const response = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('📨 FRONTEND: Received response:', {
        success: result.success,
        hasResponse: !!result.response,
        responseType: typeof result.response,
        responseStart: typeof result.response === 'string' ? result.response.substring(0, 100) + '...' : result.response,
        hasModifiedLatex: !!result.modified_latex,
        modifiedLatexLength: result.modified_latex ? result.modified_latex.length : 0
      });

      if (result.success) {
        let responseText = '';
        let modifiedLatex = '';

        if (result.response && result.modified_latex) {
          responseText = result.response;
          modifiedLatex = result.modified_latex;
          console.log('✅ FRONTEND: Using direct response structure');
        } 
        else if (typeof result.response === 'string') {
          responseText = result.response;
          
          const latexMatch = result.response.match(/"modified_latex":\s*"((?:\\.|[^"\\])*)"/) ||
                            result.response.match(/'modified_latex':\s*'((?:\\.|[^'\\])*)'/) ||
                            result.response.match(/modified_latex['":].*?['"]((?:\\.|[^"'\\])*)['"]/);
          
          if (latexMatch && latexMatch[1]) {
            modifiedLatex = latexMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, '\\');
            console.log('✅ FRONTEND: Extracted LaTeX using regex, length:', modifiedLatex.length);
          }
          
          const responseMatch = result.response.match(/"response":\s*"([^"]*)"/) ||
                               result.response.match(/'response':\s*'([^']*)'/) ||
                               result.response.match(/response['":].*?['"](.*?)['"]/);
          
          if (responseMatch && responseMatch[1]) {
            responseText = responseMatch[1];
            console.log('✅ FRONTEND: Extracted clean response text');
          }
        } 
        else if (result.data) {
          responseText = result.data.response || result.data.message || '';
          modifiedLatex = result.data.modified_latex || '';
        } 
        else {
          responseText = result.message || 'I received your request but couldn\'t process it properly.';
        }

        console.log('📋 FRONTEND: Extracted data:', {
          responseText: responseText.substring(0, 100) + '...',
          hasModifiedLatex: !!modifiedLatex,
          modifiedLatexLength: modifiedLatex.length
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: responseText,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (modifiedLatex && modifiedLatex.trim() && modifiedLatex !== currentLatex) {
          console.log('✅ FRONTEND: Updating LaTeX editor with modified content');
          console.log('📄 FRONTEND: LaTeX comparison - Original length:', currentLatex.length, 'Modified length:', modifiedLatex.length);
          onLatexChange(modifiedLatex);
        } else if (modifiedLatex && modifiedLatex === currentLatex) {
          console.log('ℹ️ FRONTEND: Modified LaTeX is same as current LaTeX');
        } else {
          console.log('ℹ️ FRONTEND: No modified LaTeX in response');
        }
      } else {
        console.error('❌ FRONTEND: Chat request failed:', result);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('❌ FRONTEND: Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I couldn\'t connect to the AI service. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    populateInput: (message: string) => {
      setInputValue(message);
    },
    focusInput: () => {
      inputRef.current?.focus();
    },
    sendMessage: () => {
      handleSendMessage();
    }
  }));

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0A0A0A' }}>
      <div className="flex-shrink-0 p-4" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${templateLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <h3 className="text-lg font-semibold text-white">AI Resume Assistant</h3>
          {templateName && !templateLoading && (
            <div className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">
              {templateName}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {templateLoading 
            ? 'Loading template context...' 
            : templateContent 
              ? `Template-aware AI ready • ${templateName} template loaded`
              : 'Describe what you\'d like to change about your resume'
          }
        </p>
        
        <div className="border-b border-gray-600/20 mx-4 mt-4"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 ${
                  message.type === 'user'
                    ? 'text-white border border-gray-600/30 rounded-3xl'
                    : 'text-gray-100'
                }`}
                style={message.type === 'user' ? { backgroundColor: '#2A2A2A' } : {}}
              >
                {/* Show image if present */}
                {message.image && (
                  <div className="mb-3 max-w-xs">
                    <img 
                      src={`data:image/${message.image.type};base64,${message.image.data}`}
                      alt={message.image.name}
                      className="rounded-lg border border-gray-600/30 max-w-full h-auto"
                    />
                    <p className="text-xs text-gray-500 mt-1">{message.image.name}</p>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-300">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="border-t border-gray-600/20 mx-4 mb-4"></div>
        
        {/* Image Upload Section */}
        {selectedImage && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={`data:image/${selectedImage.type};base64,${selectedImage.data}`}
                  alt={selectedImage.name}
                  className="w-12 h-12 object-cover rounded border border-gray-600/30"
                />
                <div>
                  <p className="text-sm text-white font-medium">{selectedImage.name}</p>
                  <p className="text-xs text-gray-400">Ready to analyze with your message</p>
                </div>
              </div>
              <button
                onClick={removeSelectedImage}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedImage ? "Describe how to use this image..." : "Describe what you'd like to change about your resume..."}
            className="w-full resize-none border border-gray-600/30 rounded-3xl px-4 py-3 pr-20 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all"
            style={{ backgroundColor: '#151515' }}
            rows={2}
            disabled={isProcessing || templateLoading}
          />
          
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || templateLoading}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center rounded-full"
            title="Upload image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || templateLoading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white text-black rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="text-gray-600">📸 Upload or paste (Ctrl+V) images</span>
          </div>
          <span className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${templateLoading ? 'bg-yellow-500' : templateContent ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span>
              {templateLoading ? 'Loading...' : templateContent ? 'Template Ready' : 'AI Ready'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});

AIChat.displayName = 'AIChat';

export default AIChat; 