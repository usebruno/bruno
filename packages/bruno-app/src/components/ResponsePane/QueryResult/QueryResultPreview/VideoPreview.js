import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import ReactPlayer from 'react-player';

const VideoPreview = React.memo(({ contentType, dataBuffer }) => {
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    const videoType = contentType.split(';')[0];
    const byteArray = Buffer.from(dataBuffer, 'base64');
    const blob = new Blob([byteArray], { type: videoType });
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [contentType, dataBuffer]);

  if (!videoUrl) return <div>{t('RESPONSE_PANE.LOADING_VIDEO')}</div>;

  return (
    <ReactPlayer
      url={videoUrl}
      controls
      muted={true}
      width="100%"
      height="100%"
      onError={(e) => console.error('Error loading video:', e)}
    />
  );
});

export default VideoPreview;
