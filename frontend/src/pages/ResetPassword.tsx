import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../lib/auth";
import { toast } from "../lib/toast";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success("Reset link sent");
    } catch (err: any) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border dark:border-gray-700 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Reset Password</h1>
        {sent ? (
          <>
            <p className="text-green-600 dark:text-green-400 mb-4">
              Check your email for a reset link.
            </p>
            <Link to="/login" className="text-green-600 dark:text-green-400 text-sm">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
              <Link to="/login" className="text-green-600 dark:text-green-400">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
