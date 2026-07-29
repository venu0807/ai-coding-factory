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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">Reset Password</h1>
        {sent ? (
          <>
            <p className="text-green-600 mb-4">
              Check your email for a reset link.
            </p>
            <Link to="/login" className="text-green-600 text-sm">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4"
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
            <p className="text-sm text-gray-500 mt-4 text-center">
              <Link to="/login" className="text-green-600">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
