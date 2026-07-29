import { useEffect, useState } from "react";
import { subscribe, type Toast as ToastType } from "../lib/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    const unsub = subscribe(setToasts);
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-slide-in ${
            t.type === "success"
              ? "bg-green-600"
              : t.type === "error"
                ? "bg-red-600"
                : "bg-gray-700"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
