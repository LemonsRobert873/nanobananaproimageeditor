

import React from 'react';
import { X, BookOpen, Layers, Type, Wand2, FileText, User, ImagePlus, Copy, Key, Sparkles, Sliders, Command, MousePointerClick, RotateCcw, Clock, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
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
                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                   <BookOpen size={20} className="text-yellow-500" />
                </div>
                NanoBanana Pro Studio Guide
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 hover:bg-zinc-900 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
               
               {/* Intro */}
               <section className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="p-2 bg-zinc-800 rounded-lg shrink-0 text-yellow-500">
                       <Key size={20} />
                    </div>
                    <div>
                       <h4 className="text-zinc-200 font-medium mb-1">Getting Started</h4>
                       <p className="text-zinc-400 text-sm leading-relaxed mb-2">
                          <strong>NanoBanana Pro Studio</strong> is a dual-model workspace. It harnesses <strong>Gemini 3 Pro</strong> for high-fidelity 4K image generation and <strong>Gemini 2.5 Flash</strong> for lightning-fast prompt analysis and expansion.
                       </p>
                       <p className="text-zinc-400 text-sm leading-relaxed">
                          <strong>Privacy Note:</strong> This application runs entirely in your browser. Your API key and images are transmitted directly to the Google Gemini API. No data is stored on our servers.
                       </p>
                    </div>
                  </div>
               </section>

               {/* Mode 1: Image Edit */}
               <section>
                  <div className="flex items-center gap-2 mb-4 text-zinc-100">
                     <Type className="text-blue-400" size={20} />
                     <h4 className="text-lg font-semibold">Mode 1: Image Edit & Generation</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                     <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <User size={60} />
                        </div>
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={12} /> Identity Preservation
                        </div>
                        <p className="text-sm text-zinc-400 relative z-10">
                           Upload up to 5 <strong>Subject Faces</strong> and provide a prompt. The model generates a new image while rigorously maintaining the facial features and identities.
                        </p>
                        <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1 relative z-10">
                           <li><strong>Input:</strong> Subject Image(s) + Text Prompt</li>
                           <li><strong>Best for:</strong> Placing specific people or characters in new scenarios.</li>
                        </ul>
                     </div>
                     <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ImagePlus size={60} />
                        </div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Text-to-Image</div>
                        <p className="text-sm text-zinc-400 relative z-10">
                           Leave the subject image empty. The system generates an image <strong>exactly based on your text prompt</strong> without auto-expansion or templates.
                        </p>
                        <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1 relative z-10">
                           <li><strong>Input:</strong> Text Prompt (Direct Execution)</li>
                           <li><strong>Specs:</strong> Supports up to 4K resolution & multiple aspect ratios.</li>
                           <li><strong>Best for:</strong> Precise control over scene generation.</li>
                        </ul>
                     </div>
                  </div>
               </section>

               {/* Mode 2: Image to Image */}
               <section>
                  <div className="flex items-center gap-2 mb-4 text-zinc-100">
                     <Layers className="text-purple-400" size={20} />
                     <h4 className="text-lg font-semibold">Mode 2: Image to Image</h4>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-4">
                     <p className="text-sm text-zinc-400 mb-2">
                        Requires <strong>Subject(s)</strong> (up to 5) and a <strong>Reference Image</strong> (Style/Scene).
                     </p>
                     <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20 w-fit">
                        <Sliders size={12} />
                        <span>Use the <strong>Reference Strength</strong> slider to control how strictly the AI follows the reference image structure vs. the prompt.</span>
                     </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                     {[
                        { icon: User, title: 'Apply Clothing', desc: 'Dresses the Subject(s) in the outfit shown in the Reference image. Keeps identities intact.' },
                        { icon: ImagePlus, title: 'Replace Face', desc: 'Swaps faces in the Reference image with the Subject(s). Preserves lighting/scene.' },
                        { icon: Copy, title: 'Replicate Reference', desc: 'Analyzes the Reference image structure and recreates it featuring the Subject(s).' },
                     ].map((item, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors">
                           <div className="flex items-center gap-2 mb-2 text-purple-400">
                              <item.icon size={16} />
                              <span className="font-medium text-sm">{item.title}</span>
                           </div>
                           <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                        </div>
                     ))}
                  </div>
               </section>

               {/* Workflow & Tools */}
               <section>
                   <div className="flex items-center gap-2 mb-4 text-zinc-100">
                       <Sparkles className="text-yellow-500" size={20} />
                       <h4 className="text-lg font-semibold">Pro Workflow Tips</h4>
                   </div>
                   <div className="grid md:grid-cols-2 gap-4">
                       <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4">
                           <h5 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                               <Sliders size={16} /> Advanced Controls
                           </h5>
                           <ul className="space-y-3 text-sm text-zinc-400">
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-zinc-400 h-fit mt-0.5"><Command size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Shortcuts:</strong> Use <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">Cmd/Ctrl + Enter</code> to generate instantly.
                                   </span>
                               </li>
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-yellow-500 h-fit mt-0.5"><Clock size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Daily Quota:</strong> The image generation counter resets automatically at 12:00 AM Pacific Time (PT).
                                   </span>
                               </li>
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-red-400 h-fit mt-0.5"><X size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Negative Prompt:</strong> Expand "Advanced Settings" to list elements you want to avoid (e.g., "blurry", "text").
                                   </span>
                               </li>
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-zinc-400 h-fit mt-0.5"><RotateCcw size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Reset App:</strong> Use the "Reset" button in the header to clear all history and settings for a fresh start.
                                   </span>
                               </li>
                           </ul>
                       </div>
                       
                       <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4">
                           <h5 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                               <MousePointerClick size={16} /> History & Interaction
                           </h5>
                           <ul className="space-y-3 text-sm text-zinc-400">
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-pink-400 h-fit mt-0.5"><Monitor size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Canvas Zoom:</strong> Click any generated image to toggle high-res zoom. Move your mouse to pan around 4K details.
                                   </span>
                               </li>
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-blue-400 h-fit mt-0.5"><Copy size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Drag & Drop:</strong> Drag images from your history strip directly onto the subject cards or reference area to reuse them.
                                   </span>
                               </li>
                               <li className="flex gap-3">
                                   <span className="bg-zinc-800 p-1 rounded text-green-400 h-fit mt-0.5"><FileText size={12} /></span>
                                   <span>
                                       <strong className="text-zinc-300">Prompt Gen:</strong> Use Mode 3 or 4 to create detailed prompts, then click "Use in Image Edit" to instantly switch modes.
                                   </span>
                               </li>
                           </ul>
                       </div>
                   </div>
               </section>

               {/* Modes 3 & 4: Utilities */}
               <section className="grid md:grid-cols-2 gap-4">
                   <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex gap-4 items-start">
                      <div className="p-2 bg-green-900/20 rounded-lg text-green-400 shrink-0">
                          <FileText size={20} />
                      </div>
                      <div>
                          <h5 className="text-sm font-medium text-zinc-200 mb-1">Mode 3: Img to Prompt</h5>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Reverse-engineers a prompt from an image. Useful for extracting style, lighting, and camera settings from existing photos.
                          </p>
                      </div>
                   </div>
                   <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex gap-4 items-start">
                      <div className="p-2 bg-pink-900/20 rounded-lg text-pink-400 shrink-0">
                          <Wand2 size={20} />
                      </div>
                      <div>
                          <h5 className="text-sm font-medium text-zinc-200 mb-1">Mode 4: Text Prompt Gen</h5>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Expands simple ideas (e.g. "Cyberpunk cat") into professional, paragraph-long prompts optimized for the model.
                          </p>
                      </div>
                   </div>
               </section>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 shrink-0 flex justify-end">
               <Button onClick={onClose} className="px-8">Close Guide</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GuideModal;
