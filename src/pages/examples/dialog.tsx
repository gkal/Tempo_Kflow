import React from 'react';
import { DialogExample } from '@/components/examples/DialogExample';
import { GlobalDialogProvider } from '@/components/ui/GlobalDialogProvider';

/**
 * Dialog Examples Page
 */
export default function DialogExamplePage() {
  return (
    <GlobalDialogProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Dialog Examples</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="border-4 border-dashed border-gray-200 rounded-lg">
                <DialogExample />
              </div>
            </div>
          </div>
        </main>
        <footer className="bg-white shadow-inner mt-8">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
            Example implementation of the useDialogHelpers hook
          </div>
        </footer>
      </div>
    </GlobalDialogProvider>
  );
} 