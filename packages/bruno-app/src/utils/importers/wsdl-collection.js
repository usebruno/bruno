import fileDialog from 'file-dialog';
import { BrunoError } from 'utils/common/error';
import { wsdlToBruno } from '@usebruno/converters';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        // WSDL files are XML, so we read them as text
        const wsdlContent = e.target.result;
        resolve(wsdlContent);
      } catch (error) {
        console.error('Error reading the file:', error);
        reject(new BrunoError('Import WSDL collection failed'));
      }
    };
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: '.wsdl, .xml' })
      .then(readFile)
      .then((wsdlContent) => wsdlToBruno(wsdlContent))
      .then((collection) => resolve({ collection }))
      .catch((err) => {
        console.error(err);
        reject(new BrunoError('Import WSDL collection failed: ' + err.message));
      });
  });
};

export default importCollection; 