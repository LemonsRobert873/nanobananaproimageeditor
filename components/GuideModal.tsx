
import React from 'react';
import { X, BookOpen, Layers, Type, Wand2, FileText, User, ImagePlus, Copy, Key, Sparkles, Sliders, Command, MousePointerClick, RotateCcw, Clock, Monitor, Zap, ShieldCheck, Scale, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProTheme?: boolean;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, isProTheme = true }) => {
  const accentText = isProTheme ? 'text-yellow-500' : 'text-cyan-400';
  const accentBg = isProTheme ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-cyan-500/10 border-cyan-500/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h3 className="text-xl text-zinc-100 font-semibold flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${accentBg}`}>
                   <BookOpen size={20} className={accentText} />
                </div>
                NanoBanana Pro Studio Guide
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 hover:bg-zinc-900 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
               
               {/* 1. Introduction & Privacy */}
               <section className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="p-2 bg-zinc-800 rounded-lg shrink-0 text-green-400">
                       <ShieldCheck size={20} />
                    </div>
                    <div>
                       <h4 className="text-zinc-200 font-medium mb-1">Privacy & Security</h4>
                       <p className="text-zinc-400 text-sm leading-relaxed">
                          <strong>Client-Side Only:</strong> This application runs entirely in your browser. Your API key is stored securely in your browser's Local Storage and is transmitted directly to the Google Gemini API. No data is ever stored on our servers or third-party intermediaries.
                       </p>
                    </div>
                  </div>
               </section>

               {/* 2. Model Selection */}
               <section>
                   <div className="flex items-center gap-2 mb-4 text-zinc-100">
                       <Scale className="text-zinc-400" size={20} />
                       <h4 className="text-lg font-semibold">Choose Your Engine</h4>
                   </div>
                   <div className="grid md:grid-cols-2 gap-4">
                       <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-yellow-500/20 rounded-xl p-5 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                               <Sparkles size={80} />
                           </div>
                           <h5 className="text-yellow-500 font-bold flex items-center gap-2 mb-2">
                               <Sparkles size={16} className="fill-yellow-500/20" /> Gemini 3 Pro
                           </h5>
                           <p className="text-sm text-zinc-300 mb-3 relative z-10">
                               The powerhouse. Delivers unmatched photorealism, complex instruction following, and high-fidelity textures.
                           </p>
                           <ul className="space-y-1 text-xs text-zinc-500 relative z-10">
                               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"/> <strong>Exclusive:</strong> Supports 2K & 4K Resolution</li>
                               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"/> Best for Final Productions</li>
                               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"/> Counts towards Daily Quota</li>
                           </ul>
                       </div>

                       <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-cyan-500/20 rounded-xl p-5 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                               <Zap size={80} />
                           </div>
                           <h5 className="text-cyan-400 font-bold flex items-center gap-2 mb-2">
                               <Zap size={16} className="fill-cyan-400/20" /> Gemini 2.5 Flash
                           </h5>
                           <p className="text-sm text-zinc-300 mb-3 relative z-10">
                               The speedster. Incredible performance for rapid prototyping and style exploration.
                           </p>
                           <ul className="space-y-1 text-xs text-zinc-500 relative z-10">
                               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-400 rounded-full"/> Lightning Fast Generation</li>
                               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-400 rounded-full"/> Fixed Standard Resolution (1K)</li>
                               <li className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-400 rounded-full"/> Does NOT impact Daily Quota</li>
                           </ul>
                       </div>
                   </div>
               </section>

               <hr className="border-zinc-800" />

               {/* 3. Modes */}
               <section>
                  <div className="flex items-center gap-2 mb-4 text-zinc-100">
                     <Type className="text-blue-400" size={20} />
                     <h4 className="text-lg font-semibold">Core Modes</h4>
                  </div>
                  
                  {/* Mode 1 */}
                  <div className="mb-8">
                      <h5 className="text-sm font-medium text-zinc-300 mb-3 border-l-2 border-blue-500 pl-3">Mode 1: Image Edit</h5>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <User size={14} /> Identity Preservation
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Upload up to 5 <strong>Subject Faces</strong>. The model generates new scenes while rigorously maintaining the facial features of your subjects.
                            </p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ImagePlus size={14} /> Text-to-Image
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Leave subjects empty to use standard text-to-image. Use <strong>Pro</strong> mode for 2K/4K scaling and specific aspect ratios.
                            </p>
                        </div>
                      </div>
                  </div>

                  {/* Mode 2 */}
                  <div>
                      <h5 className="text-sm font-medium text-zinc-300 mb-3 border-l-2 border-purple-500 pl-3">Mode 2: Image → Image</h5>
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-3">
                         <p className="text-xs text-zinc-400">
                            Combines <strong>Subject(s)</strong> with a <strong>Reference Image</strong>. Use the <strong>Reference Strength</strong> slider to control adherence.
                         </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                         {[
                            { icon: User, title: 'Apply Clothing', desc: 'Dresses the Subject(s) in the outfit shown in the Reference image.' },
                            { icon: ImagePlus, title: 'Replace Face', desc: 'Swaps faces in the Reference image with the Subject(s).' },
                            { icon: Copy, title: 'Replicate Reference', desc: 'Analyzes structure and recreates it featuring the Subject(s).' },
                         ].map((item, i) => (
                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1 text-purple-400">
                                  <item.icon size={14} />
                                  <span className="font-medium text-xs">{item.title}</span>
                               </div>
                               <p className="text-[11px] text-zinc-500 leading-relaxed">{item.desc}</p>
                            </div>
                         ))}
                      </div>
                  </div>
               </section>

               {/* 4. Utilities */}
               <section className="grid md:grid-cols-2 gap-4">
                   <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex gap-4 items-start">
                      <div className="p-2 bg-green-900/20 rounded-lg text-green-400 shrink-0">
                          <FileText size={20} />
                      </div>
                      <div>
                          <h5 className="text-sm font-medium text-zinc-200 mb-1">Mode 3: Image → Text Prompt</h5>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Reverse-engineers a prompt from an image. Useful for extracting style, lighting, and camera settings from any reference.
                          </p>
                      </div>
                   </div>
                   <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex gap-4 items-start">
                      <div className="p-2 bg-pink-900/20 rounded-lg text-pink-400 shrink-0">
                          <Wand2 size={20} />
                      </div>
                      <div>
                          <h5 className="text-sm font-medium text-zinc-200 mb-1">Mode 4: Text Prompt</h5>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Expands simple ideas into professional, paragraph-long prompts. Toggle "Face Feature" to focus on portrait details.
                          </p>
                      </div>
                   </div>
               </section>

               <hr className="border-zinc-800" />

               {/* 5. Workflow Tips */}
               <section>
                   <div className="flex items-center gap-2 mb-4 text-zinc-100">
                       <Sliders className={accentText} size={20} />
                       <h4 className="text-lg font-semibold">Pro Workflow Tips</h4>
                   </div>
                   <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                       <ul className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm text-zinc-400">
                           <li className="flex gap-3 items-start">
                               <span className="bg-zinc-800 p-1 rounded text-zinc-300 mt-0.5"><Command size={12} /></span>
                               <span>
                                   <strong className="text-zinc-200 block mb-0.5">Quick Generate</strong>
                                   Use <code className="bg-zinc-800 px-1 rounded text-xs">Cmd/Ctrl + Enter</code> to run the current configuration instantly.
                               </span>
                           </li>
                           <li className="flex gap-3 items-start">
                               <span className="bg-zinc-800 p-1 rounded text-red-400 mt-0.5"><AlertCircle size={12} /></span>
                               <span>
                                   <strong className="text-zinc-200 block mb-0.5">Negative Prompting</strong>
                                   Open the <strong>Advanced Settings</strong> dropdown to add negative prompts (e.g. "blurry", "text") to refine your output.
                               </span>
                           </li>
                           <li className="flex gap-3 items-start">
                               <span className="bg-zinc-800 p-1 rounded text-blue-400 mt-0.5"><Copy size={12} /></span>
                               <span>
                                   <strong className="text-zinc-200 block mb-0.5">Drag & Drop History</strong>
                                   Drag any generated image from the bottom strip back into a Subject or Reference slot.
                               </span>
                           </li>
                           <li className="flex gap-3 items-start">
                               <span className={`bg-zinc-800 p-1 rounded ${accentText} mt-0.5`}><Clock size={12} /></span>
                               <span>
                                   <strong className="text-zinc-200 block mb-0.5">Daily Quota (Pro Only)</strong>
                                   The generation counter for Pro models resets daily at 12:00 AM PT. Flash generations are unlimited.
                               </span>
                           </li>
                           <li className="flex gap-3 items-start">
                               <span className="bg-zinc-800 p-1 rounded text-pink-400 mt-0.5"><Monitor size={12} /></span>
                               <span>
                                   <strong className="text-zinc-200 block mb-0.5">Deep Zoom</strong>
                                   Click any result in the canvas to enter high-res inspection mode. Pan by moving your mouse.
                               </span>
                           </li>
                       </ul>
                   </div>
               </section>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 shrink-0 flex justify-end">
               <Button onClick={onClose} isProTheme={isProTheme} className="px-8">Close Guide</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GuideModal;