import { Title, Text, Stack, Table } from '@mantine/core';

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
      <Table maw={'20rem'}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Duration</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <TimingRow title="Pre-Request script" timing={timings.postScript} />
          <TimingRow title="Request" timing={timings.request} />
          <TimingRow title="Post-Request script" timing={timings.postScript} />
          <TimingRow title="Test" timing={timings.test} />
          <TimingRow title="Total" timing={timings.total} />
        </Table.Tbody>
      </Table>
    </Stack>
  );
};

const TimingRow: React.FC<{ timing?: number; title: string }> = ({ timing, title }) => {
  return (
    <Table.Tr>
      <Table.Td>{title}</Table.Td>
      <Table.Td>{timing != undefined ? `${timing} ms` : 'Not executed'}</Table.Td>
    </Table.Tr>
  );
};
