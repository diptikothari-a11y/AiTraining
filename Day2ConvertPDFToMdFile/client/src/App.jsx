import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [fileName, setFileName] = useState('');
  const [view, setView] = useState('preview');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text }
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const pickFile = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatus({ type: 'error', text: 'Please choose a PDF file.' });
      return;
    }
    setPdfFile(file);
    setMarkdown('');
    setStatus(null);
  };

  const convert = async () => {
    if (!pdfFile) return;
    setBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append('pdf', pdfFile);
      const res = await fetch('/api/convert', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      setMarkdown(data.markdown);
      setFileName(data.fileName);
      setView('preview');
      setStatus({ type: 'success', text: 'Markdown generated. Review or edit it, then click Save.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setStatus({ type: 'success', text: `Saved to ${data.savedTo}` });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>PDF → Markdown</h1>
        <p>Upload a PDF, review the generated Markdown, and save it to <code>C:\temp</code>.</p>
      </header>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            pickFile(e.target.files[0]);
            e.target.value = '';
          }}
        />
        {pdfFile ? (
          <span>
            <strong>{pdfFile.name}</strong> ({(pdfFile.size / 1024).toFixed(1)} KB) — click to change
          </span>
        ) : (
          <span>Drag &amp; drop a PDF here, or click to browse</span>
        )}
      </div>

      <div className="actions">
        <button onClick={convert} disabled={!pdfFile || busy}>
          {busy && !markdown ? 'Converting…' : 'Generate Markdown'}
        </button>
      </div>

      {status && <div className={`status ${status.type}`}>{status.text}</div>}

      {markdown && (
        <section className="result">
          <div className="toolbar">
            <label>
              File name
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </label>
            <div className="tabs">
              <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>
                Preview
              </button>
              <button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>
                Edit
              </button>
            </div>
            <button className="save" onClick={save} disabled={busy || !markdown.trim()}>
              Save
            </button>
          </div>

          {view === 'edit' ? (
            <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false} />
          ) : (
            <article className="preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
