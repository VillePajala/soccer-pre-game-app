'use client';

import ModalProvider from '@/contexts/ModalProvider';
import HomePage from '@/components/HomePage';

export default function Home() {
  return (
    <ModalProvider>
      <HomePage />
    </ModalProvider>
  );
}
