import styled from 'styled-components';
import { SECTION_HEADER_HEIGHT } from '../constants';

const StyledWrapper = styled.div`
  .section-header {
    position: sticky;
    top: 0;
    z-index: 3;
    width: 100%;
    height: ${SECTION_HEADER_HEIGHT};
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    border: none;
    background: ${(props) => props.theme.bg};
    color: ${(props) => props.theme.text};
    font: inherit;
    text-align: left;
    cursor: pointer;
    user-select: none;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .section-chevron {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
    transition: transform 0.2s ease;
  }

  &.expanded .section-chevron {
    transform: rotate(90deg);
  }

  .section-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.primary.text};
  }

  .section-title {
    font-weight: 600;
  }

  .section-count {
    color: ${(props) => props.theme.colors.text.muted};
    font-variant-numeric: tabular-nums;
  }

  .section-subtitle {
    margin-left: auto;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .section-content {
    padding-bottom: 0.75rem;
  }

  .section-content thead {
    top: ${SECTION_HEADER_HEIGHT} !important;
  }
`;

export default StyledWrapper;
