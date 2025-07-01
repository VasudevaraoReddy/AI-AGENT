// import { useChatContext } from '../context/ChatContext';
// import { useState, useRef, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
// import RenderProvisionLogs from './RenderProvisionLogs';

// const getAvatar = (type) => {
//   if (type === 'human') {
//     return {
//       src: 'https://dummyimage.com/128x128/363536/ffffff&text=U',
//       alt: 'User',
//     };
//   }
//   return {
//     src: 'https://dummyimage.com/128x128/354ea1/ffffff&text=CM',
//     alt: 'Assistant',
//   };
// };

// const Messages = () => {
//   const { chatHistory, loading, sendMessage, messageSentLoading } =
//     useChatContext();
//   const [useSuggestedValues, setUseSuggestedValues] = useState(false);
//   const [formState, setFormState] = useState({});
//   const [deployedServices, setDeployedServices] = useState(new Set()); // Track deployed services

//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [chatHistory]);

//   const handleInputChange = (fieldId, value) => {
//     setFormState((prev) => ({ ...prev, [fieldId]: value }));
//   };

//   const handleDeploy = async (service) => {
//     const serviceDeploymentId = service[0]?.serviceDeploymentId;
//     const payload = {
//       formData: formState?.[`form-${serviceDeploymentId}`],
//       service: service[0],
//       serviceDeploymentId,
//     };

//     delete payload.service.requiredFields;

//     console.log(payload);

//     // Mark this service as deployed
//     setDeployedServices(
//       (prev) => new Set([...prev, service[0].serviceDeploymentId]),
//     );

//     await sendMessage({
//       message: `Go ahead and deploy with provided values`,
//       payload: payload,
//     });
//   };

//   const renderForm = (service, messageIndex) => {
//     if (service.length === 1) {
//       const { requiredFields } = service[0];
//       const serviceId = service[0].serviceDeploymentId;

//       // Don't render form if this service has been deployed
//       if (deployedServices.has(serviceId)) {
//         return (
//           <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
//             <p>✅ Service deployed successfully!</p>
//           </div>
//         );
//       }

//       const initialValues = {};
//       requiredFields?.forEach((field) => {
//         initialValues[field.fieldId] = useSuggestedValues
//           ? field.exampleValue
//           : '';
//       });

//       // Use a unique key for this form's state
//       const formKey = `form-${serviceId}`;
//       if (!formState[formKey]) {
//         setFormState((prev) => ({
//           ...prev,
//           [formKey]: initialValues,
//         }));
//       }

//       const currentFormState = formState[formKey] || initialValues;

//       const handleSubmit = (e) => {
//         e.preventDefault();
//         handleDeploy(service);
//       };

//       const handleFormInputChange = (fieldId, value) => {
//         setFormState((prev) => ({
//           ...prev,
//           [formKey]: {
//             ...prev[formKey],
//             [fieldId]: value,
//           },
//         }));
//       };

//       return (
//         <form
//           onSubmit={handleSubmit}
//           className="mt-4 space-y-4 rounded-lg bg-slate-100 p-4 dark:bg-slate-700"
//         >
//           {requiredFields?.map((field) => (
//             <div key={field.fieldId}>
//               <label className="flex text-sm font-medium items-center gap-1">
//                 {field.fieldName}
//                 {field.explanation && (
//                   <div className="relative group cursor-pointer">
//                     <span className="text-xs font-bold rounded-full bg-gray-300 px-1 text-slate-800 dark:bg-slate-600 dark:text-slate-100">
//                       i
//                     </span>
//                     <div className="absolute left-4 top-6 z-10 hidden w-64 rounded bg-slate-700 p-2 text-xs text-white shadow-lg group-hover:block">
//                       {field.explanation}
//                     </div>
//                   </div>
//                 )}
//               </label>

