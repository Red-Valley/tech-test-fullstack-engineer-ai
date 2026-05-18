"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "bg-gray-900 border border-gray-700 text-gray-100 shadow-xl",
          title: "text-gray-100 font-medium",
          description: "text-gray-400",
          actionButton: "bg-indigo-600 text-white hover:bg-indigo-500",
          cancelButton: "bg-gray-800 text-gray-300",
          error: "!bg-red-950 !border-red-800 !text-red-100",
          success: "!border-indigo-800",
        },
      }}
    />
  );
}
