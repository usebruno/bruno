import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
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

  /* Request/Message content */
  .content-request,
  .content-message {
    background-color: ${(props) => rgba(props.theme.request.methods.put, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .content-request-label,
  .content-message-label {
    color: ${(props) => props.theme.request.methods.put};
    font-weight: 500;
  }

  /* Metadata content */
  .content-metadata {
    background-color: ${(props) => rgba(props.theme.request.methods.post, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .content-metadata-label {
    color: ${(props) => props.theme.request.methods.post};
    font-weight: 500;
  }

  /* Response content */
  .content-response {
    background-color: ${(props) => rgba(props.theme.request.methods.get, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .content-response-label {
    color: ${(props) => props.theme.request.methods.get};
    font-weight: 500;
  }

  /* Status content */
  .content-status {
    background-color: ${(props) => rgba(props.theme.colors.text.purple, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .content-status-label {
    color: ${(props) => props.theme.colors.text.purple};
    font-weight: 500;
  }

  /* Error content */
  .content-error {
    background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .content-error-label {
    color: ${(props) => props.theme.colors.text.danger};
    font-weight: 500;
  }

  /* End content */
  .content-end {
    background-color: ${(props) => rgba(props.theme.colors.text.muted, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  /* Cancel content */
  .content-cancel {
    background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.1)};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .content-cancel-label {
    color: ${(props) => props.theme.colors.text.warning};
    font-weight: 500;
  }

  /* Common content styles */
  .content-box {
    background-color: ${(props) => props.theme.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .empty-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
  }

  /* Method type badge */
  .method-type-badge {
    background-color: ${(props) => rgba(props.theme.request.methods.put, 0.15)};
    color: ${(props) => props.theme.request.methods.put};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  /* Timestamp and URL */
  .timestamp-text {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .url-text {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
