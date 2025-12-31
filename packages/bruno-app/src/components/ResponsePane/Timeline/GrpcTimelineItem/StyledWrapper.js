import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};

  /* Event type border colors */
  &.event-metadata {
    border-left: 4px solid ${(props) => rgba(props.theme.request.methods.post, 0.2)};
  }

  &.event-response {
    border-left: 4px solid ${(props) => rgba(props.theme.request.methods.get, 0.2)};
  }

  &.event-request,
  &.event-message {
    border-left: 4px solid ${(props) => rgba(props.theme.request.methods.put, 0.2)};
  }

  &.event-status {
    border-left: 4px solid ${(props) => rgba(props.theme.colors.text.purple, 0.2)};
  }

  &.event-error {
    border-left: 4px solid ${(props) => rgba(props.theme.colors.text.danger, 0.2)};
  }

  &.event-end {
    border-left: 4px solid ${(props) => rgba(props.theme.colors.text.muted, 0.2)};
  }

  &.event-cancel {
    border-left: 4px solid ${(props) => rgba(props.theme.colors.text.warning, 0.2)};
  }

  /* Event type icon colors */
  .icon-metadata {
    color: ${(props) => props.theme.request.methods.post};
  }

  .icon-response {
    color: ${(props) => props.theme.request.methods.get};
  }

  .icon-request,
  .icon-message {
    color: ${(props) => props.theme.request.methods.put};
  }

  .icon-status {
    color: ${(props) => props.theme.colors.text.purple};
  }

  .icon-error {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .icon-end {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .icon-cancel {
    color: ${(props) => props.theme.colors.text.warning};
  }

  /* Event Header */
  .event-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;

    span:nth-of-type(1) {
      font-weight: 500;
    }

    pre {
      font-size: ${(props) => props.theme.font.size.xs};
      margin: 0;
    }
  }

  /* Common content container styles */
  .content-request,
  .content-message,
  .content-metadata,
  .content-response,
  .content-status,
  .content-error,
  .content-end,
  .content-cancel {
    margin-top: 0.375rem;
    padding: 0.375rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Request/Message content */
  .content-request,
  .content-message {
    background-color: ${(props) => rgba(props.theme.request.methods.put, 0.1)};
  }

  .content-request-label,
  .content-message-label {
    color: ${(props) => props.theme.request.methods.put};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Metadata content */
  .content-metadata {
    background-color: ${(props) => rgba(props.theme.request.methods.post, 0.1)};
  }

  .content-metadata-label {
    color: ${(props) => props.theme.request.methods.post};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Response content */
  .content-response {
    background-color: ${(props) => rgba(props.theme.request.methods.get, 0.1)};
  }

  .content-response-label {
    color: ${(props) => props.theme.request.methods.get};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Status content */
  .content-status {
    background-color: ${(props) => rgba(props.theme.colors.text.purple, 0.1)};
  }

  .content-status-label {
    color: ${(props) => props.theme.colors.text.purple};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Error content */
  .content-error {
    background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
  }

  .content-error-label {
    color: ${(props) => props.theme.colors.text.danger};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* End content */
  .content-end {
    background-color: ${(props) => rgba(props.theme.colors.text.muted, 0.1)};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Cancel content */
  .content-cancel {
    background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.1)};
  }

  .content-cancel-label {
    color: ${(props) => props.theme.colors.text.warning};
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  /* Common content styles */
  .content-box {
    background-color: ${(props) => props.theme.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.375rem;

    pre {
      font-family: ${(props) => props.theme.font.mono || 'monospace'};
      font-size: ${(props) => props.theme.font.size.xs};
      margin: 0;
    }
  }

  .empty-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
    font-size: ${(props) => props.theme.font.size.xs};
  }

  /* Method type badge */
  .method-type-badge {
    background-color: ${(props) => rgba(props.theme.request.methods.put, 0.15)};
    color: ${(props) => props.theme.request.methods.put};
    border-radius: ${(props) => props.theme.border.radius.base};
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
  }

  /* Timestamp and URL */
  .timestamp-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .url-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.xs};
  }

  .contents {
    display: contents;
    font-size: ${(props) => props.theme.font.size.xs};
    
    div:first-child {
      font-weight: 500;
    }
  }
`;

export default StyledWrapper;
