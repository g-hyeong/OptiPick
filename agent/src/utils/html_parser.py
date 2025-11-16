"""HTML 파싱 유틸리티

Extension의 textParser.ts와 imageParser.ts 로직을 Python으로 이식
BeautifulSoup을 사용하여 HTML body에서 텍스트와 이미지를 추출
"""

from typing import List
from bs4 import BeautifulSoup, Tag
from urllib.parse import urljoin

from ..graphs.summarize_page.state import ExtractedText, ExtractedImage


class HTMLContentExtractor:
    """HTML에서 텍스트와 이미지를 추출하는 유틸리티 클래스

    텍스트 추출: CSS Selector를 사용한 Leaf Node 방식
    - 태그 하드코딩 불필요 (자동으로 모든 태그 처리)
    - 부모-자식 중복 자동 방지
    """

    # Extension의 textFilter.ts DEFAULT_EXCLUDE_TAGS와 동일
    EXCLUDE_TAGS = [
        'script', 'style', 'noscript', 'iframe',
        'svg', 'path', 'meta', 'link', 'head',
    ]

    # Extension의 textFilter.ts DEFAULT_EXCLUDE_SELECTORS와 동일
    EXCLUDE_SELECTORS = [
        'nav', 'header', 'footer',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.advertisement', '.ad', '.ads',
        '.sidebar', '.menu', '.navigation',
        '#cookie-notice', '#cookie-banner',
    ]

    @staticmethod
    def extract_texts(
        html_body: str,
        min_length: int = 10,
        base_url: str = ""
    ) -> List[ExtractedText]:
        """HTML body에서 텍스트 추출 - Leaf Node 방식

        CSS Selector ':not(:has(*))'를 사용하여 자식 태그가 없는 요소(leaf node)만 추출.
        부모-자식 중복을 자동으로 방지하며, 태그 하드코딩이 불필요합니다.
        (BeautifulSoup best practice - 2024)

        동작 원리:
        - <div><p><span>텍스트</span></p></div> 구조에서
        - span만 추출 (p, div는 자식이 있으므로 제외)
        - 구조적으로 중복 불가능

        Args:
            html_body: 정제된 HTML body 문자열
            min_length: 최소 텍스트 길이 (기본: 10)
            base_url: 기본 URL (상대 경로 처리용, 선택사항)

        Returns:
            추출된 텍스트 목록 (중복 제거됨)
        """
        soup = BeautifulSoup(html_body, 'lxml')
        texts: List[ExtractedText] = []
        seen_texts = set()  # 텍스트 내용 기반 중복 제거 (안전장치)
        position = 0

        # CSS Selector로 leaf node만 선택 (자식 태그가 없는 요소)
        leaf_elements = soup.select("*:not(:has(*))")

        for element in leaf_elements:
            # 추출 대상인지 확인
            if not HTMLContentExtractor._should_extract_text(element):
                continue

            # 텍스트 추출
            text_content = element.get_text(strip=True)
            if not text_content:
                continue

            # 텍스트 유효성 검사
            if not HTMLContentExtractor._is_valid_text(text_content, min_length):
                continue

            # 텍스트 정리
            cleaned_text = HTMLContentExtractor._clean_text(text_content)

            # 중복 텍스트 제거 (안전장치)
            if cleaned_text in seen_texts:
                continue

            # 텍스트 추가
            texts.append(ExtractedText(
                content=cleaned_text,
                tagName=element.name,
                position=position
            ))

            seen_texts.add(cleaned_text)
            position += 100  # DOM 순서 기반 position

        return texts

    @staticmethod
    def extract_images(
        html_body: str,
        base_url: str = "",
        min_width: int = 100,
        min_height: int = 100
    ) -> List[ExtractedImage]:
        """HTML body에서 이미지 추출 (Extension의 imageParser.ts 로직 이식)

        Args:
            html_body: 정제된 HTML body 문자열
            base_url: 기본 URL (상대 경로를 절대 경로로 변환)
            min_width: 최소 이미지 너비 (기본: 100)
            min_height: 최소 이미지 높이 (기본: 100)

        Returns:
            추출된 이미지 목록
        """
        soup = BeautifulSoup(html_body, 'lxml')
        images: List[ExtractedImage] = []
        seen_urls = set()
        position = 0

        # 1. img 태그에서 추출
        img_tags = soup.find_all('img')
        for img in img_tags:
            if not HTMLContentExtractor._should_extract_image(img):
                continue

            sources = HTMLContentExtractor._get_image_sources(img)
            for src in sources:
                absolute_url = urljoin(base_url, src) if base_url else src
                if absolute_url in seen_urls:
                    continue
                seen_urls.add(absolute_url)

                images.append(ExtractedImage(
                    src=absolute_url,
                    alt=img.get('alt', ''),
                    width=0,  # HTML에서는 실제 렌더링 크기를 알 수 없음
                    height=0,
                    position=position,
                    ocr_result=""  # OCR은 나중에 별도 노드에서 수행
                ))
                position += 100

        # 2. picture 태그에서 추출
        picture_tags = soup.find_all('picture')
        for picture in picture_tags:
            sources = HTMLContentExtractor._extract_picture_sources(picture)
            img = picture.find('img')

            for src in sources:
                absolute_url = urljoin(base_url, src) if base_url else src
                if absolute_url in seen_urls:
                    continue
                seen_urls.add(absolute_url)

                images.append(ExtractedImage(
                    src=absolute_url,
                    alt=img.get('alt', '') if img else '',
                    width=0,
                    height=0,
                    position=position,
                    ocr_result=""
                ))
                position += 100

        return images

    # ========== Private Helper Methods ==========

    @staticmethod
    def _should_extract_text(element: Tag) -> bool:
        """텍스트 추출 대상 여부 확인 (Extension의 textFilter.ts 이식)"""
        # 제외 태그 확인
        if element.name in HTMLContentExtractor.EXCLUDE_TAGS:
            return False

        # 제외 선택자 확인
        for selector in HTMLContentExtractor.EXCLUDE_SELECTORS:
            try:
                # CSS 선택자로 부모 찾기
                if element.find_parent(selector.lstrip('[').rstrip(']').split('=')[0]):
                    return False
                # 클래스/ID 선택자
                if selector.startswith('.'):
                    if selector[1:] in element.get('class', []):
                        return False
                elif selector.startswith('#'):
                    if element.get('id') == selector[1:]:
                        return False
            except:
                pass  # 잘못된 선택자는 무시

        return True

    @staticmethod
    def _should_extract_image(element: Tag) -> bool:
        """이미지 추출 대상 여부 확인 (Extension의 imageFilter.ts 이식)"""
        # 제외 선택자 확인
        for selector in HTMLContentExtractor.EXCLUDE_SELECTORS:
            try:
                if selector.startswith('.'):
                    if selector[1:] in element.get('class', []):
                        return False
                elif selector.startswith('#'):
                    if element.get('id') == selector[1:]:
                        return False
            except:
                pass

        return True

    @staticmethod
    def _is_duplicate_of_parent(element: Tag, text_content: str, processed_elements: set) -> bool:
        """부모 요소가 동일한 텍스트를 이미 추출했는지 확인 (중복 방지)

        DEPRECATED: 이 함수는 더 이상 사용되지 않습니다.
        extract_texts()에서 텍스트 내용 기반 중복 제거(seen_texts set)로 대체되었습니다.
        호환성을 위해 유지되지만, 향후 제거될 수 있습니다.

        Args:
            element: 현재 처리 중인 요소
            text_content: 현재 요소의 텍스트
            processed_elements: 이미 처리된 요소들의 ID set

        Returns:
            중복이면 True, 아니면 False
        """
        parent = element.parent
        while parent:
            # 부모가 이미 처리되었고, 텍스트가 같으면 중복으로 판단
            if id(parent) in processed_elements:
                parent_text = parent.get_text(strip=True)
                if parent_text == text_content:
                    return True
            parent = parent.parent
        return False

    @staticmethod
    def _get_direct_text(element: Tag) -> str:
        """요소의 직접적인 텍스트만 추출 (자식 요소 제외)
        Extension의 textParser.ts getDirectTextContent 이식
        [Note] 현재는 사용되지 않지만 호환성을 위해 유지
        """
        text = ''
        for node in element.children:
            # 텍스트 노드만 추출 (NavigableString)
            if isinstance(node, str):
                text += node
        return text.strip()

    @staticmethod
    def _is_valid_text(text: str, min_length: int) -> bool:
        """텍스트 유효성 검사 (Extension의 textFilter.ts isValidText 이식)"""
        cleaned = HTMLContentExtractor._clean_text(text)

        if len(cleaned) < min_length:
            return False

        # 숫자만 있는 텍스트 제거
        if cleaned.isdigit():
            return False

        # 특수문자만 있는 텍스트 제거 (간단한 검사)
        if all(not c.isalnum() and not c.isspace() for c in cleaned):
            return False

        return True

    @staticmethod
    def _clean_text(text: str) -> str:
        """텍스트 정리 (Extension의 domHelpers.ts cleanTextContent 이식)"""
        import re
        # 연속된 공백을 하나로
        cleaned = re.sub(r'\s+', ' ', text)
        return cleaned.strip()

    @staticmethod
    def _get_image_sources(img: Tag) -> List[str]:
        """img 태그에서 모든 소스 추출 (src, srcset, data-src 등)
        Extension의 imageParser.ts getImageSrc 이식
        """
        sources = []

        # 기본 src
        if img.get('src'):
            sources.append(img['src'])

        # srcset 파싱
        if img.get('srcset'):
            srcset_urls = [
                s.strip().split()[0]
                for s in img['srcset'].split(',')
                if s.strip()
            ]
            sources.extend(srcset_urls)

        # lazy loading 속성
        for attr in ['data-src', 'data-lazy-src', 'data-original']:
            if img.get(attr):
                sources.append(img[attr])

        return sources

    @staticmethod
    def _extract_picture_sources(picture: Tag) -> List[str]:
        """picture 태그의 source 요소들에서 이미지 추출
        Extension의 imageParser.ts extractPictureSources 이식
        """
        sources = []
        source_elements = picture.find_all('source')

        for source in source_elements:
            if source.get('srcset'):
                srcset_urls = [
                    s.strip().split()[0]
                    for s in source['srcset'].split(',')
                    if s.strip()
                ]
                sources.extend(srcset_urls)

        return sources


# ========== Convenience Functions ==========

def extract_content_from_html(
    html_body: str,
    base_url: str = "",
    min_text_length: int = 10,
    min_image_width: int = 100,
    min_image_height: int = 100
) -> tuple[List[ExtractedText], List[ExtractedImage]]:
    """HTML body에서 텍스트와 이미지를 한번에 추출

    Args:
        html_body: 정제된 HTML body
        base_url: 기본 URL (상대 경로 처리용)
        min_text_length: 최소 텍스트 길이
        min_image_width: 최소 이미지 너비
        min_image_height: 최소 이미지 높이

    Returns:
        (텍스트 목록, 이미지 목록) 튜플
    """
    texts = HTMLContentExtractor.extract_texts(
        html_body=html_body,
        min_length=min_text_length,
        base_url=base_url
    )

    images = HTMLContentExtractor.extract_images(
        html_body=html_body,
        base_url=base_url,
        min_width=min_image_width,
        min_height=min_image_height
    )

    return texts, images
