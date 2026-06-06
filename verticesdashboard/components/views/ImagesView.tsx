'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderIcon, PlusIcon, PencilIcon, TrashIcon,
  ArrowUpTrayIcon, ArrowPathIcon, PhotoIcon,
  CheckIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

type Folder = { name: string; count: number };

export function ImagesView({ addToast, isMobile }: { addToast: AddToast; isMobile: boolean }) {
  const [folders, setFolders]               = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [images, setImages]                 = useState<string[]>([]);
  const [loading, setLoading]               = useState(false);
  const [newFolderName, setNewFolderName]   = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue]       = useState('');
  const [lightboxIdx, setLightboxIdx]       = useState(0);
  const [lightboxOpen, setLightboxOpen]     = useState(false);
  const [showImages, setShowImages]         = useState(false);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const loadFolders = useCallback(async () => {
    const r = await fetch('/api/images');
    const d = await r.json();
    setFolders(d.folders || []);
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  const selectFolder = async (name: string) => {
    setSelectedFolder(name);
    setLoading(true);
    if (isMobile) setShowImages(true);
    const r = await fetch(`/api/images?folder=${encodeURIComponent(name)}`);
    const d = await r.json();
    setImages(d.files || []);
    setLoading(false);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const r = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const d = await r.json();
    if (d.ok) { addToast('Folder created', 'success'); setNewFolderName(''); loadFolders(); }
    else addToast(d.error || 'Failed', 'error');
  };

  const deleteFolder = async (name: string) => {
    if (!confirm(`Delete folder "${name}" and all its images?`)) return;
    const r = await fetch(`/api/images?folder=${encodeURIComponent(name)}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.ok) {
      addToast('Folder deleted', 'success');
      if (selectedFolder === name) { setSelectedFolder(null); setImages([]); setShowImages(false); }
      loadFolders();
    } else addToast(d.error || 'Failed', 'error');
  };

  const renameFolder = async () => {
    if (!renamingFolder || !renameValue.trim()) return;
    const r = await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: renamingFolder, newName: renameValue.trim() }),
    });
    const d = await r.json();
    if (d.ok) {
      addToast('Folder renamed', 'success');
      if (selectedFolder === renamingFolder) setSelectedFolder(renameValue.trim());
      setRenamingFolder(null); setRenameValue('');
      loadFolders();
    } else addToast(d.error || 'Failed', 'error');
  };

  const deleteImage = async (file: string) => {
    if (!selectedFolder) return;
    const r = await fetch(
      `/api/images/file?folder=${encodeURIComponent(selectedFolder)}&file=${encodeURIComponent(file)}`,
      { method: 'DELETE' }
    );
    const d = await r.json();
    if (d.ok) {
      addToast('Image deleted', 'success');
      setImages(prev => prev.filter(f => f !== file));
      setFolders(prev => prev.map(f => f.name === selectedFolder ? { ...f, count: Math.max(0, f.count - 1) } : f));
    } else addToast(d.error || 'Failed', 'error');
  };

  const uploadImages = async (fileList: File[]) => {
    if (!selectedFolder || !fileList.length) return;
    const formData = new FormData();
    fileList.forEach(f => formData.append('files', f));
    const r = await fetch(`/api/images/upload?folder=${encodeURIComponent(selectedFolder)}`, {
      method: 'POST', body: formData,
    });
    const d = await r.json();
    if (d.ok) {
      addToast(`${d.count} image(s) uploaded`, 'success');
      selectFolder(selectedFolder);
      loadFolders();
    } else addToast(d.error || 'Upload failed', 'error');
  };

  const imgSrc = (folder: string, file: string) =>
    `/api/images/file?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`;

  const showFolderPanel = !isMobile || !showImages;
  const showImagePanel  = !isMobile || showImages;

  return (
    <div className="fade-in">
      <PageHeader title="Images" subtitle="Manage image folders for your listings" />

      <div style={{
        display: 'flex', gap: 20,
        height: isMobile ? 'auto' : 'calc(100vh - 160px)',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Folder panel */}
        {showFolderPanel && (
          <div className="card" style={{
            width: isMobile ? '100%' : 280, minWidth: isMobile ? 0 : 280,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            height: isMobile ? 'auto' : '100%',
          }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>Folders</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input" placeholder="New folder name…"
                  value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createFolder()}
                  style={{ fontSize: 13 }}
                />
                <button className="btn-primary" onClick={createFolder} style={{ padding: '8px 12px', flexShrink: 0 }}>
                  <PlusIcon style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 8, maxHeight: isMobile ? 320 : undefined }}>
              {folders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 16px' }}>
                  No folders yet
                </div>
              ) : folders.map(folder => (
                renamingFolder === folder.name ? (
                  <div key={folder.name} style={{ padding: '8px 10px', display: 'flex', gap: 6, marginBottom: 2 }}>
                    <input
                      className="input" value={renameValue} autoFocus
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFolder(); if (e.key === 'Escape') setRenamingFolder(null); }}
                      style={{ fontSize: 13 }}
                    />
                    <button className="btn-primary" onClick={renameFolder} style={{ padding: '6px 10px' }}>
                      <CheckIcon style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="btn-secondary" onClick={() => setRenamingFolder(null)} style={{ padding: '6px 10px' }}>
                      <XMarkIcon style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ) : (
                  <div key={folder.name} onClick={() => selectFolder(folder.name)} style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                    background: selectedFolder === folder.name ? 'var(--accent-muted)' : 'transparent',
                    border: selectedFolder === folder.name ? '1px solid var(--accent-border)' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
                  }}>
                    <FolderIcon style={{
                      width: 16, height: 16, flexShrink: 0,
                      color: selectedFolder === folder.name ? 'var(--accent)' : 'var(--text-muted)',
                    }} />
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {folder.name}
                    </span>
                    <span className="badge badge-gray" style={{ fontSize: 11, padding: '2px 7px', flexShrink: 0 }}>
                      {folder.count}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setRenamingFolder(folder.name); setRenameValue(folder.name); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
                      >
                        <PencilIcon style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        onClick={() => deleteFolder(folder.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
                      >
                        <TrashIcon style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Image grid panel */}
        {showImagePanel && (
          <div className="card" style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            height: isMobile ? 'calc(100vh - 200px)' : '100%',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isMobile && (
                  <button className="btn-secondary" onClick={() => setShowImages(false)} style={{ padding: '7px 12px', fontSize: 13 }}>
                    <ChevronLeftIcon style={{ width: 14, height: 14 }} /> Back
                  </button>
                )}
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {selectedFolder || 'Select a folder'}
                </span>
              </div>
              {selectedFolder && (
                <>
                  <input type="file" ref={fileInputRef} multiple accept="image/*" style={{ display: 'none' }}
                    onChange={e => uploadImages(Array.from(e.target.files || []))} />
                  <button className="btn-primary" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px' }}>
                    <ArrowUpTrayIcon style={{ width: 15, height: 15 }} /> Upload Images
                  </button>
                </>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {!selectedFolder ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', flexDirection: 'column', gap: 12, color: 'var(--text-muted)',
                }}>
                  <FolderIcon style={{ width: 48, height: 48, opacity: 0.3 }} />
                  <p style={{ fontSize: 14, margin: 0 }}>Select a folder to view images</p>
                </div>
              ) : loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                  <ArrowPathIcon style={{ width: 24, height: 24, color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : images.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60, fontSize: 14 }}>
                  <PhotoIcon style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ margin: '0 0 12px' }}>No images in this folder</p>
                  <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    <ArrowUpTrayIcon style={{ width: 15, height: 15 }} /> Upload Images
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {images.map((file, idx) => (
                    <div
                      key={file}
                      className="img-card"
                      onClick={() => { setLightboxIdx(idx); setLightboxOpen(true); }}
                      style={{
                        position: 'relative', borderRadius: 8, overflow: 'hidden',
                        border: '1px solid var(--border)', aspectRatio: '4/3',
                        cursor: 'pointer', background: 'var(--bg)',
                      }}
                    >
                      <img
                        src={imgSrc(selectedFolder, file)} alt={file}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div className="img-actions" style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))',
                        display: 'flex', alignItems: 'flex-end', padding: 8,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                          <div style={{ fontSize: 11, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 4 }}>
                            {file}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteImage(file); }}
                            style={{ background: 'var(--danger)', border: 'none', borderRadius: 5, padding: '4px 6px', cursor: 'pointer', color: 'white', flexShrink: 0 }}
                          >
                            <TrashIcon style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.5)', color: 'white',
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      }}>
                        {idx + 1}/{images.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && selectedFolder && images[lightboxIdx] && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button onClick={() => setLightboxOpen(false)} style={{
            position: 'absolute', top: 20, right: 20, zIndex: 1,
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
            padding: 10, cursor: 'pointer', color: 'white',
          }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>

          {lightboxIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => i - 1); }} style={{
              position: 'absolute', left: 16,
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: 12, cursor: 'pointer', color: 'white',
            }}>
              <ChevronLeftIcon style={{ width: 22, height: 22 }} />
            </button>
          )}

          {lightboxIdx < images.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => i + 1); }} style={{
              position: 'absolute', right: 16,
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: 12, cursor: 'pointer', color: 'white',
            }}>
              <ChevronRightIcon style={{ width: 22, height: 22 }} />
            </button>
          )}

          <img
            src={imgSrc(selectedFolder, images[lightboxIdx])}
            alt={images[lightboxIdx]}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
          />

          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            color: 'white', fontSize: 13, background: 'rgba(0,0,0,0.6)',
            padding: '5px 14px', borderRadius: 20, whiteSpace: 'nowrap',
          }}>
            {images[lightboxIdx]} · {lightboxIdx + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
