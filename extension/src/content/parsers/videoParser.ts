import type { ExtractedVideo, ParserOptions } from '@/types/content';
import { toAbsoluteUrl, getElementPosition } from '@/utils/domHelpers';
import {
  shouldExtractVideo,
  isValidVideo,
  VIDEO_FILTER_DEFAULTS,
} from '../filters/videoFilter';

/**
 * 비디오의 실제 src 추출
 */
function getVideoSrc(video: HTMLVideoElement): string {
  // video 태그 자체의 src
  if (video.src) {
    return video.src;
  }

  // source 태그에서 src 찾기
  const source = video.querySelector('source');
  if (source?.src) {
    return source.src;
  }

  return '';
}

/**
 * DOM에서 비디오 추출
 */
export function extractVideos(options: ParserOptions = {}): ExtractedVideo[] {
  const { excludeSelectors = VIDEO_FILTER_DEFAULTS.excludeSelectors } = options;

  const extractedVideos: ExtractedVideo[] = [];
  const videos = document.querySelectorAll('video');

  videos.forEach((video) => {
    // 추출 대상인지 확인
    if (!shouldExtractVideo(video, excludeSelectors)) {
      return;
    }

    // 비디오 유효성 검사
    if (!isValidVideo(video)) {
      return;
    }

    const src = getVideoSrc(video);
    if (!src) {
      return;
    }

    extractedVideos.push({
      src: toAbsoluteUrl(src),
      poster: video.poster ? toAbsoluteUrl(video.poster) : '',
      width: video.videoWidth || video.width || video.clientWidth,
      height: video.videoHeight || video.height || video.clientHeight,
      duration: video.duration || 0,
      position: getElementPosition(video),
    });
  });

  return extractedVideos.sort((a, b) => a.position - b.position);
}
