import React from 'react';
import { useDispatch } from 'react-redux';
import Markdown from 'components/MarkDown';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { updateActivePreferencesTab } from 'providers/ReduxStore/slices/app';
import changelogContent from './CHANGELOG.md';
import akamaiEdgeGridImg from 'assets/changelog-v4.0.0/akamai-edgegrid-auth.png';
import descriptionsImg from 'assets/changelog-v4.0.0/descriptions.png';
import secretManagerImg from 'assets/changelog-v4.0.0/secret-manager.png';
import aiImg from 'assets/changelog-v4.0.0/ai.png';
import appsImg from 'assets/changelog-v4.0.0/apps.png';
import StyledWrapper from './StyledWrapper';

const PREFERENCE_LINKS = {
  '#preferences/ai': 'ai',
  '#preferences/cache': 'cache'
};

const content = changelogContent
  .replace(/%AKAMAI_EDGEGRID_IMG%/g, akamaiEdgeGridImg)
  .replace(/%DESCRIPTIONS_IMG%/g, descriptionsImg)
  .replace(/%SECRET_MANAGER_IMG%/g, secretManagerImg)
  .replace(/%AI_IMG%/g, aiImg)
  .replace(/%APPS_IMG%/g, appsImg);

const ChangelogTab = ({ collectionUid }) => {
  const dispatch = useDispatch();

  const handleClick = (event) => {
    const anchor = event.target;
    if (!anchor) return;

    const preferencesTab = PREFERENCE_LINKS[anchor.getAttribute('href')];
    if (!preferencesTab) return;

    event.preventDefault();
    dispatch(updateActivePreferencesTab({ tab: preferencesTab }));
    dispatch(
      addTab({
        type: 'preferences',
        uid: collectionUid ? `${collectionUid}-preferences` : 'preferences',
        collectionUid
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="changelog-body" onClick={handleClick}>
        <Markdown content={content} onDoubleClick={() => {}} />
      </div>
    </StyledWrapper>
  );
};

export default ChangelogTab;
