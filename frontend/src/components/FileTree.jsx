import React, { useState, useRef, useCallback } from 'react';
import {
  FileCode2, FileJson, FileText, Download, FolderOpen, Folder,
  Search, X, Loader2, ChevronRight, ChevronDown, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';

// ── Normalize File Paths ──
export function normalizePath(path) {
  if (!path) return '';
  // Convert all backslashes to forward slashes
  let clean = path.replace(/\\/g, '/');
  // Remove unwanted prefixes like @latest/
  clean = clean.replace(/^@latest\//, '');
  // Remove leading slash if present
  if (clean.startsWith('/')) clean = clean.slice(1);
  return clean;
}

// ── Build nested tree from flat file paths ──
export function buildFileTree(files) {
  if (!files || !Array.isArray(files)) return [];
  const root = { name: 'root', path: '', type: 'tree', children: [], _children: {} };

  files.forEach(file => {
    const cleanPath = normalizePath(file.path);
    const parts = cleanPath.split('/');
    
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (!node._children[part]) {
        const newNode = {
          id: isFile ? file.id : `folder-${node.path ? node.path + '/' : ''}${part}`,
          name: part,
          path: node.path ? `${node.path}/${part}` : part,
          type: isFile ? 'file' : 'tree',
          children: [],
          _children: {},
          originalFile: isFile ? file : null
        };
        node._children[part] = newNode;
        node.children.push(newNode);
      }
      node = node._children[part];
    }
  });

  function sortTree(n) {
    n.children.sort((a, b) => {
      if (a.type === 'tree' && b.type !== 'tree') return -1;
      if (a.type !== 'tree' && b.type === 'tree') return 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortTree);
  }
  
  sortTree(root);
  return root.children;
}

// ── File icon helper ──
function FileIcon({ name, size = 13 }) {
  if (name.endsWith('.py'))   return <FileCode2 size={size} className="text-yellow-400 shrink-0" />;
  if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx'))
    return <FileCode2 size={size} className="text-cyan-400 shrink-0" />;
  if (name.endsWith('.json')) return <FileJson size={size} className="text-green-400 shrink-0" />;
  if (name.endsWith('.md'))   return <FileText size={size} className="text-blue-300 shrink-0" />;
  if (name.endsWith('.css') || name.endsWith('.scss')) return <FileCode2 size={size} className="text-pink-400 shrink-0" />;
  return <FileText size={size} className="text-gray-500 shrink-0" />;
}

// ── Tree Node (recursive) ──
function TreeNode({ node, depth, selectedFileId, expandedFolders, onToggle, onFileClick, loadingFileId }) {
  const isFolder = node.type === 'tree';
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFileId === node.id;
  const isLoading = loadingFileId === node.id;

  return (
    <div className="flex flex-col group/node">
      {/* Node Row */}
      <div
        className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer transition-all duration-200 group relative
          ${isSelected ? 'bg-vscode-accent/10 text-vscode-accent' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'}
        `}
        style={{ paddingLeft: `${(depth + 1) * 16}px` }}
        onClick={() => isFolder ? onToggle(node.path) : onFileClick(node)}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-vscode-accent shadow-glow-blue" />
        )}
        
        {/* Expand chevron for folders */}
        {isFolder ? (
          <span className="shrink-0 transition-transform duration-200 text-gray-500 group-hover:text-gray-300">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : null}

        {/* Icon */}
        {isFolder
          ? (isExpanded
              ? <FolderOpen size={14} className="text-blue-400 shrink-0" />
              : <Folder size={14} className="text-blue-400 shrink-0" />)
          : <FileIcon name={node.name} />}

        {/* Name */}
        <span className={`text-xs truncate flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>
          {node.name}
        </span>

        {/* Loading spinner */}
        {isLoading && <Loader2 size={12} className="animate-spin text-cyan-400 shrink-0" />}
      </div>

      {/* Children */}
      {isFolder && isExpanded && (
        <div>
          {node.children?.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFileId={selectedFileId}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onFileClick={onFileClick}
              loadingFileId={loadingFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main FileTree ──
const FileTree = ({ files, setFiles, selectedFileId, setSelectedFileId, onLog, onRepoLoaded, onBeforeLoad, onDownloadProject, isDemoMode }) => {
  const DEMO_FILES = [
    { id: 'demo-1', name: 'sum.py', path: '/sum.py', content: 'def calculate_sum(a, b):\n    # Logical bug: using subtraction instead of addition\n    return a - b\n' },
    { id: 'demo-2', name: 'index.html', path: '/index.html', content: '<h1>Hello World</h1>' }
  ];
  const [repoInput, setRepoInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [search, setSearch] = useState('');
  const [treeNodes, setTreeNodes] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loadingFileId, setLoadingFileId] = useState(null);

  React.useEffect(() => {
    const nodes = buildFileTree(files);
    setTreeNodes(nodes);
    
    // Auto-expand top level folders
    const topLevel = new Set();
    nodes.forEach(n => {
      if (n.type === 'tree') topLevel.add(n.path);
    });
    setExpandedFolders(topLevel);
  }, [files]);

  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const handleFileClick = useCallback(async (node) => {
    setSelectedFileId(node.id);
    if (onLog) onLog(`Selected file: ${node.path}`, 'info');
  }, [setSelectedFileId, onLog]);

  const loadRepo = async () => {
    if (!repoInput) return;
    setIsLoading(true);
    setRepoError('');
    if (onBeforeLoad) onBeforeLoad(); // Reset previous state
    if (onLog) onLog(`Cloning repository: ${repoInput}...`, 'loading');
    
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1000));
        setFiles(DEMO_FILES);
        onRepoLoaded?.(DEMO_FILES);
        onLog?.(`Successfully loaded demo repository`, 'success');
        if (DEMO_FILES.length > 0) setSelectedFileId(DEMO_FILES[0].id);
      } else {
        const res = await api.loadRepo(repoInput);
        const filesLoaded = Array.isArray(res?.files) ? res.files : [];
        setFiles(filesLoaded);
        if (onRepoLoaded) onRepoLoaded(repoInput, filesLoaded);
        if (onLog) onLog(`Successfully loaded ${filesLoaded.length} files.`, 'success');
        if (filesLoaded.length > 0) setSelectedFileId(filesLoaded[0].id);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load repository';
      setRepoError(errorMsg);
      if (onLog) onLog(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file && !isDemoMode) return;
    
    setIsLoading(true);
    if (onBeforeLoad) onBeforeLoad(); // Reset previous state
    if (onLog) onLog(`Uploading project: ${file?.name || 'demo.zip'}...`, 'loading');
    
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1000));
        setFiles(DEMO_FILES);
        onRepoLoaded?.(DEMO_FILES);
        onLog?.(`Successfully uploaded demo project`, 'success');
        if (DEMO_FILES.length > 0) setSelectedFileId(DEMO_FILES[0].id);
      } else {
        const res = await api.uploadProject(file);
        const filesUploaded = Array.isArray(res?.files) ? res.files : [];
        setFiles(filesUploaded);
        if (onRepoLoaded) onRepoLoaded('', filesUploaded); // ZIP upload successful
        if (onLog) onLog(`Successfully uploaded ${filesUploaded.length} files.`, 'success');
        if (filesUploaded.length > 0) setSelectedFileId(filesUploaded[0].id);
      }
    } catch (err) {
      const errorMsg = 'Failed to upload project';
      setRepoError(errorMsg);
      if (onLog) onLog(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Search filtering — flatten tree if treeNodes exists, otherwise use files
  const flatFiles = [];
  function flatten(nodes) {
    for (const n of nodes) {
      if (n.type !== 'tree') flatFiles.push(n);
      if (n.children && n.children.length > 0) flatten(n.children);
    }
  }
  
  if (treeNodes.length > 0) {
    flatten(treeNodes);
  } else {
    // If no tree structure, use the flat files array
    files.forEach(f => flatFiles.push(f));
  }

  const filteredFlat = search ? flatFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase())) : null;

  return (
    <div className="w-72 h-full flex flex-col shrink-0 text-sm select-none animate-slide-in"
      style={{ background: '#080C14', borderRight: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>

      {/* Repo Loader */}
      <div className="p-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.25em] mb-4 font-black px-1">Source Repository</div>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1 group">
            <input
              id="repo-input"
              type="text"
              value={repoInput}
              onFocus={() => {
                if (window.isDemoMode) {
                  setRepoInput('github.com/demo/mathematics-suite');
                }
              }}
              onChange={e => setRepoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadRepo()}
              placeholder="github.com/user/repo"
              className="w-full text-xs text-gray-300 placeholder-gray-600 rounded-xl px-4 py-3 outline-none transition-all border border-white/5 bg-white/[0.02] focus:border-vscode-accent/50 focus:bg-white/[0.05] focus:shadow-glow-blue"
            />
          </div>
          <button
            id="load-repo-btn"
            onClick={() => {
              loadRepo();
              if (window.isDemoMode) window.advanceDemo?.(10);
            }}
            disabled={isLoading || !repoInput}
            className="w-11 h-11 flex items-center justify-center rounded-xl shrink-0 transition-all disabled:opacity-40 hover:scale-105 active:scale-95 bg-gradient-to-br from-blue-600 to-cyan-600 shadow-glow-blue text-white"
          >
            {isLoading
              ? <Loader2 size={18} className="animate-spin" />
              : <Download size={18} />}
          </button>
        </div>

        <label 
          data-testid="upload-zip-btn"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-white/10 text-gray-500 text-[10px] uppercase font-black tracking-widest cursor-pointer hover:border-vscode-accent/30 hover:text-gray-400 transition-all">
          <Download size={14} />
          Upload ZIP Project
          <input type="file" accept=".zip" className="hidden" onChange={handleFileUpload} />
        </label>

        <button 
          onClick={onDownloadProject}
          disabled={!files || files.length === 0}
          className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] uppercase font-black tracking-widest cursor-pointer hover:bg-cyan-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed group">
          <Download size={14} className="group-hover:animate-bounce" />
          Download Fixed Project
        </button>
        
        {repoError && (
          <div className="mt-2 flex items-start gap-1.5 px-1">
            <AlertCircle size={11} className="text-yellow-400 shrink-0 mt-0.5" />
            <span className="text-[10px] text-yellow-400/80 leading-tight">{repoError}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={11} className="text-gray-600 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none min-w-0"
          />
          {search && <button onClick={() => setSearch('')}><X size={11} className="text-gray-600 hover:text-gray-400" /></button>}
        </div>
      </div>

      {/* Explorer Label */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
          <FolderOpen size={11} className="text-blue-400" />
          Explorer
          {flatFiles.length > 0 && !search && (
            <span className="ml-auto text-[9px] text-gray-700">{flatFiles.length} files</span>
          )}
        </div>
      </div>

      {/* Tree / Flat Search Results */}
      <div className="flex-1 overflow-y-auto pb-4 px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1f2937 transparent' }}>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2 px-2 pt-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: `${60 + i * 8}%` }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && treeNodes.length === 0 && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <FolderOpen size={28} className="text-gray-700 mb-3" />
            <p className="text-[11px] text-gray-600 leading-relaxed">Upload a project or enter a GitHub URL to start.</p>
          </div>
        )}

        {/* Search results (flat) */}
        {search && filteredFlat && (
          <div className="space-y-0.5 pt-1">
            {filteredFlat.length === 0
              ? <div className="px-3 py-4 text-[11px] text-gray-600 text-center">No files match "{search}"</div>
              : filteredFlat.map(node => (
                  <div
                    key={node.id}
                    data-testid={`file-${node.name}`}
                    onClick={() => handleFileClick(node)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                      selectedFileId === node.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                    style={selectedFileId === node.id
                      ? { background: 'rgba(34,211,238,0.08)', borderLeft: '2px solid #22d3ee' }
                      : {}}
                  >
                    <FileIcon name={node.name} />
                    <span className="text-xs truncate">{node.name}</span>
                    <span className="text-[10px] text-gray-600 truncate ml-auto">{node.path.replace(`/${node.name}`, '')}</span>
                  </div>
                ))
            }
          </div>
        )}

        {/* Full tree */}
        {!search && treeNodes.length > 0 && (
          <div className="space-y-0.5 pt-1">
            {treeNodes.map(node => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedFileId={selectedFileId}
                expandedFolders={expandedFolders}
                onToggle={toggleFolder}
                onFileClick={handleFileClick}
                loadingFileId={loadingFileId}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default FileTree;
