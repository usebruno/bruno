import { useMemo } from 'react';
import { Stack, Group, Text, Space, ThemeIcon, Alert, Spoiler } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import classes from './TimelinewNew.module.css';

type RequestTimeline = {
  // RequestInfo
  finalOptions: {
    method: string;
    protocol: string;
    host: string;
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
  responseBody?: string;
  error?: string;
  info?: string;
};

const TimelineItem: React.FC<{ item: RequestTimeline }> = ({ item }) => {
  const requestHeader: string[] = useMemo(() => {
    const port = item.finalOptions.port ? `:${item.finalOptions.protocol}` : '';
    const url = `${item.finalOptions.protocol}//${item.finalOptions.host}${port}${item.finalOptions.path}`;

    const data = [`${item.finalOptions.method} ${url}`];
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

  let requestData;
  if (item.requestBody !== undefined) {
    const truncated = item.requestBody.length >= 2048 ? '... (Truncated)' : '';
    requestData = `data ${item.requestBody}${truncated}`;
  }

  const responseHeader: string[] = useMemo(() => {
    if (!item.statusCode) {
      return ['N/A'];
    }

    const data = [`HTTP/${item.httpVersion} ${item.statusCode} ${item.statusMessage}`];
    for (const [name, value] of Object.entries(item.headers ?? {})) {
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

  let responseData;
  if (item.responseBody !== undefined) {
    const truncated = item.responseBody.length >= 2048 ? '... (Truncated)' : '';
    responseData = `data ${item.responseBody}${truncated}`;
  }

  return (
    <div>
      {requestHeader.map((item, i) => (
        <Text key={item + i} c={'green'} className={classes.wordWrap}>
          <span className={classes.noUserselect}>&gt; </span>
          {item}
        </Text>
      ))}
      {requestData !== undefined ? (
        <Spoiler
          maxHeight={50}
          showLabel={'Show full request data'}
          hideLabel={'Show less'}
          c={'grape'}
          className={classes.wordWrap}
        >
          <span className={classes.noUserselect}>&lt; </span>
          {requestData}
        </Spoiler>
      ) : null}
      <Space h={'xs'} />

      {responseHeader.map((item, i) => (
        <Text key={item + i} c={'grape'} className={classes.wordWrap}>
          <span className={classes.noUserselect}>&lt; </span>
          {item}
        </Text>
      ))}
      {responseData !== undefined ? (
        <Spoiler
          maxHeight={50}
          showLabel={'Show full response data'}
          hideLabel={'Show less'}
          c={'grape'}
          className={classes.wordWrap}
        >
          <span className={classes.noUserselect}>&lt; </span>
          {responseData}
        </Spoiler>
      ) : null}

      {item.error !== undefined ? (
        <Alert variant="light" color="red" radius="xs" title="Error" mt={'xs'} icon={<IconAlertTriangle />}>
          {item.error}
        </Alert>
      ) : null}
      {item.info !== undefined ? (
        <Group pt={'xs'} gap={'xs'}>
          <ThemeIcon size={'xs'} color={'gray'}>
            <IconInfoCircle />
          </ThemeIcon>
          <Text c={'dimmed'}>{item.info}</Text>
        </Group>
      ) : null}
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

  const items = timeline.map((item, index) => {
    return <TimelineItem item={item} key={`${index}-${item.statusCode}`} />;
  });

  return (
    <Stack gap={'xl'} maw={maxWidth}>
      {items}
    </Stack>
  );
};
