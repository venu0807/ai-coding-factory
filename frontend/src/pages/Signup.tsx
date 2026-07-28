import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../lib/auth';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signUp(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">Sign Up</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <input className="w-full border rounded-lg px-3 py-2 mb-4" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg px-3 py-2 mb-4" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="w-full bg-green-600 text-white rounded-lg py-2 font-medium">Sign Up</button>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Have an account? <Link to="/login" className="text-green-600">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
