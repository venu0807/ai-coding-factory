import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../lib/auth";
import { toast } from "../lib/toast";

export default function Login() {
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
      await signIn(email, password);
      toast.success("Signed in");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
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
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
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
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password && (
          <p className="text-red-500 text-xs mb-3">{fieldErrors.password}</p>
        )}
        <div className="text-right -mt-2 mb-2">
          <Link to="/reset-password" className="text-xs text-green-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white rounded-lg py-2 font-medium disabled:opacity-50 mt-2"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p className="text-sm text-gray-500 mt-4 text-center">
          No account?{" "}
          <Link to="/signup" className="text-green-600">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
