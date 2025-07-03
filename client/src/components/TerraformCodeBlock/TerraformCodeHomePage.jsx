import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MonacoEditor from '@monaco-editor/react';

const TerraformCodeHomePage = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('main.tf');

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
  };

  const fileTabs = selectedRecord
    ? Object.keys(selectedRecord.terraformFiles)
    : [];

  return (
    <div className="w-full p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Terraform Records</h2>

      <div className="w-full overflow-x-auto shadow-md sm:rounded-lg mb-6">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                  className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                >
                  {record.userInput}
                </th>
                <td className="px-6 py-4">{record.csp?.toUpperCase()}</td>
                <td className="px-6 py-4">{record.resource_type}</td>
                <td className="px-6 py-4">
                  {record?.['generation_time_ms']
                    ? `${Math.round(record?.['generation_time_ms']/1000)} ${' '}ms`
                    : '-'}
                </td>
                <td className="px-6 py-4">
                  {new Date(record.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4">
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
        <div className="pb-4">
          <h3 className="text-xl font-semibold mb-3">Code Preview for {selectedRecord?.resource_type}</h3>

          {/* File Tabs */}
          <div className="flex space-x-2 mb-2">
            {fileTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded ${
                  activeTab === tab
                    ? 'bg-[#2e2e38] text-white'
                    : 'bg-gray-200 text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Monaco Editor for selected file */}
          <MonacoEditor
            height="600px"
            language={activeTab.endsWith('.json') ? 'json' : 'hcl'}
            value={selectedRecord.terraformFiles[activeTab]}
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
