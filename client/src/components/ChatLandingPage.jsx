// components/TypewriterEffect.jsx
import { Typewriter } from 'react-simple-typewriter';

const ChatLandingPage = () => {
  return (
    <span className="text-slate-300">
      <Typewriter
        words={[
          'Ask me to provision a virtual machine on AWS...',
          'Want database recommendations? Just ask...',
          'Deploy load balancers, containers, or clusters with ease...',
          'I’m your AI-powered cloud provisioning assistant.',
        ]}
        loop={0} // show once
        cursor
        cursorStyle="|"
        typeSpeed={45}
        deleteSpeed={30}
        delaySpeed={2000}
      />
    </span>
  );
};

export default ChatLandingPage;
