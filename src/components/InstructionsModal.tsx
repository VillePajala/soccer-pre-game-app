import React from 'react';
import { FaUndo, FaRedo, FaEye, FaEyeSlash, FaRegClock, FaRegStopCircle, FaTrashAlt, FaEraser, FaUserPlus } from 'react-icons/fa';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close modal on overlay click
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-lg w-full text-slate-200 shadow-xl relative max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-100 text-2xl font-bold"
          aria-label="Close instructions"
        >
          &times; {/* Unicode multiplication sign for 'X' */}
        </button>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">How to Use</h2>
        
        {/* Instructions Content */}
        <div className="space-y-4 text-sm sm:text-base">
          <section>
            <h3 className="text-lg font-semibold mb-2 text-yellow-300">Player Bar (Top)</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-semibold">Select Player:</span> Tap a player disk once to select it (a yellow ring will appear). You can then tap on the field to place/move them.</li>
              <li><span className="font-semibold">Deselect Player:</span> Tap the currently selected player disk again to deselect it.</li>
              <li><span className="font-semibold">Rename Player:</span> Double-tap (or double-click) a player disk in the bar to edit its name. Press Enter or click away to save.</li>
              <li><span className="font-semibold">Rename Team:</span> Double-tap (or double-click) the Team Name (e.g., &quot;My Team&quot;) to edit it.</li>
              <li><span className="font-semibold">Scroll Bar:</span> Swipe horizontally on the bar itself (not directly on a player disk) to scroll if players overflow.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2 text-yellow-300">Field Area</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-semibold">Move Player/Opponent:</span> Click/touch and drag a player or opponent marker already on the field.</li>
              <li><span className="font-semibold">Add/Place Selected Player:</span> After selecting a player from the top bar (yellow ring), tap on the field to place them at that location.</li>
              <li><span className="font-semibold">Remove Player/Opponent:</span> Double-tap (or double-click) directly on a player or opponent marker on the field to remove it.</li>
              <li><span className="font-semibold">Draw Lines:</span> Click/touch and drag on an empty area of the field to draw lines.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2 text-yellow-300">Control Bar (Bottom)</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-semibold">Undo/Redo <FaUndo className="inline-block align-text-bottom mx-0.5" size={16}/> / <FaRedo className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> Step backward or forward through your actions (moves, adds, removals, drawings, name changes).</li>
              <li><span className="font-semibold">Toggle Names <FaEye className="inline-block align-text-bottom mx-0.5" size={16}/> / <FaEyeSlash className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> Show or hide player names on the disks on the field.</li>
              <li><span className="font-semibold">Toggle Timer Overlay <FaRegClock className="inline-block align-text-bottom mx-0.5" size={16}/> / <FaRegStopCircle className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> Show or hide the large timer/substitution overlay.</li>
              <li><span className="font-semibold">Reset Field <FaTrashAlt className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> Remove all players, opponents, and drawings from the field. Player names and team name are kept.</li>
              <li><span className="font-semibold">Clear Drawings <FaEraser className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> Remove only the drawn lines from the field.</li>
              <li><span className="font-semibold">Add Opponent <FaUserPlus className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> Add a red opponent marker to the field.</li>
              <li><span className="font-semibold">Timer Controls:</span> Start, Pause, and Reset the match timer.</li>
              <li><span className="font-semibold">Help<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block align-text-bottom mx-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>:</span> Show these instructions.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2 text-yellow-300">Timer & Substitution Overlay (Large View)</h3>
             <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-semibold">Set Interval:</span> Use the input field to set the desired substitution interval in minutes.</li>
              <li><span className="font-semibold">Substitution Alerts:</span> The background will turn orange as a warning (1 min before due) and red when the interval is reached.</li>
              <li><span className="font-semibold">Confirm Sub:</span> Click &quot;Substitution Made&quot; after completing subs. This logs the duration and resets the alert for the next interval.</li>
              <li><span className="font-semibold">Play Time History:</span> View the durations of previous play intervals below the controls.</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold mb-2 text-yellow-300">General</h3>
             <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-semibold">Touch Interactions:</span> Many actions use double-tap instead of single-click on touch devices to avoid accidental triggers (e.g., renaming, removing from field).</li>
              <li><span className="font-semibold">Saving:</span> All your changes (players, positions, drawings, names, timer state) are saved automatically in your browser&apos;s local storage.</li>
              <li><span className="font-semibold">Fullscreen:</span> Use the &quot;Full&quot; button in the top-right corner to toggle fullscreen mode.</li>
            </ul>
          </section>
        </div>

        <p className="text-sm text-slate-400 mt-6">Click outside the box or the 'X' to close.</p>
      </div>
    </div>
  );
};

export default InstructionsModal; 