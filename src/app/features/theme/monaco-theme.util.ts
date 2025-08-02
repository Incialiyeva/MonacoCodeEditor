export function applyMonacoTheme({
  monaco,
  editor,
  theme,
  hostElement,
  renderer
}: {
  monaco: any,
  editor: any,
  theme: string,
  hostElement: HTMLElement,
  renderer: any
}) {
  if (monaco && editor) {
    monaco.editor.setTheme(theme);
  }
  if (hostElement && renderer) {
    if (theme === 'vs-dark') {
      renderer.removeClass(hostElement, 'light-theme');
      renderer.addClass(hostElement, 'dark-theme');
    } else {
      renderer.removeClass(hostElement, 'dark-theme');
      renderer.addClass(hostElement, 'light-theme');
    }
  }
} 