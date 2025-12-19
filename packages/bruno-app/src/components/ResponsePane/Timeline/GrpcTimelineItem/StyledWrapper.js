import styled from 'styled-components';

const StyledWrapper = styled.div`
  .grpc-event-request {
    background-color: ${(props) => props.theme.grpcTimelineItem.request.bg};
  }

  .grpc-event-request-label {
    color: ${(props) => props.theme.grpcTimelineItem.request.label};
  }

  .grpc-event-request-content {
    background-color: ${(props) => props.theme.grpcTimelineItem.request.content};
  }

  .grpc-event-message {
    background-color: ${(props) => props.theme.grpcTimelineItem.message.bg};
  }

  .grpc-event-message-label {
    color: ${(props) => props.theme.grpcTimelineItem.message.label};
  }

  .grpc-event-message-content {
    background-color: ${(props) => props.theme.grpcTimelineItem.message.content};
  }

  .grpc-event-metadata {
    background-color: ${(props) => props.theme.grpcTimelineItem.metadata.bg};
  }

  .grpc-event-metadata-label {
    color: ${(props) => props.theme.grpcTimelineItem.metadata.label};
  }

  .grpc-event-response {
    background-color: ${(props) => props.theme.grpcTimelineItem.response.bg};
  }

  .grpc-event-response-label {
    color: ${(props) => props.theme.grpcTimelineItem.response.label};
  }

  .grpc-event-response-content {
    background-color: ${(props) => props.theme.grpcTimelineItem.response.content};
  }

  .grpc-event-status {
    background-color: ${(props) => props.theme.grpcTimelineItem.status.bg};
  }

  .grpc-event-status-label {
    color: ${(props) => props.theme.grpcTimelineItem.status.label};
  }

  .grpc-event-error {
    background-color: ${(props) => props.theme.grpcTimelineItem.error.bg};
  }

  .grpc-event-error-label {
    color: ${(props) => props.theme.grpcTimelineItem.error.label};
  }

  .grpc-event-end {
    background-color: ${(props) => props.theme.grpcTimelineItem.end.bg};
  }

  .grpc-event-cancel {
    background-color: ${(props) => props.theme.grpcTimelineItem.cancel.bg};
  }

  .grpc-event-cancel-label {
    color: ${(props) => props.theme.grpcTimelineItem.cancel.label};
  }

  .grpc-method-badge {
    background-color: ${(props) => props.theme.grpcTimelineItem.methodBadge.bg};
    color: ${(props) => props.theme.grpcTimelineItem.methodBadge.text};
  }
`;

export default StyledWrapper;
