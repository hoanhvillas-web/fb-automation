/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Popup from "./popup";

export default function App() {
  const isExtension = typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;

  if (isExtension) {
    return <Popup />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="relative">
        {/* Browser Frame Mock */}
        <div className="absolute -top-8 left-0 right-0 h-8 bg-slate-800 rounded-t-xl flex items-center px-4 gap-1.5 border-b border-slate-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        
        {/* Extension Popup Content */}
        <div className="rounded-b-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          <Popup />
        </div>
        
        {/* Instruction Label */}
        <div className="absolute -bottom-12 left-0 right-0 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Extension Popup Preview (380px × 500px)
          </p>
        </div>
      </div>
    </div>
  );
}
