// TerraformViewer.jsx
import React, { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
// Helper to download files as a zip
// import JSZip from 'jszip';
// import { saveAs } from 'file-saver';

const languageMap = {
  'main.tf': 'hcl',
  'variables.tf': 'hcl',
  'outputs.tf': 'hcl',
  'terraform.tfvars.json': 'json',
};

 const TerraformViewer = ({ files }) =>  {

    console.log(files)
  const [activeFile, setActiveFile] = useState('main.tf');

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        {Object.keys(files?.terraform_files).map((file) => (
          <button
            key={file}
            onClick={() => setActiveFile(file)}
            style={{
              backgroundColor: activeFile === file ? '#2c3e50' : '#34495e',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            {file}
          </button>
        ))}
      </div>

      <MonacoEditor
        height="500px"
        language={languageMap[activeFile] || 'plaintext'}
        value={files?.terraform_files[activeFile]}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
        }}
      />

      <button
        onClick={() => downloadZip(files)}
        style={{
          marginTop: '20px',
          backgroundColor: '#27ae60',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Save All as ZIP
      </button>
    </div>
  );
}

export default TerraformViewer;



function downloadZip(files) {
    console.log(files)
//   const zip = new JSZip();
//   Object.entries(files).forEach(([fileName, content]) => {
//     zip.file(fileName, content);
//   });
//   zip.generateAsync({ type: 'blob' }).then((blob) => {
//     saveAs(blob, 'terraform-code.zip');
//   });
}
