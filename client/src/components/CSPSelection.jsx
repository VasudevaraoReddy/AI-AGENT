import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../context/ChatContext';

const CSPSelection = () => {
  const navigate = useNavigate();
  const {
    setCurrentCSP,
    setChatHistory,
    setConversations,
    conversations,
    setActiveAndUserSelectedAgent,
  } = useChatContext();
  const [selectedCSP, setSelectedCSP] = useState('');
  const [loading, setLoading] = useState(false);

  const cspOptions = [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
      description:
        'Amazon Web Services (AWS) is a comprehensive cloud computing platform',
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg',
      description:
        'Microsoft Azure is a cloud computing service created by Microsoft',
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
      description:
        'Google Cloud Platform is a suite of cloud computing services',
    },
  ];

  const handleCSPSelection = async (cspId) => {
    setLoading(true);
    try {
      setSelectedCSP(cspId);
      setCurrentCSP(cspId);
      setChatHistory({});
      setActiveAndUserSelectedAgent({
        userSelectedAgent: '',
        activeAgent: '',
      });

      // Update user's CSP preference in localStorage
      const user = JSON.parse(localStorage.getItem('AIUSER'));
      localStorage.setItem('AIUSER', JSON.stringify({ ...user, csp: cspId }));
      setConversations([
        ...conversations,
        { chatTitle: 'New Chat', csp: cspId, date: new Date().toDateString() },
      ]);

      // Navigate to home after a short delay to show the selection
      setTimeout(() => {
        navigate('/home');
      }, 500);
    } catch (error) {
      console.error('Error selecting CSP:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#333333] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#ffffff] sm:text-4xl">
            Select Your Cloud Provider
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-[#cccccc] sm:mt-4">
            Choose your preferred cloud service provider to get started
          </p>
        </div>

        <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-3">
          {cspOptions.map((csp) => (
            <div
              key={csp.id}
              onClick={() => handleCSPSelection(csp.id)}
              className={`relative rounded-lg border ${
                selectedCSP === csp.id
                  ? 'border-[#ffe600] ring-2 ring-[#ffe600] bg-[#fffde6]'
                  : 'border-[#cccccc] bg-[#ffffff]'
              } px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-[#ffe600] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#ffe600] cursor-pointer transition-all duration-200`}
            >
              <div className="flex-shrink-0">
                <img
                  className="h-12 w-12 object-contain"
                  src={csp.icon}
                  alt={csp.name}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="focus:outline-none">
                  <p className="text-sm font-medium text-[#333333]">
                    {csp.name}
                  </p>
                  <p className="text-sm text-[#999999]">{csp.description}</p>
                </div>
              </div>
              {selectedCSP === csp.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-[#ffe600] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#333333] rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {loading && (
          <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#ffe600] border-t-transparent"></div>
            <p className="mt-2 text-sm text-[#cccccc]">
              Setting up your environment...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSPSelection;
