'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ConfirmContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token provided.');
      return;
    }

    api
      .confirm(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/login'), 2000);
      })
      .catch((e: unknown) => {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Confirmation failed');
      });
  }, [params, router]);

  return (
    <div className="bg-white rounded-xl shadow p-8 text-center space-y-4">
      {status === 'pending' && (
        <>
          <p className="text-2xl">⏳</p>
          <p className="text-gray-600">Confirming your email…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <p className="text-2xl">✅</p>
          <h2 className="text-xl font-semibold text-green-600">Email confirmed!</h2>
          <p className="text-sm text-gray-500">Redirecting to login…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-2xl">❌</p>
          <h2 className="text-xl font-semibold text-red-600">Confirmation failed</h2>
          <p className="text-sm text-gray-500">{message}</p>
          <Link href="/register" className="text-blue-600 hover:underline text-sm">
            Try registering again
          </Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-xl shadow p-8 text-center">Loading…</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
