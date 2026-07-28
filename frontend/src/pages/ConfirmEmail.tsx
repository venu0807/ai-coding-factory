import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    if (token && type === 'signup') {
      getSupabase().then((s) =>
        s.auth.verifyOtp({ token_hash: token, type: 'signup' })
          .then(({ error }) => setStatus(error ? 'error' : 'success'))
          .catch(() => setStatus('error'))
      );
    } else {
      setStatus('success');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm text-center">
        {status === 'confirming' && <p className="text-gray-500">Confirming email...</p>}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Email confirmed!</h1>
            <Link to="/login" className="text-green-600">Sign in</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Confirmation failed</h1>
            <p className="text-gray-500">Try signing up again.</p>
          </>
        )}
      </div>
    </div>
  );
}
