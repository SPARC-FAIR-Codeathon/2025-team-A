import React, { useState, useEffect } from 'react';
import { Box, FolderOpen, File, Folder, BrainCircuit, Download, Library, XCircle, CheckCircle2, Loader, DownloadCloud, Users, Trash2, AlertTriangle } from 'lucide-react';
import DataGrid from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in DataGrid component:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <h2 className="text-lg font-bold text-red-800">Something went wrong.</h2>
          <p className="mt-2 text-red-700">There was an error trying to render this table.</p>
        </div>
      );
    }
    return this.props.children; 
  }
}

// --- Confirmation Modal Component ---
const ConfirmDeleteModal = ({ dataset, onConfirm, onCancel }) => {
  if (!dataset) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
        <div className="flex items-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mr-4 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
            <p className="mt-2 text-gray-600">
              Are you sure you want to permanently delete dataset{' '}
              <span className="font-semibold">{dataset.id}</span>?
              <br />
              <span className="font-semibold truncate block">{dataset.title}</span>
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-red-600 font-semibold">This action cannot be undone.</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dataset.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete Dataset
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Packager Component ---
const PackagerView = () => {
    const [datasetId, setDatasetId] = useState('');
    const [progress, setProgress] = useState({ status: 'idle', message: '' });

    useEffect(() => {
        const handleProgress = (update) => setProgress(update);
        const removeListener = window.electronAPI.onPackagingProgress(handleProgress);
        return () => { if (removeListener) removeListener(); };
    }, []);

    const handlePackage = () => {
        if (datasetId.trim()) {
            setProgress({ status: 'starting', message: 'Initiating download...' });
            window.electronAPI.startPackaging(datasetId.trim());
        }
    };

    return (
        <div className="w-full p-8 flex justify-center items-center">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-center text-gray-900">Package a Dataset</h2>
                <p className="text-center text-gray-600 mt-2">Enter a SPARC Dataset ID to download it.</p>
                <div className="mt-6">
                    <input type="text" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} placeholder="e.g., 150" className="w-full bg-gray-100 border border-gray-300 rounded-lg py-3 px-4 text-gray-800 focus:ring-2 focus:ring-purple-500" disabled={progress.status === 'progress' || progress.status === 'starting'} />
                    <button onClick={handlePackage} className="w-full mt-4 rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold text-white shadow-md hover:bg-purple-500 transition-all disabled:bg-gray-400" disabled={progress.status === 'progress' || progress.status === 'starting'}>
                        Download & Package
                    </button>
                </div>
                {progress.status !== 'idle' && (
                    <div className="mt-6 text-center p-3 rounded-lg bg-gray-50">
                        {progress.status === 'starting' && <><Loader className="animate-spin inline-block mr-2" /><span>{progress.message}</span></>}
                        {progress.status === 'progress' && <><Loader className="animate-spin inline-block mr-2" /><span>{progress.message}</span></>}
                        {progress.status === 'done' && <><CheckCircle2 className="inline-block mr-2 text-green-500" /><span>{progress.message}</span></>}
                        {progress.status === 'error' && <><XCircle className="inline-block mr-2 text-red-500" /><span>Error: {progress.message}</span></>}
                        {progress.status === 'exists' && <><AlertTriangle className="inline-block mr-2 text-yellow-500" /><span>{progress.message}</span></>}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LibraryView Component ---
const LibraryView = ({ library, onViewPackage, onDeleteRequest }) => { 
    if (library.length === 0) { 
        return ( 
            <div className="w-full text-center p-10 flex items-center justify-center"> 
                <div className="max-w-lg"> 
                    <Library className="mx-auto h-16 w-16 text-gray-400" /> 
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Welcome to spARCHIVE</h2> 
                    <p className="mt-4 text-gray-600">Your library of offline SPARC datasets is currently empty. To get started, navigate to the <span className="font-semibold text-purple-600">Packager</span> tab, enter a public SPARC Dataset ID, and download your first archive. Once downloaded, it will appear here, ready for offline viewing and analysis.</p> 
                </div> 
            </div> 
        ); 
    } 
    return ( 
        <div className="w-full p-8"> 
            <h2 className="text-3xl font-bold text-gray-900 mb-6">My Library</h2> 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> 
                {library.map(pkg => ( 
                    <div key={pkg.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all flex flex-col group"> 
                        <div className="relative h-40 bg-gray-200 rounded-t-2xl flex items-center justify-center cursor-pointer" onClick={() => onViewPackage(pkg)}>
                            {pkg.thumbnail ? <img src={pkg.thumbnail} alt={`Thumbnail for dataset ${pkg.id}`} className="h-full w-full object-cover rounded-t-2xl" /> : <BrainCircuit className="w-16 h-16 text-gray-400" />}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteRequest(pkg); }}
                                className="absolute top-2 right-2 p-1.5 bg-white/50 backdrop-blur-sm rounded-full text-gray-700 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Dataset"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col flex-grow cursor-pointer" onClick={() => onViewPackage(pkg)}>
                            <p className="text-xs font-semibold text-purple-600 uppercase">Dataset [{pkg.id}]</p>
                            <h3 className="font-bold text-base text-gray-800 mt-1 flex-grow" title={pkg.title}>
                                {pkg.title}
                            </h3>
                            {pkg.authors && pkg.authors !== 'N/A' && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 flex items-center">
                                        <Users className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                        <span className="truncate" title={pkg.authors}>{pkg.authors}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div> 
                ))} 
            </div> 
        </div> 
    ); 
};


// --- ContentViewer Component ---
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
        return <div className="flex items-center justify-center h-full"><p>Loading...</p></div>; 
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
                    <p className="text-sm text-gray-600 mt-1">File Size: {(file.size / 1024).toFixed(2)} KB</p> 
                </div> 
                <button onClick={handleDownload} className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 transition-all"> 
                    <DownloadCloud className="w-4 h-4" /> Download 
                </button> 
            </div> 
            <div className="mt-6 p-4 border rounded-lg bg-white">{getViewer()}</div> 
        </div> 
    ); 
};


// --- FileTreeView and TreeNode Components ---
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
    return ( 
        <ul className="space-y-1"> 
            {tree.map((node, index) => <TreeNode key={index} node={node} onFileSelect={onFileSelect} selectedFile={selectedFile} path={node.name} />)} 
        </ul> 
    ); 
};

// --- FileViewer Component ---
const FileViewer = ({ manifest, packagePath }) => { 
    const [selectedFile, setSelectedFile] = useState(null); 
    const [fileContent, setFileContent] = useState(null); 
    const [isLoading, setIsLoading] = useState(false); 
    
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

    return ( 
        <> 
            <div className="w-1/3 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4"> 
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Dataset: {manifest.dataset_id}</h2> 
                    <p className="text-sm text-gray-700 mb-2" title={manifest.dataset_title}>{manifest.dataset_title}</p>
                    {manifest.authors && manifest.authors !== 'N/A' && (
                        <p className="text-xs text-gray-500 flex items-center" title={manifest.authors}>
                            <Users className="w-3 h-3 mr-1.5 flex-shrink-0" />
                            <span className="truncate">{manifest.authors}</span>
                        </p>
                    )}
                </div>
                <FileTreeView tree={manifest.file_tree} onFileSelect={setSelectedFile} selectedFile={selectedFile} /> 
            </div> 
            <div className="w-2/3 overflow-y-auto p-6"> 
                <ContentViewer file={selectedFile} content={fileContent} isLoading={isLoading} packagePath={packagePath} /> 
            </div> 
        </> 
    ); 
};

// --- Main App Component ---
const App = () => {
  const [view, setView] = useState('library');
  const [library, setLibrary] = useState([]);
  const [activePackage, setActivePackage] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [datasetToDelete, setDatasetToDelete] = useState(null); // State for the confirmation modal

  const fetchLibrary = async () => {
    const lib = await window.electronAPI.getLibrary();
    setLibrary(lib);
  };

  useEffect(() => { fetchLibrary(); }, []);

  const handleViewPackage = async (pkg) => {
    const manifestData = await window.electronAPI.getManifest(pkg.path);
    if (manifestData) {
      setActivePackage(pkg);
      setManifest(manifestData);
      setView('viewer');
    } else {
      console.error("Could not read this package. It might be corrupted or invalid.");
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
      setDatasetToDelete(null); // Close the modal
  };

  return (
    <div className="bg-white text-gray-800 min-h-screen font-sans flex flex-col">
      <ConfirmDeleteModal 
        dataset={datasetToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDatasetToDelete(null)}
      />
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img src="/sparchive_logo.png" alt="spARCHIVE Logo" className="h-10 w-auto" />
            </div>
            <nav className="flex items-center space-x-2">
              <button onClick={() => setView('packager')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 border-2 ${view === 'packager' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`} style={{ borderColor: '#D1D5DB' }}>
                <Download className="inline-block w-4 h-4 mr-2" />Packager
              </button>
              <button onClick={handleReturnToLibrary} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 border-2 ${view !== 'packager' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`} style={{ borderColor: '#D1D5DB' }}>
                <Library className="inline-block w-4 h-4 mr-2" />Library
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-grow flex overflow-hidden bg-gray-50">
        {view === 'packager' && <PackagerView />}
        {view === 'library' && <LibraryView library={library} onViewPackage={handleViewPackage} onDeleteRequest={setDatasetToDelete} />}
        {view === 'viewer' && <FileViewer manifest={manifest} packagePath={activePackage.path} />}
      </main>
    </div>
  );
};

export default App;
