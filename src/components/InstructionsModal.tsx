import React, { useState } from 'react';
import { FaUndo, FaRedo, FaEye, FaEyeSlash, FaRegClock, FaRegStopCircle, FaTrashAlt, FaEraser, FaUserPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'instructions' | 'warmup'>('instructions');

  if (!isOpen) return null;

  const getTabClassName = (tabName: 'instructions' | 'warmup') => {
    return `px-4 py-2 rounded-t-md text-sm font-medium cursor-pointer transition-colors duration-150 ${
      activeTab === tabName
        ? 'bg-slate-700 text-yellow-400'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-100'
    }`;
  };

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
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">{t('instructionsModal.title')}</h2>
        
        <div className="flex border-b border-slate-600 mb-4">
          <div
            className={getTabClassName('instructions')}
            onClick={() => setActiveTab('instructions')}
          >
            {t('instructionsModal.tabInstructions', 'Instructions')}
          </div>
          <div
            className={getTabClassName('warmup')}
            onClick={() => setActiveTab('warmup')}
          >
             {t('instructionsModal.tabWarmup', 'Warmup Plan')}
          </div>
        </div>

        <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 pr-2">
          {activeTab === 'instructions' && (
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
          )}

          {activeTab === 'warmup' && (
            <div className="space-y-4 text-sm sm:text-base">
              <h3 className="text-xl font-semibold mb-3 text-yellow-300">{t('warmup.title')}</h3>
              
              {/* Section 1: Gathering */}
              <section>
                <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section1Title')}</h4>
                <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section1Goal')}</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  {(() => {
                    const points = t('warmup.section1Points', { returnObjects: true });
                    if (Array.isArray(points)) {
                      return (points as unknown[]).map((point, index) => (
                        <li key={`s1-${index}`}>{String(point)}</li>
                      ));
                    }
                    return null;
                  })()}
                </ul>
              </section>

              {/* Section 2: Warm-up */}
              <section>
                <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section2Title')}</h4>
                <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section2Goal')}</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                   {(() => {
                    const activities = t('warmup.section2Activities', { returnObjects: true });
                    if (Array.isArray(activities)) {
                      return (activities as unknown[]).map((activity, index) => (
                        <li key={`s2-${index}`}>{String(activity)}</li>
                      ));
                    }
                     return null;
                  })()}
                </ul>
              </section>

              {/* Section 3: Ball Work */}
              <section>
                <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section3Title')}</h4>
                <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section3Goal')}</p>
                <div className="pl-2 space-y-2">
                  <p className="font-semibold">{t('warmup.section3PairWork')}</p>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                     {(() => {
                       const pairWorkPoints = t('warmup.section3PairWorkPoints', { returnObjects: true });
                       if (Array.isArray(pairWorkPoints)) {
                         return (pairWorkPoints as unknown[]).map((point, index) => (
                          <li key={`s3p-${index}`}>{String(point)}</li>
                        ));
                       }
                        return null;
                    })()}
                  </ul>
                  <p className="font-semibold mt-2">{t('warmup.section3GoalieWarmup')}</p>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                     {(() => {
                       const goalieWarmupPoints = t('warmup.section3GoalieWarmupPoints', { returnObjects: true });
                        if (Array.isArray(goalieWarmupPoints)) {
                          return (goalieWarmupPoints as unknown[]).map((point, index) => (
                            <li key={`s3g-${index}`}>{String(point)}</li>
                          ));
                        }
                        return null;
                    })()}
                  </ul>
                   <p className="font-semibold mt-2">{t('warmup.section3CombinedGoalieWarmup')}</p>
                  <ul className="list-disc list-inside space-y-1 pl-4">
                     {(() => {
                       const combinedGoaliePoints = t('warmup.section3CombinedGoalieWarmupPoints', { returnObjects: true });
                       if (Array.isArray(combinedGoaliePoints)) {
                         return (combinedGoaliePoints as unknown[]).map((point, index) => (
                           <li key={`s3c-${index}`}>{String(point)}</li>
                         ));
                       }
                       return null;
                    })()}
                  </ul>
                </div>
              </section>

              {/* Section 4: Bench Area */}
              <section>
                <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section4Title')}</h4>
                <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section4Goal')}</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  {(() => {
                    const section4Points = t('warmup.section4Points', { returnObjects: true });
                    if (Array.isArray(section4Points)) {
                      return (section4Points as unknown[]).map((point, index) => (
                        <li key={`s4-${index}`}>{String(point)}</li>
                      ));
                    }
                    return null;
                  })()}
                </ul>
              </section>

              {/* During Game */}
              <section>
                <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.duringGameTitle')}</h4>
                <ul className="list-disc list-inside space-y-1 pl-2">
                   {(() => {
                     const duringGamePoints = t('warmup.duringGamePoints', { returnObjects: true });
                     if (Array.isArray(duringGamePoints)) {
                       return (duringGamePoints as unknown[]).map((point, index) => (
                         <li key={`dg-${index}`}>{String(point)}</li>
                       ));
                     }
                     return null;
                  })()}
                </ul>
              </section>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-400 mt-6 pt-4 border-t border-slate-700">{t('instructionsModal.closeText')}</p>
      </div>
    </div>
  );
};

export default InstructionsModal; 