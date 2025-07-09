import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import MonacoEditor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const TerraformCodeHomePage = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('main.tf');
  const [modifiedContent, setModifiedContent] = useState({});
  const codePreviewRef = useRef(null); // Create a ref for the code preview section

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

  const handleViewCode = (record) => {
    setSelectedRecord(record);
    setActiveTab('main.tf');
    setModifiedContent({}); // Reset modified content when a new record is selected

    // Scroll to the code preview section
    if (codePreviewRef.current) {
      codePreviewRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const fileTabs = selectedRecord
    ? Object.keys(selectedRecord.terraformFiles)
    : [];

  const handleDownload = () => {
    if (selectedRecord && selectedRecord.terraformFiles) {
      const zip = new JSZip();

      fileTabs.forEach((tab) => {
        zip.file(tab, selectedRecord.terraformFiles[tab]);
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
      setSelectedRecord((prev) => {
        const updatedFiles = {
          ...prev.terraformFiles,
          [activeTab]: modifiedContent[activeTab],
        };
        return { ...prev, terraformFiles: updatedFiles };
      });
      setModifiedContent({});
      alert('File saved successfully!');
    }
  };

  return (
    <div className="w-full p-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Terraform Records</h2>

      <div className="w-full overflow-x-auto shadow-md sm:rounded-lg mb-6 max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3">
                Input
              </th>
              <th scope="col" className="px-6 py-3">
                Cloud
              </th>
              <th scope="col" className="px-6 py-3">
                Resource
              </th>
              <th scope="col" className="px-6 py-3">
                Score
              </th>
              <th scope="col" className="px-6 py-3">
                Generation time
              </th>
              <th scope="col" className="px-6 py-3">
                Timestamp
              </th>
              <th scope="col" className="px-6 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr
                key={index}
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
              >
                <th
                  scope="row"
                  className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                >
                  {record.userInput}
                </th>
                <td className="px-3 py-3">{record.csp?.toUpperCase()}</td>
                <td className="px-3 py-3">{record.resource_type}</td>
                <td className="px-3 py-3">{record.score}%</td>
                <td className="px-3 py-3">
                  {record?.['generation_time_ms']
                    ? `${Math.round(record?.['generation_time_ms'] / 1000)} ms`
                    : '-'}
                </td>
                <td className="px-3 py-3">
                  {new Date(record.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => handleViewCode(record)}
                    className="cursor-pointer font-medium text-[#2e2e38] hover:underline"
                  >
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
          <div className="justify-between mb-2 flex items-center space-x-4">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="cursor-pointer px-4 py-2 rounded bg-gray-200 text-black"
            >
              {fileTabs.map((tab) => (
                <option
                  key={tab}
                  value={tab}
                  className={`${
                    activeTab === tab
                      ? 'bg-[#2e2e38] text-white'
                      : 'bg-gray-200 text-black hover:bg-amber-50'
                  }`}
                >
                  {tab}
                </option>
              ))}
            </select>

            <h5 className="font-semibold mb-3">
              Code Preview for {selectedRecord?.resource_type}
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
            language={activeTab.endsWith('.json') ? 'json' : 'hcl'}
            value={
              modifiedContent[activeTab] ||
              selectedRecord.terraformFiles[activeTab]
            }
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              readOnly: false,
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TerraformCodeHomePage;
