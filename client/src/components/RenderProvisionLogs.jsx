import React, { useEffect, useState } from 'react';
import {
  getPipelineLogs,
  getPipelineStatus,
} from '../services/AzureDevopsService';
import { X, AlertTriangle, Loader2, CircleCheckBig } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';

const RenderProvisionLogs = ({ devopsResponse }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pipelineData, setPipelineStatusRes] = useState({});
  const [errorLogs, setErrorLogs] = useState([]);
  const { sendMessage } = useChatContext();

  const responseId = devopsResponse?.id;

  useEffect(() => {
    let intervalId;

    const fetchStatusAndMaybePoll = async () => {
      const response = await getPipelineStatus(
        responseId,
        devopsResponse?.templateParameters?.moduleToRun,
      );
      setPipelineStatusRes(response);

      if (response?.state !== 'completed') {
        intervalId = setInterval(async () => {
          const refreshed = await getPipelineStatus(
            responseId,
            devopsResponse?.templateParameters?.moduleToRun,
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
  }, [devopsResponse]);

  const fetchLogs_ = async () => {
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
      setErrorLogs(redLogs); // still update state for logs modal
      return redLogs; // 🆕
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    await fetchLogs_();
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

  const handleAnalyzeErrors = async () => {
    const latestErrors = await fetchLogs_();
    if (latestErrors.length > 0) {
      const errors = latestErrors.join('\n');
      await sendMessage(
        `These are the errors:\n${errors}\nCan you help me understand?`,
      );
    }
  };

  const getDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;

    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) return `${seconds} sec`;
    return `${minutes} min ${seconds} sec`;
  };

  return (
    <div className="p-1">
      {pipelineData && (
        <div>
          <p className="font-semibold text-gray-800 mb-1">Run Details</p>

          <div
            className={`bg-white border-l-4 shadow-md rounded-md p-5 mb-6 relative ${
              pipelineData?.result === 'failed'
                ? 'border-red-500'
                : 'border-green-500'
            }`}
          >
            <div className="flex items-start gap-3">
              {pipelineData?.state === 'completed' ? (
                <>
                  {pipelineData?.result === 'failed' ? (
                    <AlertTriangle className={`mt-0.5 text-red-500`} />
                  ) : (
                    <CircleCheckBig className={`mt-0.5 text-green-500`} />
                  )}

                  <div className="flex-1">
                    <h4
                      className={`text-md font-semibold mb-1 ${
                        pipelineData?.result === 'failed'
                          ? 'text-red-600'
                          : 'text-["#22bb33"]'
                      }`}
                    >
                      Deployment {pipelineData?.result?.toUpperCase()}
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {pipelineData?.result === 'failed'
                        ? 'Something went wrong while provisioning your infrastructure.'
                        : 'Infrastructure was provisioned successfully.'}
                    </p>

                    {pipelineData?.createdDate &&
                      pipelineData?.finishedDate &&
                      !isNaN(new Date(pipelineData.finishedDate).getTime()) && (
                        <p className="text-sm text-gray-500 mb-2">
                          Duration:{' '}
                          {getDuration(
                            pipelineData.createdDate,
                            pipelineData.finishedDate,
                          )}
                        </p>
                      )}

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={fetchLogs}
                        className="px-4 py-2 cursor-pointer text-sm font-medium border border-gray-600 text-gray-800 hover:bg-gray-100 rounded-md transition"
                      >
                        View Logs
                      </button>

                      {pipelineData?.result === 'failed' && (
                        <button
                          onClick={handleAnalyzeErrors}
                          className="bg-black ml-2 cursor-pointer text-white text-sm px-3 py-1.5 rounded hover:bg-gray-900 transition"
                        >
                          Analyze Errors
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-blue-500" />
                  <p className="text-gray-600 font-medium">
                    Checking provisioning status...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Dimmed, blurred, non-clickable background */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm pointer-events-none"></div>

          {/* Modal content */}
          <div className="bg-white w-[60%] rounded-lg shadow-2xl p-4 max-h-[90vh] overflow-y-auto relative">
            <h2 className="text-xl font-semibold mb-3">Console Logs</h2>

            <div className="bg-[#292929] rounded p-3 text-sm font-mono h-72 overflow-y-auto whitespace-pre-wrap">
              {loading && <p className="text-gray-300">Loading logs...</p>}
              {error && <p className="text-red-500">{error}</p>}

              {!loading && !error && logs.length > 0
                ? logs.map((eachLog, outerIdx) =>
                    eachLog.count > 0
                      ? eachLog.value.map((log, index) => (
                          <div
                            key={`${outerIdx}-${index}`}
                            className="flex gap-2"
                          >
                            <span className={`text-xs ${getLogColor(log)}`}>
                              {index + 1}.
                            </span>
                            <span className={`${getLogColor(log)}`}>
                              {cleanLogString(log)}
                            </span>
                          </div>
                        ))
                      : null,
                  )
                : ''}

              {!loading && !error && logs.length === 0 && (
                <p className="text-gray-400">No logs available.</p>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer absolute top-2 right-2 text-gray-400 hover:text-black text-xl"
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
