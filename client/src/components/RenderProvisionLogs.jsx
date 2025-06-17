import React, { useEffect, useState } from 'react';
import {
  getPipelineLogs,
  getPipelineStatus,
} from '../services/AzureDevopsService';
import { X } from 'lucide-react';

const RenderProvisionLogs = ({ toolResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pipelineData, setPipelineStatusRes] = useState({});
  const [errorLogs, setErrorLogs] = useState([]);

  const responseId = toolResult?.details?.response?.id;

  useEffect(() => {
    let intervalId;

    const fetchStatusAndMaybePoll = async () => {
      const response = await getPipelineStatus(
        responseId,
        toolResult?.details?.response?.templateParameters?.moduleToRun,
      );
      setPipelineStatusRes(response);

      if (response?.state !== 'completed') {
        intervalId = setInterval(async () => {
          const refreshed = await getPipelineStatus(
            responseId,
            toolResult?.details?.response?.templateParameters?.moduleToRun,
          );
          setPipelineStatusRes(refreshed);

          if (refreshed?.state === 'completed') {
            clearInterval(intervalId);
          }
        }, 1 * 60 * 1000); // every 2 minutes
      }
    };

    fetchStatusAndMaybePoll();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const fetchLogs = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await getPipelineLogs(responseId);
      const cleanedLogs = response?.filter(
        (e) => e.count !== 135 && e.count !== 131,
      );
      setLogs(cleanedLogs);

      const redLogs = [];
      cleanedLogs?.forEach((eachLog) => {
        eachLog?.value?.forEach((log) => {
          if (
            log.startsWith('Error') ||
            log.startsWith('Failed') ||
            log.includes('Error')
          ) {
            redLogs.push(cleanLogString(log));
          }
        });
      });
      setErrorLogs(redLogs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanLogString = (log) => {
    return log.replace(/\u001b\[.*?m/g, '');
  };

  const getLogColor = (log) => {
    if (
      log.startsWith('Begin') ||
      log.startsWith('End') ||
      log.includes('Finish') ||
      log.includes('Start')
    ) {
      return 'text-green-400';
    } else if (log.startsWith('Evaluating') || log.startsWith('Result')) {
      return 'text-yellow-300';
    } else if (
      log.startsWith('Error') ||
      log.startsWith('Failed') ||
      log.includes('Error')
    ) {
      return 'text-red-500';
    } else {
      return 'text-white';
    }
  };

  return (
    <div className="p-1">
      {pipelineData && (
        <div>
          <p className="font-semibold text-gray-800 mb-4">Run Details</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <strong>State:</strong> {pipelineData?.state}
            </div>
            <div>
              <strong>Result:</strong>{' '}
              <span
                className={
                  pipelineData?.result === 'failed'
                    ? 'text-red-600'
                    : 'text-green-600'
                }
              >
                {pipelineData?.result?.toLocaleUpperCase()}
              </span>
            </div>
            <div>
              <strong>Started At:</strong>{' '}
              {new Date(pipelineData?.createdDate).toUTCString()}
            </div>
            <div>
              <strong>Finished At:</strong>{' '}
              {pipelineData?.finishedDate &&
              !isNaN(new Date(pipelineData.finishedDate).getTime())
                ? new Date(pipelineData.finishedDate).toUTCString()
                : 'Not yet finished'}
            </div>
          </div>

          <button
            onClick={fetchLogs}
            className="border border-black cursor-pointer mt-2 text-blacl px-3 py-1 rounded"
          >
            View Logs
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white w-[60%] rounded-lg shadow-2xl p-4 max-h-[90vh] overflow-y-auto relative">
            <h2 className="text-xl font-semibold mb-3">Console Logs</h2>

            <div className="bg-[#292929] rounded p-3 text-sm font-mono h-72 overflow-y-auto whitespace-pre-wrap">
              {loading && <p className="text-gray-300">Loading logs...</p>}
              {error && <p className="text-red-500">{error}</p>}

              {!loading &&
                !error &&
                logs.length > 0 &&
                logs.map(
                  (eachLog, outerIdx) =>
                    eachLog.count > 0 &&
                    eachLog.value.map((log, index) => (
                      <div key={`${outerIdx}-${index}`} className="flex gap-2">
                        <span className={`text-xs ${getLogColor(log)}`}>
                          {index + 1}.
                        </span>
                        <span className={`${getLogColor(log)}`}>
                          {cleanLogString(log)}
                        </span>
                      </div>
                    )),
                )}

              {!loading && !error && logs.length === 0 && (
                <p className="text-gray-400">No logs available.</p>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
            >
              <X />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenderProvisionLogs;
