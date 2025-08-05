export function showMonacoDiff({
  monaco,
  editor,
  original,
  modified,
  language,
  theme
}: {
  monaco: any,
  editor: any,
  original: string,
  modified: string,
  language: string,
  theme: string
}) {
  const diffContainer = document.createElement('div');
  diffContainer.style.width = '80vw';
  diffContainer.style.height = '70vh';
  diffContainer.style.position = 'fixed';
  diffContainer.style.top = '10vh';
  diffContainer.style.left = '10vw';
  diffContainer.style.zIndex = '9999';
  diffContainer.style.background = '#23272e';
  diffContainer.style.border = '2px solid #4f8cff';
  diffContainer.style.borderRadius = '16px';
  diffContainer.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
  diffContainer.style.overflow = 'hidden';
  diffContainer.id = 'monaco-diff-container';
  document.body.appendChild(diffContainer);

  // Header bar ekle
  const headerBar = document.createElement('div');
  headerBar.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
    border-bottom: 1px solid #4a5568;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 10001;
    backdrop-filter: blur(10px);
  `;
  diffContainer.appendChild(headerBar);

  // Sol taraf - Read-only toggle
  const leftControls = document.createElement('div');
  leftControls.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  const readOnlyBtn = document.createElement('button');
  readOnlyBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
    </svg>
    Read-Only: OFF
  `;
  readOnlyBtn.style.cssText = `
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
    font-family: 'Inter', 'Segoe UI', sans-serif;
    letter-spacing: 0.01em;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
    }
  `;
  
  let isReadOnly = false;
  
  readOnlyBtn.onclick = () => {
    isReadOnly = !isReadOnly;
    
    if (isReadOnly) {
      diffEditor.updateOptions({ readOnly: true });
      readOnlyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
        </svg>
        Read-Only: ON
      `;
      readOnlyBtn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
      readOnlyBtn.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
      
      diffEditor.getModifiedEditor().updateOptions({ 
        readOnly: true,
        cursorStyle: 'hidden'
      });
      diffEditor.getOriginalEditor().updateOptions({ 
        readOnly: true,
        cursorStyle: 'hidden'
      });
    } else {
      diffEditor.updateOptions({ readOnly: false });
      readOnlyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
        </svg>
        Read-Only: OFF
      `;
      readOnlyBtn.style.background = 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)';
      readOnlyBtn.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
      
      diffEditor.getModifiedEditor().updateOptions({ 
        readOnly: false,
        cursorStyle: 'line'
      });
      diffEditor.getOriginalEditor().updateOptions({ 
        readOnly: false,
        cursorStyle: 'line'
      });
    }
  };
  
  leftControls.appendChild(readOnlyBtn);
  headerBar.appendChild(leftControls);

  // Sağ taraf - Action butonları
  const rightControls = document.createElement('div');
  rightControls.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  // Update Code butonu
  const applyBtn = document.createElement('button');
  applyBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
    </svg>
    Update Code
  `;
  applyBtn.style.cssText = `
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    font-family: 'Inter', 'Segoe UI', sans-serif;
    letter-spacing: 0.01em;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
    }
  `;
  
  applyBtn.onclick = () => {
    const newCode = modifiedModel.getValue();
    if (editor) {
      editor.setValue(newCode);
    }
    diffEditor.dispose();
    originalModel.dispose();
    modifiedModel.dispose();
    diffContainer.remove();
  };

  // Close butonu
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
    </svg>
    Close
  `;
  closeBtn.style.cssText = `
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%);
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
    font-family: 'Inter', 'Segoe UI', sans-serif;
    letter-spacing: 0.01em;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(111, 66, 193, 0.4);
    }
  `;
  
  closeBtn.onclick = () => {
    diffEditor.dispose();
    originalModel.dispose();
    modifiedModel.dispose();
    diffContainer.remove();
  };

  rightControls.appendChild(applyBtn);
  rightControls.appendChild(closeBtn);
  headerBar.appendChild(rightControls);

  // Monaco editor container'ı header'ın altına yerleştir
  const editorContainer = document.createElement('div');
  editorContainer.style.cssText = `
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1a202c;
  `;
  diffContainer.appendChild(editorContainer);

  const originalModel = monaco.editor.createModel(original, language);
  const modifiedModel = monaco.editor.createModel(modified, language);
  
  const diffEditor = monaco.editor.createDiffEditor(editorContainer, {
    theme: theme,
    automaticLayout: true,
    readOnly: false,
  });
  
  diffEditor.setModel({ original: originalModel, modified: modifiedModel });
} 