//               {Array.isArray(field.exampleValue) ? (
//                 <textarea
//                   required
//                   className="w-full rounded border p-2 text-sm text-slate-900"
//                   rows={2}
//                   value={currentFormState[field.fieldId] || ''}
//                   onChange={(e) =>
//                     handleFormInputChange(
//                       field.fieldId,
//                       e.target.value.split(',').map((v) => v.trim()),
//                     )
//                   }
//                   placeholder={field.fieldName}
//                 />
//               ) : (
//                 <input
//                   required
//                   type="text"
//                   className="w-full rounded border p-2 text-sm text-slate-900"
//                   value={currentFormState[field.fieldId] || ''}
//                   onChange={(e) =>
//                     handleFormInputChange(field.fieldId, e.target.value)
//                   }
//                   placeholder={field.fieldName}
//                 />
//               )}
//             </div>
//           ))}

//           <label className="space-x-2">
//             <input
//               type="checkbox"
//               checked={useSuggestedValues}
//               onChange={(e) => {
//                 setUseSuggestedValues(e.target.checked);
//                 const newForm = {};
//                 requiredFields.forEach((field) => {
//                   newForm[field.fieldId] = e.target.checked
//                     ? field.exampleValue
//                     : '';
//                 });
//                 setFormState((prev) => ({
//                   ...prev,
//                   [formKey]: newForm,
//                 }));
//               }}
//             />
//             <span>Do you want to go with suggested values?</span>
//           </label>

//           <button
//             type="submit"
//             disabled={messageSentLoading}
//             className="cursor-pointer mt-2 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
//           >
//             {messageSentLoading ? 'Deploying...' : 'Deploy'}
//           </button>
//         </form>
//       );
//     } else {
//       return <p>So many we got</p>;
//     }
//   };

//   const renderProvisioningResponse = (msg, key) => {
//     const { response_metadata } = msg;
//     const { details, agent } = response_metadata;

//     const shouldRenderForm =
//       agent?.includes('provision_agent') && details?.serviceConfig?.length > 0;

//     const shouldRenderPipeline =
//       agent?.includes('provision_agent') && details?.isDeployed;

//     if (shouldRenderPipeline) {
//       setDeployedServices(
//         (prev) => new Set([...prev, details?.serviceDeploymentId]),
//       );
//     }

//     return (
//       <>
//         {shouldRenderForm && renderForm(details?.serviceConfig, key)}
//         {shouldRenderPipeline && (
//           <RenderProvisionLogs
//             key={key}
//             devopsResponse={details?.devOpsResponse}
//           />
//         )}
//       </>
//     );
//   };

//   const renderRecommendationsResponse = (msg) => {
//     return <></>;
//   };

//   return (
//     <div className="flex-1 space-y-6 overflow-y-auto rounded-xl bg-slate-200 p-4 text-sm leading-6 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-300 sm:text-base sm:leading-7">
//       {chatHistory?.messages?.map((msg, index) => {
//         const avatar = getAvatar(msg.role);

//         if (msg.type === 'ai') {
//           return (
//             <div key={index} className="flex flex-col items-start">
//               <div className="flex items-start">
//                 <img
//                   className="mr-2 h-8 w-8 rounded-full"
//                   src={avatar.src}
//                   alt={avatar.alt}
//                 />
//                 <div className="flex rounded-b-xl rounded-tr-xl bg-slate-50 p-4 dark:bg-slate-800 sm:max-w-md md:max-w-2xl">
//                   <div>
//                     <ReactMarkdown>{msg.content}</ReactMarkdown>

//                     {msg?.response_metadata?.agent === 'provision_agent' &&
//                       renderProvisioningResponse(msg, index)}
//                     {msg.response_metadata?.agent === 'recommendations_agent' &&
//                       renderRecommendationsResponse(msg)}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           );
//         } else {
//           return (
//             <div key={index} className="flex flex-row-reverse items-start">
//               <img
//                 className="ml-2 h-8 w-8 rounded-full"
//                 src={avatar.src}
//                 alt={avatar.alt}
//               />
//               <div className="flex min-h-[85px] rounded-b-xl rounded-tl-xl bg-slate-50 p-4 dark:bg-slate-800 sm:min-h-0 sm:max-w-md md:max-w-2xl">
//                 <p>{msg.content}</p>
//               </div>
//             </div>
//           );
//         }
//       })}
//       {messageSentLoading && (
//         <div className="flex flex-col items-start">
//           <div className="flex items-start">
//             <img
//               className="mr-2 h-8 w-8 rounded-full"
//               src="https://dummyimage.com/128x128/354ea1/ffffff&text=CM"
//               alt="Assistant"
//             />
//             <div className="flex items-center rounded-b-xl rounded-tr-xl bg-slate-50 px-4 py-2 dark:bg-slate-800 sm:max-w-md md:max-w-2xl">
//               <div className="flex items-center gap-2">
//                 <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
//                 <span className="text-slate-600 dark:text-slate-300 text-sm">
//                   Thinking...
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//       <div ref={messagesEndRef} />
//     </div>
//   );
// };

