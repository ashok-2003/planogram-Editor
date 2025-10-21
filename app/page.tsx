import Image from "next/image";
import PlanogramPage from "./planogram/page";

export default function Home() {
  return (
    <>
      {/* Mobile Warning - Hidden on Desktop */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"><var></var>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <svg 
              className="w-20 h-20 mx-auto text-blue-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Desktop Only
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            This Planogram Editor is optimized for desktop devices. 
            Please open this application on a PC or laptop for the best experience.
          </p>
          
        </div>
      </div>

      {/* Desktop App - Hidden on Mobile */}
      <div className="hidden md:block">
        <PlanogramPage />
      </div>
    </>
  );
}
