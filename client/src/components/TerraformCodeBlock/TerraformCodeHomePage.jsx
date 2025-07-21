import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import MonacoEditor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const TerraformCodeHomePage = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [flattenedFiles, setFlattenedFiles] = useState({});
  const [activeTab, setActiveTab] = useState({
    cwd: '',
    file: '',
  });
  const [modifiedContent, setModifiedContent] = useState({});
  const codePreviewRef = useRef(null);

  useEffect(() => {
    axios
      .get('http://localhost:3001/terraform-records')
      .then((res) => {
        if (Array.isArray(res.data.records)) {
          setRecords(res.data.records);
        }
      })
      .catch((err) => {
        console.error('Error fetching records:', err);
      });
  }, []);

  function flattenTerraformFiles(nestedFiles) {
    const result = {
      modules: {},
      root: {},
    };
    for (const folder in nestedFiles) {
      for (const file in nestedFiles[folder]) {
        if (folder === 'module') {
          result.modules[file] = nestedFiles[folder][file];
        } else {
          result.root[file] = nestedFiles[folder][file];
        }
      }
    }
    console.log(result);
    return result;
  }

  const handleViewCode = (record) => {
    const flat = flattenTerraformFiles(record.terraformFiles);
    setSelectedRecord(record);
    setFlattenedFiles(flat);
    setActiveTab({
      cwd: Object.keys(flat)[0],
      file: Object.keys(flat[Object.keys(flat)[0]])[0],
    });
    setModifiedContent({});

    if (codePreviewRef.current) {
      codePreviewRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const handleDownload = () => {
    if (selectedRecord && flattenedFiles) {
      const zip = new JSZip();
  
      // Add root files
      Object.entries(flattenedFiles.root).forEach(([fileName, content]) => {
        zip.file(fileName, content);
      });
  
      // Add module files under a 'modules/' directory
      Object.entries(flattenedFiles.modules).forEach(([fileName, content]) => {
        zip.file(`modules/${fileName}`, content);
      });
  
      zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, `${selectedRecord.resource_type}-terraform-files.zip`);
      });
    }
  };
  

  const handleEditorChange = (newValue, e) => {
    setModifiedContent((prev) => ({
      ...prev,
      [activeTab]: newValue,
    }));
  };

  const handleSave = () => {
    if (selectedRecord && modifiedContent[activeTab]) {
      const updatedFiles = {
        ...flattenedFiles,
        [activeTab]: modifiedContent[activeTab],
      };
      setFlattenedFiles(updatedFiles);
      setModifiedContent({});
      alert('File saved successfully!');
    }
  };

  const onClickFile = (tab, filename) => {
    setActiveTab({
      cwd: tab,
      file: filename,
    });
  };

  return (
    <div className="w-full p-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Terraform Records</h2>

      <div className="w-full overflow-x-auto shadow-md sm:rounded-lg mb-6 max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3">Input</th>
              <th scope="col" className="px-6 py-3">Cloud</th>
              <th scope="col" className="px-6 py-3">Resource</th>
              <th scope="col" className="px-6 py-3">Score</th>
              <th scope="col" className="px-6 py-3">Generation time</th>
              <th scope="col" className="px-6 py-3">Timestamp</th>
              <th scope="col" className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <th scope="row" className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">{record.userInput}</th>
                <td className="px-3 py-3">{record.csp?.toUpperCase()}</td>
                <td className="px-3 py-3">{record.resource_type}</td>
                <td className="px-3 py-3">{record.score}%</td>
                <td className="px-3 py-3">{record?.generation_time_ms ? `${Math.round(record.generation_time_ms / 1000)} ms` : '-'}</td>
                <td className="px-3 py-3">{new Date(record.timestamp).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <button onClick={() => handleViewCode(record)} className="cursor-pointer font-medium text-[#2e2e38] hover:underline">
                    View Code
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <div className="pb-4" ref={codePreviewRef}>
          <div className="flex space-x-6 mb-4">
            <div className="w-1/4 max-h-[500px] overflow-y-auto border-r pr-4">
              <h4 className="font-semibold mb-2">terraform-{selectedRecord?.csp?.toLowerCase()} - {selectedRecord.resource_type}</h4>
              <p className="text-sm text-gray-500 mb-2">modules</p>
              <ul className="ml-4 space-y-1">
                {Object.keys(flattenedFiles.modules).map((filePath) => (
                  <li key={filePath}>
                    <button
                      onClick={() => onClickFile('modules', filePath)}
                      className={`text-left w-full px-3 py-1 rounded ${
                        activeTab.cwd === 'modules' && activeTab.file === filePath ? 'bg-[#2e2e38] text-white' : 'hover:bg-gray-200'
                      }`}
                    >
                     {filePath}
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1">
                {Object.keys(flattenedFiles.root).map((filePath) => (
                  <li key={filePath}>
                    <button
                      onClick={() => onClickFile('root', filePath)}
                      className={`text-left w-full px-3 py-1 rounded ${
                        activeTab.cwd === 'root' && activeTab.file === filePath ? 'bg-[#2e2e38] text-white' : 'hover:bg-gray-200'
                      }`}
                    >
                      {filePath}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-3/4">
              <div className="justify-between mb-2 flex items-center space-x-4">
                <h5 className="font-semibold mb-3">
                  Code Preview: <span className="text-blue-500">{activeTab.cwd} - {activeTab.file}</span>
                </h5>
                <div>
                  <button
                    onClick={() => {}}
                    className="px-5 py-1 bg-[#ffe600] text-[#2e2e38] cursor-pointer rounded"
                  >
                    Approve
                  </button>

                  <button
                    onClick={handleDownload}
                    className="ml-2 px-5 py-1 bg-[#2e2e38] cursor-pointer text-white rounded"
                  >
                    Download
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={!modifiedContent[activeTab]}
                    className={`ml-2 px-5 py-1 ${
                      modifiedContent[activeTab] ? 'bg-[#4caf50]' : 'bg-gray-400'
                    } text-white cursor-pointer rounded`}
                  >
                    Save
                  </button>
                </div>
              </div>

              <MonacoEditor
                height="600px"
                language={activeTab.file.endsWith('.json') ? 'json' : 'hcl'}
                value={modifiedContent[activeTab.cwd]?.[activeTab.file] || flattenedFiles[activeTab.cwd]?.[activeTab.file]}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerraformCodeHomePage;
