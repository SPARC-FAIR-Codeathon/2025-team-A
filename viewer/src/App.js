import React, { useState, useEffect, useCallback } from 'react';
import { Globe, FolderOpen, File, Folder, BrainCircuit, Download, Library, XCircle, CheckCircle2, Loader, DownloadCloud, Users, Trash2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Search, ServerCrash, PackagePlus } from 'lucide-react';
import DataGrid from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

// --- Helper Functions & Components ---

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center">
          <h2 className="font-bold text-red-800">Something went wrong rendering this component.</h2>
        </div>
      );
    }
    return this.props.children; 
  }
}

// --- Modals ---

const ConfirmDeleteModal = ({ dataset, onConfirm, onCancel }) => {
  if (!dataset) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
        <div className="flex items-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mr-4 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
            <p className="mt-2 text-gray-600">Are you sure you want to delete dataset <span className="font-semibold">{dataset.id}</span>?</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
          <button onClick={() => onConfirm(dataset.id)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
};

const DownloadConfirmModal = ({ confirmationData, onConfirm, onCancel }) => {
  if (!confirmationData) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
        <div className="flex items-start">
          <DownloadCloud className="w-8 h-8 text-purple-600 mr-4 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Download</h2>
            <p className="mt-2 text-gray-600">Download <span className="font-semibold">{confirmationData.fileCount} files</span>?</p>
            <p className="mt-2 text-lg font-bold text-gray-800">Total Size: {confirmationData.formattedSize}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700">Confirm & Download</button>
        </div>
      </div>
    </div>
  );
};

