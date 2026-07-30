import { useState, useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth";
import { toast } from "../lib/toast";

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { score, label: "Medium", color: "bg-amber-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

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

  const strength = useMemo(() => passwordStrength(password), [password]);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border dark:border-gray-700 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Sign Up</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <input
          className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
          className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          placeholder="Password (min 6 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {password.length > 0 && (
          <div className="mb-2">
            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <p className={`text-xs mt-0.5 ${strength.label === "Weak" ? "text-red-500" : strength.label === "Medium" ? "text-amber-600" : "text-green-600"}`}>
              {strength.label}
            </p>
            <ul className="text-xs text-gray-400 dark:text-gray-500 mt-1 space-y-0.5">
              <li className={password.length >= 8 ? "text-green-500" : ""}>
                • At least 8 characters
              </li>
              <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-500" : ""}>
                • Upper + lowercase letters
              </li>
              <li className={/\d/.test(password) ? "text-green-500" : ""}>
                • At least one number
              </li>
            </ul>
          </div>
        )}
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Have an account?{" "}
          <Link to="/login" className="text-green-600 dark:text-green-400">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
