'use client';
import TestPage from '../components/test';
import { WalletConnectionProvider } from '../context/WalletConnectionProvider';

export default function TestPageWrapper() {
  return (
    <WalletConnectionProvider>
      <TestPage />
    </WalletConnectionProvider>
  );
}