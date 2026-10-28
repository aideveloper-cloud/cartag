"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-gray-900 px-4 py-2 text-white">
      พิมพ์
    </button>
  );
}
