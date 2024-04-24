import { useMemo } from 'react';
import { statusCodesToPhrases } from 'know-your-http-well';
import { Stack, Divider, Group, Text, Space, ThemeIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { ResponseTimings } from 'components/ResponsePane/ResponseTimings';

type RequestTimeline = {
  // RequestInfo
  finalOptions: {
    method: string;
    protocol: string;
    hostname: string;
    port: string;
    path: string;
    headers: Record<string, string[]>;
  };
  requestBody?: string;
  // Response
  responseTime?: number;
  statusCode?: number;
  statusMessage?: String;
  headers?: Record<string, string[]>;
  httpVersion?: string;
  responseBody?: Buffer;
  error?: string;
  info?: string;
};

const TimelineItem: React.FC<{ item: RequestTimeline }> = ({ item }) => {
  const requestData: string[] = useMemo(() => {
    const data = [`${item.finalOptions.method} ${item.finalOptions.hostname}`];
    for (const [name, value] of Object.entries(item.finalOptions.headers)) {
      if (Array.isArray(value)) {
        for (const val of value) {
          data.push(`${name}: ${val}`);
        }
        continue;
      }
      data.push(`${name}: ${value}`);
    }
    return data;
  }, [item.finalOptions]);

  const responseData: string[] = useMemo(() => {
    const data = [`HTTP/${item.httpVersion} ${item.statusCode}`];
    for (const [name, value] of Object.entries(item.headers)) {
      if (!Array.isArray(value)) {
        data.push(`${name}: ${value}`);
        continue;
      }
      for (const val of value) {
        data.push(`${name}: ${val}`);
      }
    }
    return data;
  }, [item.headers]);

  return (
    <div>
      {requestData.map((item, i) => (
        <Text key={item + i} c={'green'} style={{ overflowWrap: 'anywhere' }}>
          <span>&gt; </span>
          {item}
        </Text>
      ))}
      <Space h={'xs'} />
      {responseData.map((item, i) => (
        <Text key={item + i} c={'grape'} style={{ overflowWrap: 'anywhere' }}>
          <span>&lt; </span>
          {item}
        </Text>
      ))}
      <Space h={'xs'} />
      <Group gap={'xs'}>
        <ThemeIcon size={'xs'} color={'gray'}>
          <IconInfoCircle />
        </ThemeIcon>
        <Text c={'dimmed'}>{item.info}</Text>
      </Group>
    </div>
  );
};

type TimelineNewProps = {
  timeline: RequestTimeline[];
  maxWidth?: number;
};

export const TimelineNew: React.FC<TimelineNewProps> = ({ timeline, maxWidth }) => {
  if (!timeline) {
    return <div>No timeline data available</div>;
  }

  const items = timeline.map((item) => {
    return <TimelineItem item={item} />;
  });

  return (
    <Stack gap={'xl'} maw={maxWidth}>
      {items}
    </Stack>
  );
};
