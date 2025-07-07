import { useContext } from 'react';
import { EditorContext, EditorContextType } from '../context/EditorStateContext';

export const useEditorState = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorState must be used within an EditorStateProvider');
  }
  return context;
}; 