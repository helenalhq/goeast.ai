// components/FeedbackClient.tsx
'use client';

import { useState, useEffect } from 'react';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenFeedback = () => setIsModalOpen(true);
    window.addEventListener('openFeedback', handleOpenFeedback);
    return () => window.removeEventListener('openFeedback', handleOpenFeedback);
  }, []);

  return (
    <>
      <FeedbackButton onClick={() => setIsModalOpen(true)} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
