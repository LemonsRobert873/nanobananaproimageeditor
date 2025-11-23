import React from 'react';
import { X, BookOpen, Layers, Type, Wand2, FileText, User, ImagePlus, Copy, Key } from 'lucide-react';
import Button from './Button';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
                   <p className="text-zinc-400 text-sm leading-relaxed">
                      Before generating, ensure you have set your <strong>Google Gemini API Key</strong> using the key button in the top right. 
                      This application runs entirely in your browser; your key and images are sent directly to the Gemini API and are not stored on any intermediate server.
                   </p>
                </div>
              </div>
           </section>

           {/* Mode 1: Image Edit */}
           <section>
              <div className="flex items-center gap-2 mb-4 text-zinc-100">
                 <Type className="text-blue-400" size={20} />
                 <h4 className="text-lg font-semibold">Mode 1: Image Edit</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Identity-Locked Generation</div>
                    <p className="text-sm text-zinc-400">
                       Upload a <strong>Subject Face</strong> image and provide a text prompt. The system will generate a new image matching your prompt while rigorously preserving the facial features of the subject.
                    </p>
                    <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
                       <li>Input: Subject Image + Prompt</li>
                       <li>Best for: Portraits, Character consistency</li>
                    </ul>
                 </div>
                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Standard Text-to-Image</div>
                    <p className="text-sm text-zinc-400">
                       Leave the subject image empty and just provide a text prompt. The model will generate a high-fidelity image based solely on your description.
                    </p>
                    <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
                       <li>Input: Prompt Only</li>
                       <li>Best for: Scenery, Art, Generic subjects</li>
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
              <div className="space-y-4">
                 <p className="text-sm text-zinc-400">
                    Advanced editing requiring two inputs: a <strong>Subject Image</strong> (Face) and a <strong>Reference Image</strong> (Style/Scene/Clothing).
                 </p>
                 <div className="grid gap-4 md:grid-cols-3">
                    {[
                        { icon: User, title: 'Apply Clothing', desc: 'Takes the face from the Subject image and puts it into the outfit shown in the Reference image.' },
                        { icon: ImagePlus, title: 'Replace Face', desc: 'Keeps the Reference image scene exactly as is, but swaps the face with the Subject face.' },
                        { icon: Copy, title: 'Replicate Reference', desc: 'Analyzes the structure/lighting of the Reference image to create a similar shot featuring the Subject.' },
                    ].map((item, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2 text-purple-400">
                                <item.icon size={16} />
                                <span className="font-medium text-sm">{item.title}</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                 </div>
              </div>
           </section>

           {/* Modes 3 & 4: Utilities */}
           <section className="grid md:grid-cols-2 gap-8">
               <div>
                  <div className="flex items-center gap-2 mb-4 text-zinc-100">
                     <FileText className="text-green-400" size={20} />
                     <h4 className="text-lg font-semibold">Mode 3: Img to Prompt</h4>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3 h-full">
                     <p className="text-sm text-zinc-400">
                        Upload an image to reverse-engineer a highly detailed prompt. The AI analyzes lighting, camera settings, and composition.
                     </p>
                     <div className="text-xs text-zinc-500 p-3 bg-black/20 rounded border border-zinc-800/50">
                        Useful for learning how to prompt or extracting style metadata from existing images.
                     </div>
                  </div>
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-4 text-zinc-100">
                     <Wand2 className="text-pink-400" size={20} />
                     <h4 className="text-lg font-semibold">Mode 4: Text Prompt Gen</h4>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3 h-full">
                     <p className="text-sm text-zinc-400">
                        Enter a short, simple idea (e.g., "Cyberpunk cat"), and the AI will expand it into a professional, paragraph-long prompt optimized for generation.
                     </p>
                  </div>
               </div>
           </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 shrink-0 flex justify-end">
           <Button onClick={onClose} className="px-8">Got it</Button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;