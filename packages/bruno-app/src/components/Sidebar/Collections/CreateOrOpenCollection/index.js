import { useTheme } from '../../../../providers/Theme';
import { useDispatch } from 'react-redux';
import { setIsOpeningCollection } from 'providers/ReduxStore/slices/app';

import styled from 'styled-components';
import StyledWrapper from './StyledWrapper';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const CreateOrOpenCollection = ({ onCreateClick }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const handleOpenCollection = () => {
    dispatch(setIsOpeningCollection(true));
  };
  const CreateLink = () => (
    <LinkStyle
      className="underline text-link cursor-pointer"
      theme={theme}
      onClick={onCreateClick}
    >
      Create
    </LinkStyle>
  );
  const OpenLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => handleOpenCollection(true)}>
      Open
    </LinkStyle>
  );

  return (
    <StyledWrapper className="px-2 mt-4">
      <div className="text-xs text-center">
        <div>No collections found.</div>
        <div className="mt-2">
          <CreateLink /> or <OpenLink /> Collection.
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CreateOrOpenCollection;
