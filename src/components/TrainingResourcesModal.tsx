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

  // Helper to render list items from translation arrays safely, handling multiple levels of nesting
  const renderListItems = (items: any, itemKeyPrefix: string, level = 1): React.ReactNode => {
    if (!Array.isArray(items)) {
        const fetchedItems = t(items as string, { returnObjects: true });
        if (!Array.isArray(fetchedItems)) return null;
        items = fetchedItems;
    }

    // Define the type for list items
    type ListItem = string | { title: string; subPoints?: ListItem[] }; // subPoints is now optional and recursive

    return (items as ListItem[]).map((item: ListItem, index: number) => {
      const key = `${itemKeyPrefix}-${index}`;
      const currentPadding = `pl-${2 + level * 2}`; // Calculate padding based on level (pl-4, pl-6, etc.)

      // Check if item is an object with title
      if (typeof item === 'object' && item !== null && item.title) {
        return (
          <li key={key}>
            {item.title}
            {/* Render sub-points recursively if they exist */}
            {item.subPoints && Array.isArray(item.subPoints) && item.subPoints.length > 0 && (
              <ul className={`list-disc list-inside space-y-1 ${currentPadding} mt-1`}> 
                {renderListItems(item.subPoints, key, level + 1)} {/* Recursive call */}
              </ul>
            )}
          </li>
        );
      }
      // Render regular string item
      return <li key={key}>{String(item)}</li>;
    });
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
                        <div className="space-y-6">
                        {/* Use matchPreparation keys for content */}
                        <h3 className="text-xl font-semibold mb-4 text-yellow-300">{t('matchPreparation.title')}</h3>
                        <section>
                          <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('matchPreparation.section1.title')}</h4>
                          <p className="text-sm italic text-slate-400 mb-2">{t('matchPreparation.section1.goal')}</p>
                          <ul className="list-disc list-inside space-y-1.5 pl-2">
                            {renderListItems(t('matchPreparation.section1.points', { returnObjects: true }), 's1')}
                          </ul>
                        </section>
                        <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('matchPreparation.section2.title')}</h4>
                            <p className="text-sm italic text-slate-400 mb-2">{t('matchPreparation.section2.goal')}</p>
                            <ul className="list-disc list-inside space-y-1.5 pl-2">
                              {renderListItems(t('matchPreparation.section2.points', { returnObjects: true }), 's2')}
                            </ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('matchPreparation.section3.title')}</h4>
                            <p className="text-sm italic text-slate-400 mb-2">{t('matchPreparation.section3.goal')}</p>
                            {/* Render the top-level list for section 3 */}
                            <ul className="list-disc list-inside space-y-1.5 pl-2">
                                {renderListItems(t('matchPreparation.section3.points', { returnObjects: true }), 's3')}
                            </ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('matchPreparation.section4.title')}</h4>
                            <p className="text-sm italic text-slate-400 mb-2">{t('matchPreparation.section4.goal')}</p>
                            <ul className="list-disc list-inside space-y-1.5 pl-2">
                              {renderListItems(t('matchPreparation.section4.points', { returnObjects: true }), 's4')}
                            </ul>
                          </section>
                          <section>
                            <h4 className="text-lg font-bold mb-2 text-yellow-200">{t('matchPreparation.duringGame.title')}</h4>
                            <ul className="list-disc list-inside space-y-1.5 pl-2">
                              {renderListItems(t('matchPreparation.duringGame.points', { returnObjects: true }), 'dg')}
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