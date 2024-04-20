import { Stack, Title, Accordion } from '@mantine/core';
import { Inspector } from 'react-inspector';
import { useTheme } from 'providers/Theme';
import { ResponseTimings } from 'components/ResponsePane/ResponseTimings';

type Logs = { title: string; data: string; date: number }[];
type DebugInfo = { stage: string; logs: Logs }[];

export const DebugTab: React.FC<{ debugInfo: DebugInfo; timings: unknown; maxWidth?: number }> = ({
  debugInfo = [],
  timings,
  maxWidth
}) => {
  return (
    <Stack w={'100%'} maw={maxWidth} gap={'xl'}>
      <ResponseTimings timings={timings} />
      {debugInfo.map(({ stage, logs }) => (
        <div>
          <Title key={stage} order={3} mb={'xs'}>
            {stage}
          </Title>
          <Accordion multiple order={4} defaultValue={logs.map(({ title }) => title)}>
            <LogList logs={logs} />
          </Accordion>
        </div>
      ))}
    </Stack>
  );
};

const LogList: React.FC<{ logs: Logs }> = ({ logs }) => {
  const { storedTheme } = useTheme();

  const reactInspectorTheme = storedTheme === 'light' ? 'chromeLight' : 'chromeDark';

  return logs.map(({ title, date, data }) => (
    <Accordion.Item value={title} key={title}>
      <Accordion.Control>
        {title} - {new Date(date).toLocaleTimeString()}
      </Accordion.Control>
      <Accordion.Panel>
        <Inspector data={data} table={false} theme={reactInspectorTheme} />
      </Accordion.Panel>
    </Accordion.Item>
  ));
};
