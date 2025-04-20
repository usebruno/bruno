import { htmlTemplateString } from "./online";

const getHmlTemplateString = ({
  dataString, offline
}: {
  dataString: string,
  offline: boolean
}) => {
  return htmlTemplateString(dataString);
}

export default getHmlTemplateString;