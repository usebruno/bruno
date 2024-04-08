import { Stack, Title, Accordion } from '@mantine/core';
import { Inspector } from 'react-inspector';
import { useTheme } from 'providers/Theme';

type Logs = { title: string; data: unknown; date: number }[];
type DebugInfo = { stage: string; logs: Logs }[];

export const DebugTab: React.FC<{ debugInfo: DebugInfo; maxWidth: number }> = ({ debugInfo, maxWidth }) => {
  return (
    <Stack w={'100%'} maw={maxWidth}>
      {debugInfo.map(({ stage, logs }) => (
        <>
          <Title order={3}>{stage}</Title>
          <Accordion multiple order={4} defaultValue={logs.map(({ title }) => title)}>
            <LogList logs={logs} />
          </Accordion>
        </>
      ))}
    </Stack>
  );
};

const LogList: React.FC<{ logs: Logs }> = ({ logs }) => {
  const { storedTheme } = useTheme();

  const reactInspectorTheme = storedTheme === 'light' ? 'chromeLight' : 'chromeDark';

  return logs.map(({ title, date, data }) => (
    <Accordion.Item value={title}>
      <Accordion.Control>
        {title} - {new Date(date).toLocaleTimeString()}
      </Accordion.Control>
      <Accordion.Panel>
        <Inspector data={data} table={false} theme={reactInspectorTheme} />
      </Accordion.Panel>
    </Accordion.Item>
  ));
};
