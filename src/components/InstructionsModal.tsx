'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineXMark } from 'react-icons/hi2';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light pointer-events-none" />
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-sky-400/10 blur-3xl opacity-50 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/10 blur-3xl opacity-50 rounded-full pointer-events-none" />

        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0 relative">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg text-center">
            {t('instructionsModal.title')}
          </h2>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-100" title={t('instructionsModal.closeButton')}>
            <HiOutlineXMark className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-6">
          <p className="text-sm text-slate-300">{t('instructionsModal.closeText')}</p>

          <section className="space-y-2">
            <h3 className="text-xl font-semibold text-yellow-300">{t('instructionsModal.playerBarTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>{t('instructionsModal.playerBar.selectPlayer')}</li>
              <li>{t('instructionsModal.playerBar.deselectPlayer')}</li>
              <li>{t('instructionsModal.playerBar.renamePlayer')}</li>
              <li>{t('instructionsModal.playerBar.renameTeam')}</li>
              <li>{t('instructionsModal.playerBar.scrollBar')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xl font-semibold text-yellow-300">{t('instructionsModal.fieldAreaTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>{t('instructionsModal.fieldArea.movePlayer')}</li>
              <li>{t('instructionsModal.fieldArea.addPlacePlayer')}</li>
              <li>{t('instructionsModal.fieldArea.removePlayer')}</li>
              <li>{t('instructionsModal.fieldArea.drawLines')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xl font-semibold text-yellow-300">{t('instructionsModal.controlBarTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>{t('instructionsModal.controlBar.undoRedo')}</li>
              <li>{t('instructionsModal.controlBar.toggleNames')}</li>
              <li>{t('instructionsModal.controlBar.placeAllPlayers')}</li>
              <li>{t('instructionsModal.controlBar.clearDrawings')}</li>
              <li>{t('instructionsModal.controlBar.addOpponent')}</li>
              <li>{t('instructionsModal.controlBar.resetField')}</li>
              <li>{t('instructionsModal.controlBar.toggleTimerOverlay')}</li>
              <li>{t('instructionsModal.controlBar.timerControls')}</li>
              <li>{t('instructionsModal.controlBar.help')}</li>
              <li>{t('instructionsModal.controlBar.fullscreen')}</li>
              <li>{t('instructionsModal.controlBar.languageToggle')}</li>
              <li>{t('instructionsModal.controlBar.hardReset')}</li>
              <li>{t('instructionsModal.controlBar.saveGameAs')}</li>
              <li>{t('instructionsModal.controlBar.loadGame')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xl font-semibold text-yellow-300">{t('instructionsModal.timerOverlayTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>{t('instructionsModal.timerOverlay.setInterval')}</li>
              <li>{t('instructionsModal.timerOverlay.subAlerts')}</li>
              <li>{t('instructionsModal.timerOverlay.confirmSub')}</li>
              <li>{t('instructionsModal.timerOverlay.playTimeHistory')}</li>
              <li>{t('instructionsModal.timerOverlay.editOpponentNameTitle')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xl font-semibold text-yellow-300">{t('instructionsModal.generalTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>{t('instructionsModal.general.touchInteractions')}</li>
              <li>{t('instructionsModal.general.saving')}</li>
              <li>{t('instructionsModal.general.fullscreen')}</li>
            </ul>
          </section>
        </div>

        <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex-shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">
            {t('instructionsModal.closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;
