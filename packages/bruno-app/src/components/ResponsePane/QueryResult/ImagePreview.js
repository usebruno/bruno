import { useRef } from 'react';
import { useEffect } from 'react';

const ImagePreview = ({ data, contentType }) => {
  const imgRef = useRef(null);

  useEffect(() => {
    imgRef.current.src = 'data:image/png;base64,' + Buffer.from(data).toString('base64');
    // const blob = new Blob([encodeURIComponent(data)], {
    //   type: contentType,
    // })
    // var reader = new FileReader();
    // reader.onloadend = function () {
    //   console.log(reader.result, reader.result.length)
    //   imgRef.current.src = reader.result;
    // };
    // reader.readAsDataURL(blob);
  }, [data]);

  return (
    <div className="grid content-center justify-center">
      <img ref={imgRef} />
    </div>
  );
};

export default ImagePreview;
