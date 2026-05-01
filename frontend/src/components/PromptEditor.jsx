import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Save, RefreshCw, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';

const PromptEditor = ({ onLog }) => {
  const [prompts, setPrompts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const data = await api.getPrompts();
      setPrompts(data);
    } catch (e) {
      console.error(e);
      onLog("Failed to fetch prompts from backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.updatePrompts(prompts);
      setMessage({ type: 'success', text: 'Prompts updated successfully!' });
      onLog("System prompts updated dynamically.", "success");
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to save prompts' });
      onLog("Prompt update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePromptChange = (key, value) => {
    setPrompts(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 animate-pulse">
        <RefreshCw className="animate-spin mb-4" size={24} />
        <span className="text-[10px] font-black uppercase tracking-widest">Loading Configuration...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          Prompt Management
        </h2>
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            saving ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-glow-blue'
          }`}
        >
          {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 border ${
          message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span className="text-[10px] font-bold">{message.text}</span>
        </div>
      )}

      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {prompts && Object.entries(prompts).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black uppercase tracking-widest text-cyan-400/70">
                {key.replace('_', ' ')}
              </label>
              <span className="text-[8px] font-bold text-gray-600 uppercase">Dynamic Input Enabled</span>
            </div>
            <textarea
              value={value}
              onChange={(e) => handlePromptChange(key, e.target.value)}
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-gray-300 font-mono focus:border-cyan-400/30 focus:outline-none transition-all resize-none custom-scrollbar"
              spellCheck="false"
            />
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <p className="text-[9px] text-gray-500 leading-relaxed italic">
            💡 Changes to prompts are applied instantly to the next agent cycle. Use placeholders like <code className="text-cyan-400">{"{code}"}</code> or <code className="text-cyan-400">{"{repo_path}"}</code> as defined in the base logic.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
