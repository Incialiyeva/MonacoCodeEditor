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
  diffContainer.style.borderRadius = '12px';
  diffContainer.style.boxShadow = '0 8px 32px #0006';
  diffContainer.id = 'monaco-diff-container';
  document.body.appendChild(diffContainer);
  const originalModel = monaco.editor.createModel(original, language);
  const modifiedModel = monaco.editor.createModel(modified, language);
  const diffEditor = monaco.editor.createDiffEditor(diffContainer, {
    theme: theme,
    automaticLayout: true,
  });
  diffEditor.setModel({ original: originalModel, modified: modifiedModel });
  // Kapatma butonu
  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'Kapat';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '12px';
  closeBtn.style.right = '18px';
  closeBtn.style.zIndex = '10000';
  closeBtn.style.background = '#4f8cff';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '6px';
  closeBtn.style.padding = '0.5rem 1.2rem';
  closeBtn.style.fontSize = '1rem';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    diffEditor.dispose();
    originalModel.dispose();
    modifiedModel.dispose();
    diffContainer.remove();
  };
  diffContainer.appendChild(closeBtn);
  // Kodu Güncelle butonu
  const applyBtn = document.createElement('button');
  applyBtn.innerText = 'Kodu Güncelle';
  applyBtn.style.position = 'absolute';
  applyBtn.style.top = '12px';
  applyBtn.style.right = '110px';
  applyBtn.style.zIndex = '10000';
  applyBtn.style.background = '#43b77a';
  applyBtn.style.color = '#fff';
  applyBtn.style.border = 'none';
  applyBtn.style.borderRadius = '6px';
  applyBtn.style.padding = '0.5rem 1.2rem';
  applyBtn.style.fontSize = '1rem';
  applyBtn.style.cursor = 'pointer';
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
  diffContainer.appendChild(applyBtn);
} 