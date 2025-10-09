import type { ExtractedContent } from '@/types/content';

/**
 * Popup UI 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const resultDiv = document.getElementById('result') as HTMLDivElement;

  // Extract 버튼 클릭
  extractBtn.addEventListener('click', async () => {
    extractBtn.disabled = true;
    extractBtn.textContent = 'Extracting...';

    try {
      const result = await extractContent();
      displayResult(resultDiv, result);
    } catch (error) {
      displayError(resultDiv, error);
    } finally {
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Content';
    }
  });

  // Clear 버튼 클릭
  clearBtn.addEventListener('click', () => {
    resultDiv.innerHTML = '';
  });
});

/**
 * 현재 탭에서 콘텐츠 추출
 */
async function extractContent(): Promise<ExtractedContent> {
  // 현재 활성 탭 가져오기
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error('No active tab found');
  }

  // Content Script에 메시지 전송
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'EXTRACT_CONTENT',
    options: {
      minTextLength: 10,
      minImageSize: { width: 100, height: 100 },
    },
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to extract content');
  }

  return response.data;
}

/**
 * 결과 표시
 */
function displayResult(
  container: HTMLDivElement,
  content: ExtractedContent
): void {
  const stats = `
    <div class="stats">
      <div class="stat-item">
        <div class="stat-label">Texts</div>
        <div class="stat-value">${content.texts.length}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Images</div>
        <div class="stat-value">${content.images.length}</div>
      </div>
    </div>
  `;

  const imagesGallery = content.images
    .map(
      (img, index) => `
        <div class="image-item">
          <img src="${img.src}" alt="${img.alt}" loading="lazy" />
          <div class="image-info">
            <div><strong>#${index + 1}</strong></div>
            <div>${img.width}x${img.height}</div>
            ${img.alt ? `<div class="image-alt">${img.alt}</div>` : ''}
          </div>
        </div>
      `
    )
    .join('');

  const preview = `
    <h3>URL</h3>
    <pre>${content.url}</pre>
    <h3 style="margin-top: 12px;">Title</h3>
    <pre>${content.title}</pre>

    <h3 style="margin-top: 12px;">Images Preview (${content.images.length})</h3>
    <div class="images-gallery">
      ${imagesGallery}
    </div>

    <h3 style="margin-top: 12px;">All Images</h3>
    <pre>${JSON.stringify(content.images, null, 2)}</pre>

    <h3 style="margin-top: 12px;">All Texts</h3>
    <pre>${JSON.stringify(content.texts, null, 2)}</pre>
  `;

  container.innerHTML = `
    <div class="result success">
      ${stats}
      ${preview}
    </div>
  `;

  // 콘솔에 전체 데이터 출력
  console.log('Extracted Content:', content);
}

/**
 * 에러 표시
 */
function displayError(container: HTMLDivElement, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error';

  container.innerHTML = `
    <div class="result error">
      <h3>Error</h3>
      <pre>${message}</pre>
    </div>
  `;

  console.error('Extract error:', error);
}
