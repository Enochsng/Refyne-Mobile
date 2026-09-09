import React, { useEffect } from 'react';
import { createVideoPlayer, useVideoPlayer, VideoView } from 'expo-video';

export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'fill',
};

function mapContentFit(resizeMode) {
  if (resizeMode === ResizeMode.COVER || resizeMode === 'cover') return 'cover';
  if (resizeMode === ResizeMode.STRETCH || resizeMode === 'stretch' || resizeMode === 'fill') {
    return 'fill';
  }
  return 'contain';
}

export function Video({
  source,
  style,
  resizeMode = ResizeMode.CONTAIN,
  shouldPlay = false,
  isLooping = false,
  isMuted = false,
  useNativeControls = false,
}) {
  const uri = typeof source === 'string' ? source : source?.uri ?? null;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = !!isLooping;
    p.muted = !!isMuted;
    if (shouldPlay) {
      p.play();
    } else {
      p.pause();
    }
  });

  useEffect(() => {
    player.loop = !!isLooping;
    player.muted = !!isMuted;
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, shouldPlay, isLooping, isMuted]);

  if (!uri) {
    return null;
  }

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={mapContentFit(resizeMode)}
      nativeControls={!!useNativeControls}
      pointerEvents={useNativeControls ? 'auto' : 'none'}
    />
  );
}

export async function getVideoDurationAsync(uri) {
  if (!uri) return null;

  const player = createVideoPlayer(uri);
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      let subscription;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription?.remove();
        callback(value);
      };

      const timeout = setTimeout(() => {
        finish(reject, new Error('Timed out reading video duration'));
      }, 8000);

      subscription = player.addListener('statusChange', ({ status, error }) => {
        if (status === 'readyToPlay') {
          finish(resolve, player.duration);
        } else if (status === 'error') {
          finish(reject, error || new Error('Failed to load video'));
        }
      });

      if (player.status === 'readyToPlay') {
        finish(resolve, player.duration);
      }
    });
  } finally {
    player.release();
  }
}

export default Video;