// export default Messages;

import { useChatContext } from '../context/ChatContext';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import RenderProvisionLogs from './RenderProvisionLogs';
import { Typewriter } from 'react-simple-typewriter';
import TerraformViewer from './TerraformCodeBlock/TerraformViewer';
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
  const { chatHistory, loading, sendMessage, messageSentLoading } =
    useChatContext();
  const [useSuggestedValues, setUseSuggestedValues] = useState(false);
  const [formState, setFormState] = useState({});
  const [deployedServices, setDeployedServices] = useState(new Set());

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Effect to track deployed services when chat history changes
  useEffect(() => {
    const newDeployedServices = new Set();

    chatHistory?.messages?.forEach((msg) => {
      const { response_metadata } = msg;
      const { details, agent } = response_metadata || {};

      const shouldMarkAsDeployed =
        agent?.includes('provision_agent') && details?.isDeployed;

      if (shouldMarkAsDeployed && details?.serviceDeploymentId) {
        newDeployedServices.add(details.serviceDeploymentId);
      }
    });

    // Only update if there are actual changes
    setDeployedServices((prevServices) => {
      const prevArray = Array.from(prevServices);
      const newArray = Array.from(newDeployedServices);

      if (
        prevArray.length !== newArray.length ||
        !prevArray.every((id) => newDeployedServices.has(id))
      ) {
        return newDeployedServices;
      }
      return prevServices;
    });
  }, [chatHistory]);

  const handleDeploy = async (service) => {
    const serviceDeploymentId = service[0]?.serviceDeploymentId;
    const payload = {
      formData: formState?.[`form-${serviceDeploymentId}`],
      service: service[0],
      serviceDeploymentId,
    };

    delete payload.service.requiredFields;

    // Mark this service as deployed
    setDeployedServices(
      (prev) => new Set([...prev, service[0].serviceDeploymentId]),
    );

    await sendMessage({
      message: `Go ahead and deploy with provided values`,
      payload: payload,
    });
  };

  const renderForm = (service, messageIndex) => {
    if (service.length === 1) {
      const { requiredFields } = service[0];
      const serviceId = service[0].serviceDeploymentId;

      // Don't render form if this service has been deployed
      if (deployedServices.has(serviceId)) {
        return (
          <div className="mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <p>✅ Form completed</p>
          </div>
        );
      }

      const initialValues = {};
      requiredFields?.forEach((field) => {
        initialValues[field.fieldId] = useSuggestedValues
          ? field.exampleValue
          : '';
      });

      // Use a unique key for this form's state
      const formKey = `form-${serviceId}`;
      if (!formState[formKey]) {
        setFormState((prev) => ({
          ...prev,
          [formKey]: initialValues,
        }));
      }

      const currentFormState = formState[formKey] || initialValues;

      const handleSubmit = (e) => {
        e.preventDefault();
        handleDeploy(service);
      };

      const handleFormInputChange = (fieldId, value) => {
        setFormState((prev) => ({
          ...prev,
          [formKey]: {
            ...prev[formKey],
            [fieldId]: value,
          },
        }));
      };

      return (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-lg bg-slate-100 p-4 dark:bg-slate-700"
        >
          {requiredFields?.map((field) => (
            <div key={field.fieldId}>
              <label className="flex text-sm font-medium items-center gap-1">
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
                  required
                  className="w-full rounded border p-2 text-sm text-slate-900"
                  rows={2}
                  value={currentFormState[field.fieldId] || ''}
                  onChange={(e) =>
                    handleFormInputChange(
                      field.fieldId,
                      e.target.value.split(',').map((v) => v.trim()),
                    )
                  }
                  placeholder={field.fieldName}
                />
              ) : (
                <input
                  required
                  type="text"
                  className="w-full rounded border p-2 text-sm text-slate-900"
                  value={currentFormState[field.fieldId] || ''}
                  onChange={(e) =>
                    handleFormInputChange(field.fieldId, e.target.value)
                  }
                  placeholder={field.fieldName}
                />
              )}
            </div>
          ))}

          {!messageSentLoading && (
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
                  setFormState((prev) => ({
                    ...prev,
                    [formKey]: newForm,
                  }));
                }}
              />
              <span>Do you want to go with suggested values?</span>
            </label>
          )}

          <button
            type="submit"
            disabled={messageSentLoading}
            className="cursor-pointer mt-2 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {messageSentLoading ? 'Deploying...' : 'Deploy'}
          </button>
        </form>
      );
    } else {
      return <p>So many we got</p>;
    }
  };

  const renderProvisioningResponse = (msg, key) => {
    const { response_metadata } = msg;
    const { details, agent } = response_metadata || {};

    const shouldRenderForm =
      agent?.includes('provision_agent') && details?.serviceConfig?.length > 0;

    const shouldRenderPipeline =
      agent?.includes('provision_agent') && details?.devOpsResponse;

    // Removed the state update from here - it's now handled in useEffect

    return (
      <>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
        {shouldRenderForm && renderForm(details?.serviceConfig, key)}
        {shouldRenderPipeline && (
          <RenderProvisionLogs
            key={key}
            devopsResponse={details?.devOpsResponse}
          />
        )}
      </>
    );
  };

  const renderRecommendationsResponse = (msg) => {
    return (
      <>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </>
    );
  };

  const renderTerraformResponse = (msg) => {
    return <TerraformViewer files={msg?.response_metadata?.details} />;
  };

  const renderGeneralResponse = (msg) => {
    return <ReactMarkdown>{msg.content}</ReactMarkdown>;
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto rounded-xl bg-slate-200 p-4 text-sm leading-6 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-300 sm:text-base sm:leading-7">
      {chatHistory?.messages?.map((msg, index) => {
        const avatar = getAvatar(msg.type);

        if (msg.type === 'ai') {
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
                    {msg.response_metadata?.agent === 'general_agent' && renderGeneralResponse(msg)}
                    {msg.response_metadata?.agent ===
                      'terraform_generator_agent' &&
                      renderTerraformResponse(msg)}
                    {msg?.response_metadata?.agent === 'provision_agent' &&
                      renderProvisioningResponse(msg, index)}
                    {msg.response_metadata?.agent === 'recommendations_agent' &&
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
              <div className="flex min-h-[85px] rounded-b-xl rounded-tl-xl bg-slate-50 p-4 sm:min-h-0 sm:max-w-md md:max-w-2xl overflow-x-auto">
                {msg.content?.startsWith('These are the errors') ? (
                  <p className="inline-block bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
                    Analyze the Errors
                  </p>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          );
        }
      })}
      {messageSentLoading && (
        <div className="flex flex-col items-start">
          <div className="flex items-start">
            <img
              className="mr-2 h-8 w-8 rounded-full"
              src="https://dummyimage.com/128x128/354ea1/ffffff&text=CM"
              alt="Assistant"
            />
            <div className="flex items-center rounded-b-xl rounded-tr-xl bg-slate-50 px-4 py-2 dark:bg-slate-800 sm:max-w-md md:max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                <span className="text-slate-600 dark:text-slate-300 text-sm">
                  <Typewriter
                    words={[
                      'Thinking',
                      'Analyzing your request',
                      'Almost there',
                    ]}
                    loop={true}
                    cursor
                    cursorStyle="..."
                    typeSpeed={70}
                    deleteSpeed={50}
                    delaySpeed={3000}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Messages;