const GlobalProgressIndicator = ({ progress, onCancel }) => {
    if (progress.status === 'idle') return null;
  
    const isError = progress.status === 'error';
    const isSuccess = progress.status === 'done';
    const isExists = progress.status === 'exists';
    const inProgress = progress.status === 'progress' || progress.status === 'starting';
  
    const progressValue = (progress.value?.progress ?? 0) * 100;
  
    return (
      <div className={`fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border p-4 w-80 z-50`}>
        <div className="flex items-start">
            {isError && <XCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />}
            {isSuccess && <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />}
            {isExists && <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0" />}
            {inProgress && <Loader className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0 animate-spin" />}
            <div className="flex-grow">
                <p className="font-bold text-gray-800">
                    {isError ? 'Error' : isSuccess ? 'Complete' : isExists ? 'Notice' : 'Downloading...'}
                </p>
                <p className="text-sm text-gray-600 mt-1">{progress.message}</p>
            </div>
            {(isSuccess || isError || isExists) && (
                <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
                    <XCircle className="w-5 h-5" />
                </button>
            )}
        </div>
        {inProgress && progress.value?.progress != null && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${progressValue}%` }}></div>
            </div>
          </div>
        )}
      </div>
    );
};


// --- Views ---

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center space-x-2 mt-6">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-white border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-white border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
    );
};

const BrowserView = ({ onStartPackage, library }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 5;

    const libraryIds = library.map(item => item.id);

    const handleSearch = useCallback(async (page = 1) => {
        if (!query) return;
        setIsLoading(true);
        setError(null);
        setCurrentPage(page);
        try {
            const response = await window.electronAPI.browseDatasets({ query, page, limit });
            if (response.error) {
                throw new Error(response.error);
            }
            setResults(response.datasets || []);
            setTotalCount(response.totalCount || 0);
        } catch (err) {
            setError(err.message);
            setResults([]);
            setTotalCount(0);
        }
        setIsLoading(false);
    }, [query]);

    useEffect(() => {
        if (query) {
            handleSearch(currentPage);
        }
    }, [currentPage, handleSearch, query]);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        setQuery(searchTerm);
        setCurrentPage(1); // Reset to first page for new search
        if (searchTerm) {
            handleSearch(1);
        } else {
            setResults([]);
            setTotalCount(0);
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Browse SPARC Datasets</h2>
                    <p className="text-gray-600 mt-1">Search for public datasets and download them to your local library.</p>
                    <form onSubmit={onSearchSubmit} className="mt-4 flex gap-2">
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="e.g., heart, lung, nerve..." className="flex-grow bg-gray-100 border border-gray-300 rounded-lg py-2 px-4 focus:ring-2 focus:ring-purple-500" />
                        <button type="submit" className="rounded-lg bg-purple-600 px-5 py-2 text-base font-semibold text-white shadow-md hover:bg-purple-700 transition-all disabled:bg-gray-400" disabled={isLoading}>
                            {isLoading ? <Loader className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}
                        </button>
                    </form>
                </div>

                <div className="mt-6">
                    {isLoading && <div className="text-center p-10"><Loader className="animate-spin w-8 h-8 mx-auto text-purple-600"/></div>}
                    {error && 
                        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-center">
                            <ServerCrash className="w-8 h-8 mx-auto mb-2"/>
                            <p className="font-bold">Could not fetch results.</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    }
                    {!isLoading && !error && results.length > 0 && (
                        <div className="space-y-3">
                            {results.map(ds => (
                                <div key={ds.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex items-center justify-between gap-4">
                                    <div className="flex-grow overflow-hidden">
                                        <p className="text-xs font-semibold text-purple-600">ID: {ds.id} &bull; v{ds.version}</p>
                                        <h3 className="font-bold text-gray-800 truncate">{ds.name}</h3>
                                        <p className="text-sm text-gray-500">Size: {formatSize(ds.size)}</p>
                                    </div>
                                    {libraryIds.includes(String(ds.id)) ? (
                                        <div className="flex items-center gap-2 text-green-600 font-semibold text-sm px-3 py-2 rounded-lg bg-green-50">
                                            <CheckCircle2 className="w-5 h-5"/> In Library
                                        </div>
                                    ) : (
                                        <button onClick={() => onStartPackage(String(ds.id))} className="flex-shrink-0 rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800 transition-all">
                                            <Download className="w-4 h-4 inline-block mr-1.5"/> Download
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Pagination currentPage={currentPage} totalPages={Math.ceil(totalCount / limit)} onPageChange={(p) => setCurrentPage(p)} />
                        </div>
                    )}
                     {!isLoading && !error && query && results.length === 0 && (
                        <div className="text-center p-10 text-gray-500">
                            <Search className="w-10 h-10 mx-auto mb-2"/>
                            <p className="font-semibold">No results found for "{query}".</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// NEWLY RESTORED: PackagerView component
const PackagerView = ({ onStartPackage }) => {
    const [datasetId, setDatasetId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (datasetId.trim()) {
            onStartPackage(datasetId.trim());
            setDatasetId(''); // Clear input after submission
        }
    };

    return (
        <div className="w-full p-8 flex justify-center items-center">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-center text-gray-900">Package a Dataset by ID</h2>
                <p className="text-center text-gray-600 mt-2">Enter a SPARC Dataset ID to download and add it to your library.</p>
                <form onSubmit={handleSubmit} className="mt-6">
                    <input 
                        type="text" 
                        value={datasetId} 
                        onChange={(e) => setDatasetId(e.target.value)} 
                        placeholder="e.g., 150" 
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg py-3 px-4 text-gray-800 focus:ring-2 focus:ring-purple-500" 
                    />
                    <button 
                        type="submit" 
                        className="w-full mt-4 rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold text-white shadow-md hover:bg-purple-700 transition-all disabled:bg-gray-400"
                        disabled={!datasetId.trim()}
                    >
                        <Download className="inline-block w-5 h-5 mr-2"/>
                        Download & Package
                    </button>
                </form>
            </div>
        </div>
    );
};

const LibraryView = ({ library, onViewPackage, onDeleteRequest }) => { 
    if (library.length === 0) { 
        return ( 
            <div className="w-full text-center p-10 flex items-center justify-center h-full"> 
                <div className="max-w-lg"> 
                    <Library className="mx-auto h-16 w-16 text-gray-400" /> 
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Your Library is Empty</h2> 
                    <p className="mt-4 text-gray-600">Use the <span className="font-semibold text-purple-600">Browser</span> or <span className="font-semibold text-purple-600">Packager</span> to download datasets. They will appear here once complete.</p> 
                </div> 
            </div> 
        ); 
    } 
    return ( 
        <div className="w-full p-8 overflow-y-auto"> 
            <h2 className="text-3xl font-bold text-gray-900 mb-6">My Library</h2> 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> 
                {library.map(pkg => ( 
                    <div key={pkg.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all flex flex-col group"> 
                        <div className="relative h-40 bg-gray-200 rounded-t-2xl flex items-center justify-center cursor-pointer" onClick={() => onViewPackage(pkg)}>
                            {pkg.thumbnail ? <img src={pkg.thumbnail} alt={`Thumbnail for ${pkg.id}`} className="h-full w-full object-cover rounded-t-2xl" /> : <BrainCircuit className="w-16 h-16 text-gray-400" />}
                            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); window.electronAPI.openDatasetLocation(pkg.path); }} className="p-1.5 bg-white/60 backdrop-blur-sm rounded-full text-gray-700 hover:bg-blue-500 hover:text-white" title="Open Location"><FolderOpen className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteRequest(pkg); }} className="p-1.5 bg-white/60 backdrop-blur-sm rounded-full text-gray-700 hover:bg-red-500 hover:text-white" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col flex-grow cursor-pointer" onClick={() => onViewPackage(pkg)}>
                            <p className="text-xs font-semibold text-purple-600 uppercase">Dataset {pkg.id}</p>
                            <h3 className="font-bold text-base text-gray-800 mt-1 flex-grow" title={pkg.title}>{pkg.title}</h3>
                            {pkg.authors && pkg.authors !== 'N/A' && <p className="text-xs text-gray-500 mt-2 pt-2 border-t truncate" title={pkg.authors}><Users className="w-3 h-3 mr-1.5 inline-block"/>{pkg.authors}</p>}
                        </div>
                    </div> 
                ))} 
            </div> 
        </div> 
    ); 
};


// --- File Viewer and its Sub-components (Full Implementation) ---

const ContentViewer = ({ file, content, isLoading, packagePath }) => { 
    const [isJsonExpanded, setIsJsonExpanded] = useState(false); 
    useEffect(() => { setIsJsonExpanded(false); }, [file]); 
    
    const handleDownload = async () => { 
        if (!file) return; 
        await window.electronAPI.downloadSingleFile(packagePath, file.path, file.name); 
    }; 

    if (!file) { 
        return ( 
            <div className="flex items-center justify-center h-full"> 
                <div className="text-center text-gray-500">
                    <BrainCircuit className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select a file to view its contents.</p>
                </div> 
            </div> 
        ); 
    } 
    
    if (isLoading) { 
        return <div className="flex items-center justify-center h-full"><Loader className="animate-spin w-8 h-8 text-purple-600"/></div>; 
    } 

    const getViewer = () => { 
        if (!content || content.type === 'unsupported') { 
            return <div className="text-center"><XCircle className="mx-auto h-10 w-10 text-red-400" /><p className="mt-2">This file type is not supported for preview.</p></div>; 
        } 
        switch (content.type) { 
            case 'image': 
                return <img src={`data:${content.mimeType};base64,${content.data}`} alt={file.name} className="max-w-full h-auto rounded-lg shadow-md" />; 
            case 'text': 
                try { 
                    const jsonData = JSON.parse(content.data); 
                    const formattedJson = JSON.stringify(jsonData, null, 2); 
                    const lines = formattedJson.split('\n'); 
                    const lineLimit = 50; 
                    if (lines.length > lineLimit && !isJsonExpanded) { 
                        const truncatedJson = lines.slice(0, lineLimit).join('\n'); 
                        return ( 
                            <div> 
                                <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-auto">{truncatedJson}</pre> 
                                <div className="text-center mt-2"> 
                                    <button onClick={() => setIsJsonExpanded(true)} className="text-sm font-semibold text-purple-600 hover:text-purple-800"> ... Show More ({lines.length - lineLimit} more lines) </button> 
                                </div> 
                            </div> 
                        ); 
                    } 
                    return <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-auto">{formattedJson}</pre>; 
                } catch (e) { 
                    return <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-auto whitespace-pre-wrap">{content.data}</pre>; 
                } 
            case 'table': 
                return ( 
                    <ErrorBoundary> 
                        <DataGrid columns={content.columns} rows={content.rows} className="h-96 rdg-light" /> 
                    </ErrorBoundary> 
                ); 
            default: 
                return <p>Could not load content for this file.</p>; 
        } 
    }; 

    return ( 
        <div> 
            <div className="flex justify-between items-start"> 
                <div> 
                    <h2 className="text-xl font-bold text-gray-900">{file.name}</h2> 
                    <p className="text-sm text-gray-600 mt-1">File Size: {formatSize(file.size)}</p> 
                </div> 
                <button onClick={handleDownload} className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 transition-all"> 
                    <DownloadCloud className="w-4 h-4" /> Download 
                </button> 
            </div> 
            <div className="mt-6 p-4 border rounded-lg bg-white">{getViewer()}</div> 
        </div> 
    ); 
};

const TreeNode = ({ node, onFileSelect, selectedFile, path }) => { 
    const [isOpen, setIsOpen] = useState(true); 
    if (node.type === 'folder') { 
        return ( 
            <li> 
                <div className="flex items-center p-1.5 rounded-md hover:bg-gray-200 cursor-pointer" onClick={() => setIsOpen(!isOpen)}> 
                    <Folder className={`w-5 h-5 mr-2 flex-shrink-0 ${isOpen ? 'text-purple-600' : 'text-gray-500'}`} /> 
                    <span className="text-sm font-medium text-gray-800 truncate">{node.name}</span> 
                </div> 
                {isOpen && ( 
                    <ul className="pl-6 border-l-2 border-gray-200 ml-2.5"> 
                        {node.children.map((childNode, index) => <TreeNode key={index} node={childNode} onFileSelect={onFileSelect} selectedFile={selectedFile} path={`${path}/${childNode.name}`} />)} 
                    </ul> 
                )} 
            </li> 
        ); 
    } 
    const isSelected = selectedFile?.path === path; 
    return ( 
        <li> 
            <div className={`flex items-center p-1.5 rounded-md cursor-pointer ${isSelected ? 'bg-purple-200' : 'hover:bg-gray-200'}`} onClick={() => onFileSelect({ ...node, path: path })}> 
                <File className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" /> 
                <span className="text-sm text-gray-700 truncate">{node.name}</span> 
            </div> 
        </li> 
    ); 
};

const FileTreeView = ({ tree, onFileSelect, selectedFile }) => { 
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => { setCurrentPage(1); }, [tree]);

    const totalPages = Math.ceil(tree.length / ITEMS_PER_PAGE);
    const paginatedTree = tree.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="flex flex-col flex-grow min-h-0">
            <div className="flex-grow overflow-y-auto pr-2">
                <ul className="space-y-1"> 
                    {paginatedTree.map((node, index) => <TreeNode key={index} node={node} onFileSelect={onFileSelect} selectedFile={selectedFile} path={node.name} />)} 
                </ul> 
            </div>
            {totalPages > 1 && (
                <div className="flex-shrink-0 pt-2">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            )}
        </div>
    ); 
};

const FileViewer = ({ manifest, packagePath, onBack }) => { 
    const [selectedFile, setSelectedFile] = useState(null); 
    const [fileContent, setFileContent] = useState(null); 
    const [isLoading, setIsLoading] = useState(false); 
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { 
        const getFileContent = async () => { 
            if (selectedFile && packagePath) { 
                setIsLoading(true); 
                setFileContent(null); 
                const content = await window.electronAPI.getFileContent(packagePath, selectedFile.path); 
                setFileContent(content); 
                setIsLoading(false); 
            } 
        }; 
        getFileContent(); 
    }, [selectedFile, packagePath]); 

    const filterTree = (nodes, term) => {
        if (!term) return nodes;
        const lowerCaseTerm = term.toLowerCase();
        return nodes.reduce((acc, node) => {
            if (node.type === 'file' && node.name.toLowerCase().includes(lowerCaseTerm)) {
                acc.push(node);
            } else if (node.type === 'folder') {
                const filteredChildren = filterTree(node.children || [], term);
                if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lowerCaseTerm)) {
                    acc.push({ ...node, children: filteredChildren });
                }
            }
            return acc;
        }, []);
    };

    const filteredTree = manifest ? filterTree(manifest.file_tree, searchTerm) : [];

    return ( 
        <div className="flex w-full h-full"> 
            <div className="w-1/3 flex-shrink-0 bg-gray-50 border-r border-gray-200 p-4 flex flex-col"> 
                <button onClick={onBack} className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 transition-all mb-4 self-start">
                    <ArrowLeft className="w-4 h-4" /> Back to Library
                </button>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 mb-1 truncate" title={manifest.dataset_title}>Dataset: {manifest.dataset_id}</h2> 
                    <p className="text-sm text-gray-700 mb-2 truncate" title={manifest.dataset_title}>{manifest.dataset_title}</p>
                    {manifest.authors && manifest.authors !== 'N/A' && (
                        <p className="text-xs text-gray-500 flex items-center truncate" title={manifest.authors}>
                            <Users className="w-3 h-3 mr-1.5 flex-shrink-0" />
                            <span>{manifest.authors}</span>
                        </p>
                    )}
                </div>
                <div className="relative mb-4 flex-shrink-0">
                    <input type="text" placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <FileTreeView tree={filteredTree} onFileSelect={setSelectedFile} selectedFile={selectedFile} /> 
            </div> 
            <div className="w-2/3 overflow-y-auto p-6"> 
                <ContentViewer file={selectedFile} content={fileContent} isLoading={isLoading} packagePath={packagePath} /> 
            </div> 
        </div> 
    ); 
};


// --- Main App Component ---
const App = () => {
  const [view, setView] = useState('browser'); // Default view is now browser
  const [library, setLibrary] = useState([]);
  const [activePackage, setActivePackage] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [datasetToDelete, setDatasetToDelete] = useState(null);
  
  // Global state for packaging progress and confirmation
  const [progress, setProgress] = useState({ status: 'idle', message: '' });
  const [downloadConfirmation, setDownloadConfirmation] = useState(null);

  const fetchLibrary = useCallback(async () => {
    const lib = await window.electronAPI.getLibrary();
    setLibrary(lib);
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  useEffect(() => {
    const handleProgress = (update) => {
      if (update.status === 'confirm_download') {
        setDownloadConfirmation(update.value);
      } else {
        setProgress(update);
        if (update.status === 'done') {
            fetchLibrary();
        }
      }
    };
    const removeListener = window.electronAPI.onPackagingProgress(handleProgress);
    return () => { if (removeListener) removeListener(); };
  }, [fetchLibrary]);

  const handleStartPackage = (datasetId) => {
    setProgress({ status: 'starting', message: 'Preparing download...' });
    window.electronAPI.startPackaging(datasetId);
  };

  const handleConfirmDownload = () => {
    window.electronAPI.confirmPackaging(true);
    setDownloadConfirmation(null);
    setProgress({ status: 'progress', message: 'Download confirmed, starting...', value: { progress: 0 } });
  };

  const handleCancelDownload = () => {
    window.electronAPI.confirmPackaging(false);
    setDownloadConfirmation(null);
    setProgress({ status: 'idle', message: '' });
  };

  const handleViewPackage = async (pkg) => {
    const manifestData = await window.electronAPI.getManifest(pkg.path);
    if (manifestData) {
      setActivePackage(pkg);
      setManifest(manifestData);
      setView('viewer');
    }
  };

  const handleReturnToLibrary = () => {
    fetchLibrary();
    setView('library');
    setActivePackage(null);
    setManifest(null);
  };
  
  const handleConfirmDelete = async (datasetId) => {
      const updatedLibrary = await window.electronAPI.deleteDataset(datasetId);
      setLibrary(updatedLibrary);
      setDatasetToDelete(null);
  };

  const NavButton = ({ targetView, icon, children }) => {
    const isActive = view === targetView;
    const Icon = icon;
    return (
      <button onClick={() => setView(targetView)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 border-2 ${isActive ? 'bg-purple-600 border-purple-600 text-white' : 'bg-transparent text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
        <Icon className="inline-block w-4 h-4 mr-2" />{children}
      </button>
    );
  };

  return (
    <div className="bg-white text-gray-800 min-h-screen font-sans flex flex-col">
      <ConfirmDeleteModal dataset={datasetToDelete} onConfirm={handleConfirmDelete} onCancel={() => setDatasetToDelete(null)} />
      <DownloadConfirmModal confirmationData={downloadConfirmation} onConfirm={handleConfirmDownload} onCancel={handleCancelDownload} />
      <GlobalProgressIndicator progress={progress} onCancel={() => setProgress({ status: 'idle', message: ''})} />

      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40 flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('browser')}>
              <img src="/sparchive_logo.png" alt="spARCHIVE Logo" className="h-10 w-auto" />
            </div>
            <nav className="flex items-center space-x-2">
              <NavButton targetView="browser" icon={Globe}>Browser</NavButton>
              <NavButton targetView="packager" icon={PackagePlus}>Packager</NavButton>
              <NavButton targetView="library" icon={Library}>My Library</NavButton>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden bg-gray-100">
        {view === 'browser' && <BrowserView onStartPackage={handleStartPackage} library={library} />}
        {view === 'packager' && <PackagerView onStartPackage={handleStartPackage} />}
        {view === 'library' && <LibraryView library={library} onViewPackage={handleViewPackage} onDeleteRequest={setDatasetToDelete} />}
        {view === 'viewer' && manifest && <FileViewer manifest={manifest} packagePath={activePackage.path} onBack={handleReturnToLibrary} />}
      </main>
    </div>
  );
};

export default App;
