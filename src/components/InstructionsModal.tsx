import React, { useState } from 'react';
import { FaUndo, FaRedo, FaEye, FaEyeSlash, FaRegClock, FaRegStopCircle, FaTrashAlt, FaEraser, FaUserPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-lg w-full text-slate-200 shadow-xl relative max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-100 text-2xl font-bold z-10"
          aria-label={t('instructionsModal.closeButton') ?? "Close instructions"}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">{t('instructionsModal.title', 'App Guide')}</h2>
        
        <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 pr-2">
          <div className="space-y-4 text-sm sm:text-base">
            <section>
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">{t('instructionsModal.playerBarTitle')}</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="font-semibold">{t('instructionsModal.playerBar.selectPlayer')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.playerBar.deselectPlayer')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.playerBar.renamePlayer')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.playerBar.renameTeam')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.playerBar.scrollBar')}</span></li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">{t('instructionsModal.fieldAreaTitle')}</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="font-semibold">{t('instructionsModal.fieldArea.movePlayer')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.fieldArea.addPlacePlayer')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.fieldArea.removePlayer')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.fieldArea.drawLines')}</span></li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">{t('instructionsModal.controlBarTitle')}</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="font-semibold">Undo/Redo <FaUndo className="inline-block align-text-bottom mx-0.5" size={16}/> / <FaRedo className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> {t('instructionsModal.controlBar.undoRedo')}</li>
                <li><span className="font-semibold">Toggle Names <FaEye className="inline-block align-text-bottom mx-0.5" size={16}/> / <FaEyeSlash className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> {t('instructionsModal.controlBar.toggleNames')}</li>
                <li><span className="font-semibold">Toggle Timer Overlay <FaRegClock className="inline-block align-text-bottom mx-0.5" size={16}/> / <FaRegStopCircle className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> {t('instructionsModal.controlBar.toggleTimerOverlay')}</li>
                <li><span className="font-semibold">Reset Field <FaTrashAlt className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> {t('instructionsModal.controlBar.resetField')}</li>
                <li><span className="font-semibold">Clear Drawings <FaEraser className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> {t('instructionsModal.controlBar.clearDrawings')}</li>
                <li><span className="font-semibold">Add Opponent <FaUserPlus className="inline-block align-text-bottom mx-0.5" size={16}/>:</span> {t('instructionsModal.controlBar.addOpponent')}</li>
                <li><span className="font-semibold">Timer Controls:</span> {t('instructionsModal.controlBar.timerControls')}</li>
                <li><span className="font-semibold">Help<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block align-text-bottom mx-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>:</span> {t('instructionsModal.controlBar.help')}</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">{t('instructionsModal.timerOverlayTitle')}</h3>
               <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="font-semibold">{t('instructionsModal.timerOverlay.setInterval')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.timerOverlay.subAlerts')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.timerOverlay.confirmSub')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.timerOverlay.playTimeHistory')}</span></li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">{t('instructionsModal.generalTitle')}</h3>
               <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="font-semibold">{t('instructionsModal.general.touchInteractions')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.general.saving')}</span></li>
                <li><span className="font-semibold">{t('instructionsModal.general.fullscreen')}</span></li>
              </ul>
            </section>
          </div>
        </div>

        <p className="text-sm text-slate-400 mt-6 pt-4 border-t border-slate-700">{t('instructionsModal.closeText')}</p>
      </div>
    </div>
  );
};

export default InstructionsModal; 