import styled from 'styled-components';

const StyledWrapper = styled.div`
  .grpc-event-request {
    background-color: ${(props) => props.theme.grpc.timelineItem.request.bg};
  }

  .grpc-event-request-label {
    color: ${(props) => props.theme.grpc.timelineItem.request.label};
  }

  .grpc-event-request-content {
    background-color: ${(props) => props.theme.grpc.timelineItem.request.content};
  }

  .grpc-event-message {
    background-color: ${(props) => props.theme.grpc.timelineItem.message.bg};
  }

  .grpc-event-message-label {
    color: ${(props) => props.theme.grpc.timelineItem.message.label};
  }

  .grpc-event-message-content {
    background-color: ${(props) => props.theme.grpc.timelineItem.message.content};
  }

  .grpc-event-metadata {
    background-color: ${(props) => props.theme.grpc.timelineItem.metadata.bg};
  }

  .grpc-event-metadata-label {
    color: ${(props) => props.theme.grpc.timelineItem.metadata.label};
  }

  .grpc-event-response {
    background-color: ${(props) => props.theme.grpc.timelineItem.response.bg};
  }

  .grpc-event-response-label {
    color: ${(props) => props.theme.grpc.timelineItem.response.label};
  }

  .grpc-event-response-content {
    background-color: ${(props) => props.theme.grpc.timelineItem.response.content};
  }

  .grpc-event-status {
    background-color: ${(props) => props.theme.grpc.timelineItem.status.bg};
  }

  .grpc-event-status-label {
    color: ${(props) => props.theme.grpc.timelineItem.status.label};
  }

  .grpc-event-error {
    background-color: ${(props) => props.theme.grpc.timelineItem.error.bg};
  }

  .grpc-event-error-label {
    color: ${(props) => props.theme.grpc.timelineItem.error.label};
  }

  .grpc-event-end {
    background-color: ${(props) => props.theme.grpc.timelineItem.end.bg};
  }

  .grpc-event-cancel {
    background-color: ${(props) => props.theme.grpc.timelineItem.cancel.bg};
  }

  .grpc-event-cancel-label {
    color: ${(props) => props.theme.grpc.timelineItem.cancel.label};
  }

  .grpc-method-badge {
    background-color: ${(props) => props.theme.grpc.timelineItem.methodBadge.bg};
    color: ${(props) => props.theme.grpc.timelineItem.methodBadge.text};
  }
`;

export default StyledWrapper;
