import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth";
import { toast } from "../lib/toast";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!email.includes("@")) errors.email = "Enter a valid email";
    if (password.length < 6) errors.password = "Min 6 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email, password);
      toast.success("Account created! Check your email.");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6">Sign Up</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <input
          className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {fieldErrors.email && (
          <p className="text-red-500 text-xs mb-3">{fieldErrors.email}</p>
        )}
        <input
          className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Password (min 6 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password && (
          <p className="text-red-500 text-xs mb-3">{fieldErrors.password}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white rounded-lg py-2 font-medium disabled:opacity-50 mt-2"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Have an account?{" "}
          <Link to="/login" className="text-green-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
