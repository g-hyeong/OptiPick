import type { ExtractedImage, ParserOptions } from '@/types/content';
import { toAbsoluteUrl, getElementPosition, isElementVisible } from '@/utils/domHelpers';
import {
  shouldExtractImage,
  isValidImage,
  IMAGE_FILTER_DEFAULTS,
} from '../filters/imageFilter';

/**
 * CSS background-image에서 URL 추출
 */
function extractBackgroundImageUrl(element: Element): string | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const style = window.getComputedStyle(element);
  const bgImage = style.backgroundImage;

  if (!bgImage || bgImage === 'none') {
    return null;
  }

  // url("...") 또는 url('...') 또는 url(...) 형식에서 URL 추출
  const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
  return match ? match[1] : null;
}

/**
 * img 태그에서 실제 사용될 src 추출 (srcset 포함)
 */
function getImageSrc(img: HTMLImageElement): string[] {
  const sources: string[] = [];

  // 기본 src
  if (img.src) {
    sources.push(img.src);
  }

  // srcset 파싱
  if (img.srcset) {
    const srcsetUrls = img.srcset
      .split(',')
      .map((s) => s.trim().split(/\s+/)[0])
      .filter((url) => url);
    sources.push(...srcsetUrls);
  }

  // data-src, data-lazy-src 등 lazy loading 속성
  const lazySrcAttrs = ['data-src', 'data-lazy-src', 'data-original'];
  lazySrcAttrs.forEach((attr) => {
    const lazySrc = img.getAttribute(attr);
    if (lazySrc) {
      sources.push(lazySrc);
    }
  });

  return sources;
}

/**
 * picture 태그의 source 요소들에서 이미지 추출
 */
function extractPictureSources(picture: HTMLPictureElement): string[] {
  const sources: string[] = [];
  const sourceElements = picture.querySelectorAll('source');

  sourceElements.forEach((source) => {
    if (source.srcset) {
      const srcsetUrls = source.srcset
        .split(',')
        .map((s) => s.trim().split(/\s+/)[0])
        .filter((url) => url);
      sources.push(...srcsetUrls);
    }
  });

  return sources;
}

/**
 * DOM에서 이미지 추출
 */
export function extractImages(options: ParserOptions = {}): ExtractedImage[] {
  const {
    minImageSize = IMAGE_FILTER_DEFAULTS.minSize,
    excludeSelectors = IMAGE_FILTER_DEFAULTS.excludeSelectors,
  } = options;

  const extractedImages: ExtractedImage[] = [];
  const seenUrls = new Set<string>();

  // 1. img 태그에서 추출
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    if (!shouldExtractImage(img, excludeSelectors)) {
      return;
    }

    if (!isValidImage(img, minImageSize)) {
      return;
    }

    const sources = getImageSrc(img);
    sources.forEach((src) => {
      const absoluteUrl = toAbsoluteUrl(src);
      if (seenUrls.has(absoluteUrl)) {
        return;
      }
      seenUrls.add(absoluteUrl);

      extractedImages.push({
        src: absoluteUrl,
        alt: img.alt || '',
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        position: getElementPosition(img),
      });
    });
  });

  // 2. picture 태그에서 추출
  const pictures = document.querySelectorAll('picture');
  pictures.forEach((picture) => {
    if (!isElementVisible(picture)) {
      return;
    }

    const sources = extractPictureSources(picture);
    const img = picture.querySelector('img');

    sources.forEach((src) => {
      const absoluteUrl = toAbsoluteUrl(src);
      if (seenUrls.has(absoluteUrl)) {
        return;
      }
      seenUrls.add(absoluteUrl);

      extractedImages.push({
        src: absoluteUrl,
        alt: img?.alt || '',
        width: 0,
        height: 0,
        position: getElementPosition(picture),
      });
    });
  });

  // 3. CSS background-image에서 추출
  const allElements = document.querySelectorAll('*');
  allElements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    if (!isElementVisible(element)) {
      return;
    }

    const bgUrl = extractBackgroundImageUrl(element);
    if (!bgUrl) {
      return;
    }

    const absoluteUrl = toAbsoluteUrl(bgUrl);
    if (seenUrls.has(absoluteUrl)) {
      return;
    }

    // SVG, 작은 이미지 필터링
    if (bgUrl.includes('.svg') || bgUrl.startsWith('data:image/svg')) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < minImageSize.width || rect.height < minImageSize.height) {
      return;
    }

    seenUrls.add(absoluteUrl);

    extractedImages.push({
      src: absoluteUrl,
      alt: '',
      width: rect.width,
      height: rect.height,
      position: getElementPosition(element),
    });
  });

  return extractedImages.sort((a, b) => a.position - b.position);
}
