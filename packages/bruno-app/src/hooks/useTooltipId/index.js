import { useId } from 'react';

const useTooltipId = (prefix) => `${prefix}-${useId().replace(/:/g, '')}`;

export default useTooltipId;
