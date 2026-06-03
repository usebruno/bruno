import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../providers/Theme';
import { useDispatch } from 'react-redux';
import { openCollection } from 'providers/ReduxStore/slices/collections/actions';

import toast from 'react-hot-toast';
import styled from 'styled-components';
import StyledWrapper from './StyledWrapper';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const CreateOrOpenCollection = ({ onCreateClick }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch(
      (err) => {
        console.log(err);
        toast.error(t('SIDEBAR.ERROR_OPENING_COLLECTION'));
      }
    );
  };
  const CreateLink = () => (
    <LinkStyle
      className="underline text-link cursor-pointer"
      theme={theme}
      onClick={onCreateClick}
    >
      {t('COMMON.CREATE')}
    </LinkStyle>
  );
  const OpenLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => handleOpenCollection(true)}>
      {t('COMMON.OPEN')}
    </LinkStyle>
  );

  return (
    <StyledWrapper className="px-2 mt-4">
      <div className="text-xs text-center">
        <div>{t('SIDEBAR.NO_COLLECTIONS_FOUND')}</div>
        <div className="mt-2">
          <CreateLink /> or <OpenLink /> Collection.
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CreateOrOpenCollection;
