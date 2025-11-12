"use client"
import React from 'react';
import { ArrowRight, Layout, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <>
      {/* Mobile Warning - Hidden on Desktop */}
      <div className="md:hidden min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-3">
            Desktop Required
          </h1>

          <p className="text-gray-600 text-sm leading-relaxed">
            This application is optimized for desktop use. Please access from a PC or laptop.
          </p>
        </div>
      </div>

      {/* Desktop App - Hidden on Mobile */}
      <div className="hidden md:block min-h-screen bg-gray-100">
        {/* Header Section - 30% of screen */}
        <div className="h-[30vh] flex items-center justify-center border-b border-gray-300">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-orange-500 mb-2">
              Welcome to ShelfMuse
            </h1>
            <p className="text-gray-600 text-md">
              Choose your preferred method to get started
            </p>
          </div>
        </div>

        {/* Grid Section - 70% of screen */}
        <div className="h-[70vh] grid grid-cols-2">
          {/* Left Side - Create from Scratch */}
          <button
            onClick={() => router.push('/planogram')}
            className="group col-span-1 bg-white border-r border-gray-200 flex items-center justify-center p-12  transition-colors duration-200"
          >
            <div className="max-w-md w-full hover:bg-gray-50 border border-dashed p-4 border-black rounded-sm">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-lg mb-6">
                  <Layout className="w-7 h-7 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-semibold text-gray-900 mb-4 text-left">
                Create from Scratch
              </h2>

              <p className="text-gray-600 text-left mb-8 leading-relaxed">
                Build your planogram from the ground up with complete control over every element and layout detail.
              </p>

              <div className="flex items-center text-gray-900 font-medium group-hover:gap-3 gap-2 transition-all">
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Right Side - Upload & Convert */}
          <button
            onClick={() => router.push('/upload')}
            className="group col-span-1 bg-gray-900 flex items-center justify-center p-12  transition-colors duration-200"
          >
            <div className="max-w-md w-full hover:bg-gray-800 border border-dashed p-4 rounded-sm">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-lg mb-6">
                  <Upload className="w-7 h-7 text-gray-900" />
                </div>
              </div>

              <h2 className="text-3xl font-semibold text-white mb-4 text-left">
                Convert Image to PCG
              </h2>

              <p className="text-gray-300 text-left mb-8 leading-relaxed">
                Upload existing planogram images and transform them into editable digital formats instantly.
              </p>

              <div className="flex items-center text-white font-medium group-hover:gap-3 gap-2 transition-all">
                <span>Upload Image</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}