import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi2'; // Import chevron icons

interface TrainingResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define available sections
type TrainingSection = 'warmup' | 'exampleDrills';

const TrainingResourcesModal: React.FC<TrainingResourcesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  // State to track the currently expanded section (or null if none)
  const [expandedSection, setExpandedSection] = useState<TrainingSection | null>(null); // Default to null (all closed)

  if (!isOpen) return null;

  // Helper to render list items from translation arrays safely
  const renderListItems = (translationKey: string, itemKeyPrefix: string) => {
    const items = t(translationKey, { returnObjects: true });
    if (Array.isArray(items)) {
      return items.map((item, index) => (
        <li key={`${itemKeyPrefix}-${index}`}>{String(item)}</li>
      ));
    }
    return null;
  };

  // Function to toggle accordion sections
  const toggleSection = (section: TrainingSection) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  // Define the sections to render in the accordion
  const sections: { key: TrainingSection; titleKey: string }[] = [
    { key: 'warmup', titleKey: 'trainingResourcesModal.navWarmup' },
    { key: 'exampleDrills', titleKey: 'trainingResourcesModal.navExampleDrills' },
    // Add more sections here as needed
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full text-slate-200 shadow-xl relative flex flex-col border border-slate-600 overflow-hidden max-h-[calc(100vh-theme(space.8))] min-h-[calc(100vh-theme(space.8))]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-100 text-2xl font-bold z-20"
          aria-label={t('common.closeButton', 'Close') ?? "Close"}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">{t('trainingResourcesModal.title', 'Training Resources')}</h2> 
        
        {/* Accordion Content Area */}
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 pr-2 space-y-2">
          
          {sections.map((section) => {
            const isExpanded = expandedSection === section.key;
            return (
              <div key={section.key} className="border border-slate-700 rounded-md overflow-hidden">
                {/* Accordion Header/Button */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex justify-between items-center p-3 text-left bg-slate-700/50 hover:bg-slate-700 transition-colors"
                  aria-expanded={isExpanded}
                  aria-controls={`${section.key}-content`}
                >
                  <span className="font-semibold text-lg text-yellow-300">{t(section.titleKey)}</span>
                  {isExpanded ? <HiOutlineChevronUp className="w-5 h-5 text-slate-400"/> : <HiOutlineChevronDown className="w-5 h-5 text-slate-400"/>}
                </button>
                
                {/* Accordion Content Panel (Conditionally Rendered) */}
                {isExpanded && (
                  <div 
                    id={`${section.key}-content`}
                    className="p-4 bg-slate-800/50 text-sm sm:text-base"
                  >
                    {section.key === 'warmup' && (
                       <div className="space-y-4">
                        {/* Warmup content structure (using renderListItems) */}
                        <h3 className="text-xl font-semibold mb-3 text-yellow-300">{t('warmup.title')}</h3>
                        <section>
                          <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section1Title')}</h4>
                          <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section1Goal')}</p>
                          <ul className="list-disc list-inside space-y-1 pl-2">
                            {renderListItems('warmup.section1Points', 's1')}
                          </ul>
                        </section>
                        <section>
                           <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section2Title')}</h4>
                           <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section2Goal')}</p>
                           <ul className="list-disc list-inside space-y-1 pl-2">
                             {renderListItems('warmup.section2Activities', 's2')}
                           </ul>
                         </section>
                         <section>
                           <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section3Title')}</h4>
                           <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section3Goal')}</p>
                           <div className="pl-2 space-y-2">
                             <p className="font-semibold">{t('warmup.section3PairWork')}</p>
                             <ul className="list-disc list-inside space-y-1 pl-4">
                               {renderListItems('warmup.section3PairWorkPoints', 's3p')}
                             </ul>
                             <p className="font-semibold mt-2">{t('warmup.section3GoalieWarmup')}</p>
                             <ul className="list-disc list-inside space-y-1 pl-4">
                               {renderListItems('warmup.section3GoalieWarmupPoints', 's3g')}
                             </ul>
                             <p className="font-semibold mt-2">{t('warmup.section3CombinedGoalieWarmup')}</p>
                             <ul className="list-disc list-inside space-y-1 pl-4">
                                {renderListItems('warmup.section3CombinedGoalieWarmupPoints', 's3c')}
                             </ul>
                           </div>
                         </section>
                         <section>
                           <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.section4Title')}</h4>
                           <p className="text-xs italic text-slate-400 mb-1">{t('warmup.section4Goal')}</p>
                           <ul className="list-disc list-inside space-y-1 pl-2">
                             {renderListItems('warmup.section4Points', 's4')}
                           </ul>
                         </section>
                         <section>
                           <h4 className="text-lg font-medium mb-1 text-yellow-200">{t('warmup.duringGameTitle')}</h4>
                           <ul className="list-disc list-inside space-y-1 pl-2">
                             {renderListItems('warmup.duringGamePoints', 'dg')}
                           </ul>
                         </section>
                       </div>
                    )}
                    {section.key === 'exampleDrills' && (
                      <div className="space-y-4">
                         {/* Example Drills content structure */}
                         <h3 className="text-xl font-semibold mb-3 text-yellow-300">{t('trainingResourcesModal.exampleDrills.title')}</h3>
                         <section>
                           <p className="text-slate-300 mb-2">{t('trainingResourcesModal.exampleDrills.description')}</p>
                           <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400 italic">
                             <li>{t('trainingResourcesModal.exampleDrills.point1')}</li>
                             <li>{t('trainingResourcesModal.exampleDrills.point2')}</li>
                             <li>{t('trainingResourcesModal.exampleDrills.point3')}</li>
                           </ul>
                         </section>
                      </div>
                    )}
                    {/* Add more conditions here for other sections */}
                  </div>
                )}
              </div>
            );
          })} 

        </div>

      </div>
    </div>
  );
};

export default TrainingResourcesModal; 