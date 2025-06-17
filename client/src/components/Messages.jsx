import { useChatContext } from '../context/ChatContext';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import RenderProvisionLogs from './RenderProvisionLogs';

const getAvatar = (type) => {
  if (type === 'human') {
    return {
      src: 'https://dummyimage.com/128x128/363536/ffffff&text=U',
      alt: 'User',
    };
  }
  return {
    src: 'https://dummyimage.com/128x128/354ea1/ffffff&text=CM',
    alt: 'Assistant',
  };
};

const Messages = () => {
  const { chatHistory, loading, sendMessage } = useChatContext();
  const [useSuggestedValues, setUseSuggestedValues] = useState(false);
  const [formState, setFormState] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleInputChange = (fieldId, value) => {
    setFormState((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleDeploy = async (service) => {
    const payload = {
      formData: formState,
      service: service,
    };

    delete payload.service.requiredFields;

    console.log(payload);

    await sendMessage({
      message: `Go ahead and deploy the ${service.title} with below values`,
      payload: payload,
    });

  };

  const renderForm = (service) => {
    const { requiredFields } = service;
    const initialValues = {};

    requiredFields.forEach((field) => {
      initialValues[field.fieldId] = useSuggestedValues
        ? field.exampleValue
        : '';
    });

    // Set initial values only if empty
    if (Object.keys(formState).length === 0) setFormState(initialValues);

    return (
      <div className="mt-4 space-y-4 rounded-lg bg-slate-100 p-4 dark:bg-slate-700">
        {requiredFields.map((field) => (
          <div key={field.fieldId}>
            <label className="block text-sm font-medium flex items-center gap-1">
              {field.fieldName}
              {field.explanation && (
                <div className="relative group cursor-pointer">
                  <span className="text-xs font-bold rounded-full bg-gray-300 px-1 text-slate-800 dark:bg-slate-600 dark:text-slate-100">
                    i
                  </span>
                  <div className="absolute left-4 top-6 z-10 hidden w-64 rounded bg-slate-700 p-2 text-xs text-white shadow-lg group-hover:block">
                    {field.explanation}
                  </div>
                </div>
              )}
            </label>

            {Array.isArray(field.exampleValue) ? (
              <textarea
                className="w-full rounded border p-2 text-sm text-slate-900"
                rows={2}
                value={formState[field.fieldId] || ''}
                onChange={(e) =>
                  handleInputChange(
                    field.fieldId,
                    e.target.value.split(',').map((v) => v.trim()),
                  )
                }
                placeholder={field.fieldName}
              />
            ) : (
              <input
                type="text"
                className="w-full rounded border p-2 text-sm text-slate-900"
                value={formState[field.fieldId] || ''}
                onChange={(e) =>
                  handleInputChange(field.fieldId, e.target.value)
                }
                placeholder={field.fieldName}
              />
            )}
          </div>
        ))}

        <label className="space-x-2">
          <input
            type="checkbox"
            checked={useSuggestedValues}
            onChange={(e) => {
              setUseSuggestedValues(e.target.checked);
              const newForm = {};
              requiredFields.forEach((field) => {
                newForm[field.fieldId] = e.target.checked
                  ? field.exampleValue
                  : '';
              });
              setFormState(newForm);
            }}
          />
          <span>Do you want to go with suggested values?</span>
          <br />
        </label>

        <button
          onClick={() => handleDeploy(service)}
          className="cursor-pointer mt-2 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Deploy
        </button>
      </div>
    );
  };

  const renderProvisioningResponse = (msg, key) => {
    const { delegated_to, tool_result } = msg.content;
    const service = tool_result?.service;
    const shouldRenderPipeline =
      tool_result?.details?.response?.status === 200 &&
      tool_result?.details?.response?.message === 'Pipeline Triggered';

    const shouldRenderForm =
      delegated_to?.includes('provision_agent') &&
      service?.requiredFields?.length > 0;

    return (
      <>
        {shouldRenderForm && renderForm(service)}
        {shouldRenderPipeline && <RenderProvisionLogs key={key} toolResult={tool_result} />}
      </>
    );
  };

  const renderRecommendationsResponse = (msg) => {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{msg.content.supervisorResponse}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto rounded-xl bg-slate-200 p-4 text-sm leading-6 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-300 sm:text-base sm:leading-7">
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : (
        chatHistory?.messages?.map((msg, index) => {
          const avatar = getAvatar(msg.role);

          if (msg.role === 'assistant') {
            return (
              <div key={index} className="flex flex-col items-start">
                <div className="flex items-start">
                  <img
                    className="mr-2 h-8 w-8 rounded-full"
                    src={avatar.src}
                    alt={avatar.alt}
                  />
                  <div className="flex rounded-b-xl rounded-tr-xl bg-slate-50 p-4 dark:bg-slate-800 sm:max-w-md md:max-w-2xl">
                    <div>
                      <p>{msg.content.response}</p>

                      {msg.content.delegated_to === 'provision_agent_tool' &&
                        renderProvisioningResponse(msg, `${index}-provisioning-response`)}
                      {msg.content.delegated_to ===
                        'recommendations_agent_tool' &&
                        renderRecommendationsResponse(msg)}
                    </div>
                  </div>
                </div>
              </div>
            );
          } else {
            return (
              <div key={index} className="flex flex-row-reverse items-start">
                <img
                  className="ml-2 h-8 w-8 rounded-full"
                  src={avatar.src}
                  alt={avatar.alt}
                />
                <div className="flex min-h-[85px] rounded-b-xl rounded-tl-xl bg-slate-50 p-4 dark:bg-slate-800 sm:min-h-0 sm:max-w-md md:max-w-2xl">
                  <p>{msg.content}</p>
                </div>
              </div>
            );
          }
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Messages;
