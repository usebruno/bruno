import { Timeline, Title, Text, Stack } from '@mantine/core';

type ResponseTimingsProps = {
  timings: {
    total?: number;
    request?: number;
    preScript?: number;
    postScript?: number;
    test?: number;
  };
};

export const ResponseTimings: React.FC<ResponseTimingsProps> = ({ timings }) => {
  if (!timings.total) {
    return null;
  }

  return (
    <Stack gap={'xs'}>
      <Title order={3}>Timings</Title>
      <Text size={'md'} c={'dimmed'}>
        Total time: {timings.total}ms
      </Text>
      <Timeline active={Object.keys(timings).length - 2}>
        {timings.preScript !== undefined ? (
          <Timeline.Item title={`Pre-Request script: ${timings.preScript}ms`} />
        ) : (
          <Timeline.Item title={`Pre-Request script: Not executed`} />
        )}

        {timings.request !== undefined ? (
          <Timeline.Item title={`Request: ${timings.request}ms`} />
        ) : (
          <Timeline.Item title={`Request: Not executed`} />
        )}

        {timings.postScript !== undefined ? (
          <Timeline.Item title={`Post-Request script: ${timings.postScript}ms`} />
        ) : (
          <Timeline.Item title={`Post-Request script: Not executed`} />
        )}

        {timings.test !== undefined ? (
          <Timeline.Item title={`Tests: ${timings.test}ms`} />
        ) : (
          <Timeline.Item title={`Tests: Not executed`} />
        )}
      </Timeline>
    </Stack>
  );
};
