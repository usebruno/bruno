import { useMemo } from 'react';
import { statusCodesToPhrases } from 'know-your-http-well';
import { Stack, Divider, Group, Text, Space, ThemeIcon } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons';

type RequestTimeline = {
  requestMethod: string;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  responseHeader: Record<string, string | string[] | undefined>;
  statusCode: number;
  info: string;
};

const TimelineItem: React.FC<{ item: RequestTimeline }> = ({ item }) => {
  const requestData: string[] = useMemo(() => {
    const data = [`${item.requestMethod} ${item.requestUrl}`];
    for (const [name, value] of Object.entries(item.requestHeaders)) {
      if (value === undefined) {
        continue;
      }
      data.push(`${name}: ${value}`);
    }
    return data;
  }, []);

  const responseData: string[] = useMemo(() => {
    const data = [`${item.statusCode} ${statusCodesToPhrases[item.statusCode] ?? ''}`];
    for (const [name, value] of Object.entries(item.responseHeader)) {
      if (!Array.isArray(value)) {
        data.push(`${name}: ${value}`);
        continue;
      }
      for (const val of value) {
        data.push(`${name}: ${val}`);
      }
    }
    return data;
  }, []);

  return (
    <div>
      {requestData.map((item) => (
        <Text c={'green'} style={{ overflowWrap: 'anywhere' }}>
          <span>&gt; </span>
          {item}
        </Text>
      ))}
      <Space h={'md'} />
      {responseData.map((item) => (
        <Text c={'grape'} style={{ overflowWrap: 'anywhere' }}>
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

export const TimelineNew: React.FC<{ timeline: RequestTimeline[]; maxWidth: number }> = ({ timeline, maxWidth }) => {
  const items = timeline.map((item) => {
    return <TimelineItem item={item} />;
  });

  return (
    <Stack gap={'xl'} maw={maxWidth}>
      {items}
    </Stack>
  );
};
