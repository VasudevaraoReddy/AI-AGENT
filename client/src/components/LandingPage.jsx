import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typewriter } from 'react-simple-typewriter';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#333333] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#ffe600]">
              <Typewriter
                words={[
                  // 'Your AI Cloud Assistant',
                  'Multi Agent',
                ]}
                loop={1}
                cursor
                cursorStyle=".."
                typeSpeed={80}
                deleteSpeed={50}
                delaySpeed={1500}
              />
            </h1>

            <p className="text-xl md:text-2xl text-[#cccccc] mb-8 max-w-3xl mx-auto">
              Your intelligent cloud computing assistant. Get expert guidance,
              smart recommendations, and seamless provisioning across multiple
              cloud platforms.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#ffe600] text-[#333333] px-8 py-3 rounded-lg font-semibold hover:bg-[#ffe600]/90 transition-colors duration-200"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#ffffff] text-[#333333] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-[#333333] p-6 rounded-lg text-white">
              <div className="w-12 h-12 bg-[#ffe600] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#333333]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Multi-Cloud Support
              </h3>
              <p className="text-[#cccccc]">
                Seamlessly manage and deploy across AWS, Azure, and GCP
                platforms.
              </p>
            </div>

            <div className="bg-[#333333] p-6 rounded-lg text-white">
              <div className="w-12 h-12 bg-[#ffe600] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#333333]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Intelligent Recommendations
              </h3>
              <p className="text-[#cccccc]">
                Get personalized service recommendations based on your needs.
              </p>
            </div>

            <div className="bg-[#333333] p-6 rounded-lg text-white">
              <div className="w-12 h-12 bg-[#ffe600] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#333333]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Provisioning</h3>
              <p className="text-[#cccccc]">
                Automated infrastructure deployment with best practices.
              </p>
            </div>

            <div className="bg-[#333333] p-6 rounded-lg text-white">
              <div className="w-12 h-12 bg-[#ffe600] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[#333333]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Natural Conversations
              </h3>
              <p className="text-[#cccccc]">
                Interact with your cloud infrastructure using natural language.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-[#333333] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffe600] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#333333]">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Ask Questions
              </h3>
              <p className="text-[#cccccc]">
                Describe your cloud needs in natural language
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffe600] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#333333]">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Get Recommendations
              </h3>
              <p className="text-[#cccccc]">
                Receive tailored cloud service suggestions
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffe600] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#333333]">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Deploy & Manage
              </h3>
              <p className="text-[#cccccc]">
                Automatically provision and manage your infrastructure
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#ffffff] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8 text-[#333333]">
            Ready to Transform Your Cloud Experience?
          </h2>
          <button
            onClick={() => navigate('/login')}
            className="bg-[#ffe600] text-[#333333] px-8 py-3 rounded-lg font-semibold hover:bg-[#ffe600]/90 transition-colors duration-200"
          >
            Click here to Start
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;