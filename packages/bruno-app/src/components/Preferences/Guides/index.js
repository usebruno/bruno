import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconRocket,
  IconPlayerPlay,
  IconRotate,
  IconCheck,
  IconClock,
  IconStar
} from '@tabler/icons';
import {
  startGuide,
  resetGuideProgressAndPersist,
  selectCompletedGuides,
  selectActiveGuideId
} from 'providers/ReduxStore/slices/onboarding';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { getAllGuides, GUIDE_IDS } from 'components/Onboarding/guides';
import StyledWrapper from './StyledWrapper';

const GUIDE_ICONS = {
  rocket: IconRocket
};

const Guides = () => {
  const dispatch = useDispatch();
  const completedGuides = useSelector(selectCompletedGuides);
  const activeGuideId = useSelector(selectActiveGuideId);
  const tabs = useSelector((state) => state.tabs.tabs);

  const guides = getAllGuides();

  const handleStartGuide = useCallback((guideId) => {
    // Close guides tab when starting a guide
    const guidesTab = tabs.find((tab) => tab.type === 'guides');
    if (guidesTab) {
      dispatch(closeTabs({ tabUids: [guidesTab.uid] }));
    }
    // Start the guide after a small delay to allow tab to close
    setTimeout(() => {
      dispatch(startGuide({ guideId }));
    }, 100);
  }, [dispatch, tabs]);

  const handleResetGuide = useCallback((guideId) => {
    dispatch(resetGuideProgressAndPersist(guideId));
  }, [dispatch]);

  const isGuideCompleted = (guideId) => completedGuides.includes(guideId);
  const isGuideActive = (guideId) => activeGuideId === guideId;

  const getGuideIcon = (iconName) => {
    const IconComponent = GUIDE_ICONS[iconName] || IconRocket;
    return <IconComponent size={22} stroke={1.5} />;
  };

  return (
    <StyledWrapper>
      <div className="guides-header">
        <h3>Interactive Guides</h3>
        <p>
          Learn Bruno through interactive step-by-step guides. Each guide highlights key features
          and walks you through common workflows.
        </p>
      </div>

      <div className="guides-list">
        {guides.map((guide) => {
          const completed = isGuideCompleted(guide.id);
          const active = isGuideActive(guide.id);
          const isNew = guide.id === GUIDE_IDS.WELCOME && !completed && completedGuides.length === 0;

          return (
            <div key={guide.id} className="guide-card">
              <div className="guide-icon">
                {getGuideIcon(guide.icon)}
              </div>

              <div className="guide-content">
                <div className="guide-title-row">
                  <h4>{guide.name}</h4>
                  {completed && (
                    <span className="guide-badge completed">
                      <IconCheck size={10} stroke={2.5} />
                      Completed
                    </span>
                  )}
                  {isNew && (
                    <span className="guide-badge new">
                      <IconStar size={10} stroke={2} />
                      Recommended
                    </span>
                  )}
                </div>

                <p className="guide-description">{guide.description}</p>

                <div className="guide-meta">
                  <span>
                    <IconClock size={12} stroke={1.5} />
                    {guide.estimatedTime}
                  </span>
                  <span>
                    {guide.steps.length} steps
                  </span>
                </div>
              </div>

              <div className="guide-actions">
                <button
                  className="btn-primary"
                  onClick={() => handleStartGuide(guide.id)}
                  disabled={active}
                >
                  {completed ? (
                    <>
                      <IconRotate size={14} stroke={2} />
                      Restart
                    </>
                  ) : (
                    <>
                      <IconPlayerPlay size={14} stroke={2} />
                      Start
                    </>
                  )}
                </button>

                {completed && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleResetGuide(guide.id)}
                  >
                    Reset Progress
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

export default Guides;
