import React from 'react';
import { IconStack, IconGitFork } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollectionTitleBar = ({collection}) => {
  return (
    <StyledWrapper>
      <div className="flex items-center p-2">
        <IconStack size={18} strokeWidth={1.5}/>
        <span className="ml-2 mr-4 font-semibold">anoop<span style={{paddingInline: 2}}>/</span>{collection.name}</span>
        <IconGitFork size={16} strokeWidth={1}/>
        <span className="ml-1 text-xs">from anoop/notebase</span>
      </div>
    </StyledWrapper>
  )
};

export default CollectionTitleBar;
