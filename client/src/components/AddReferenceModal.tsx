import React, { useState } from 'react';
import { X, Upload, Link, AlignLeft, Loader2, Info, Plus } from 'lucide-react';

interface AddReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadFile: (file: File) => Promise<void>;
    onAddUrl: (url: string) => Promise<void>;
    onAddText: (name: string, text: string) => void;
}

const AddReferenceModal: React.FC<AddReferenceModalProps> = ({ isOpen, onClose, onUploadFile, onAddUrl, onAddText }) => {
    const [tab, setTab] = useState<'file' | 'url' | 'text'>('file');
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            await onUploadFile(file);
            onClose();
        } catch (err) {
            setError('Failed to process file. Ensure it is a valid PDF or DOCX.');
        } finally {
            setLoading(false);
        }
    };

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await onAddUrl(url);
            onClose();
        } catch (err) {
            setError('Failed to fetch URL. Ensure it is public and accessible.');
        } finally {
            setLoading(false);
        }
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        onAddText(title, content);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl w-full max-w-md overflow-hidden border border-[#e1e1e0]">
                {/* Header */}
                <div className="p-4 border-b border-[#e1e1e0] flex items-center justify-between bg-[#f7f7f5]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#37352f] text-white rounded-lg">
                            <Plus size={16} />
                        </div>
                        <h2 className="text-sm font-bold text-[#37352f]">Add Reference Material</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#efefed] rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#e1e1e0] bg-white">
                    <button onClick={() => setTab('file')}
                        className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors
                        ${tab === 'file' ? 'border-b-2 border-[#37352f] text-[#37352f]' : 'text-[#7a776e] hover:bg-[#fafafa]'}`}>
                        <Upload size={14} /> Upload
                    </button>
                    <button onClick={() => setTab('url')}
                        className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors
                        ${tab === 'url' ? 'border-b-2 border-[#37352f] text-[#37352f]' : 'text-[#7a776e] hover:bg-[#fafafa]'}`}>
                        <Link size={14} /> URL
                    </button>
                    <button onClick={() => setTab('text')}
                        className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors
                        ${tab === 'text' ? 'border-b-2 border-[#37352f] text-[#37352f]' : 'text-[#7a776e] hover:bg-[#fafafa]'}`}>
                        <AlignLeft size={14} /> Paste Text
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 h-[280px]">
                    {error && (
                        <div className="mb-4 p-2 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 flex items-center gap-2">
                            <Info size={12} /> {error}
                        </div>
                    )}

                    {tab === 'file' && (
                        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-[#e1e1e0] rounded-xl hover:border-[#37352f] transition-colors group cursor-pointer relative">
                            <input type="file" onChange={handleFileChange} disabled={loading} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx,.txt" />
                            {loading ? (
                                <Loader2 size={32} className="animate-spin text-[#37352f]" />
                            ) : (
                                <>
                                    <Upload size={32} className="text-[#7a776e] group-hover:text-[#37352f] mb-3 transition-colors" />
                                    <p className="text-xs font-medium text-[#37352f]">Upload PDF or DOCX</p>
                                    <p className="text-[10px] text-[#7a776e] mt-1">Maximum size 10MB</p>
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'url' && (
                        <form onSubmit={handleUrlSubmit} className="flex flex-col h-full">
                            <p className="text-[10px] text-[#7a776e] mb-2 uppercase font-bold tracking-tight">Crawl Website Text</p>
                            <input
                                autoFocus
                                type="url"
                                placeholder="https://patent-reference.com/docs"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-[#e1e1e0] rounded-lg text-sm focus:ring-2 focus:ring-[#37352f]/10 outline-none mb-4"
                            />
                            <div className="mt-auto bg-[#f7f7f5] p-3 rounded-lg border border-[#e1e1e0] mb-4">
                                <p className="text-[10px] text-[#7a776e] leading-relaxed">
                                    AI will visit the URL and extract readable text to use as context for future refinements.
                                </p>
                            </div>
                            <button type="submit" disabled={!url || loading}
                                className="bg-[#37352f] text-white py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Fetch & Analyze URL'}
                            </button>
                        </form>
                    )}

                    {tab === 'text' && (
                        <form onSubmit={handleTextSubmit} className="flex flex-col h-full">
                            <input
                                autoFocus
                                placeholder="Reference Name (e.g. Prior Art X)"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-1.5 border border-[#e1e1e0] rounded-lg text-xs focus:ring-2 focus:ring-[#37352f]/10 outline-none mb-2"
                            />
                            <textarea
                                placeholder="Paste technical document content here..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full flex-1 px-3 py-2 border border-[#e1e1e0] rounded-lg text-xs focus:ring-2 focus:ring-[#37352f]/10 outline-none resize-none"
                            />
                            <button type="submit" disabled={!title || !content}
                                className="bg-[#37352f] text-white py-2 rounded-lg text-xs font-bold mt-4 hover:opacity-90 transition-opacity disabled:opacity-50">
                                Add Content
                            </button>
                        </form>
                    )}
                </div>

                <div className="p-4 bg-[#fafafa] border-t border-[#e1e1e0] flex justify-end">
                    <button onClick={onClose} className="text-xs font-semibold text-[#7a776e] hover:text-[#37352f] transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddReferenceModal;
