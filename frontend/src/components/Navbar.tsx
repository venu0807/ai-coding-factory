import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-green-600">
          AI Coding Factory
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {loading ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : user ? (
            <>
              <span className="text-sm text-gray-600 truncate max-w-32 sm:max-w-48">{user.email}</span>
              <button
                onClick={signOut}
                className="text-sm text-red-500 hover:text-red-700 shrink-0"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-800 shrink-0"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 shrink-0"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
