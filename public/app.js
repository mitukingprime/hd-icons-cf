/* ========================================================================
   HD Icons — Cloudflare Edition — Frontend
   ======================================================================== */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let allIcons = [];
let filteredIcons = [];
let currentType = 'all';
let currentSearch = '';
let renderedCount = 0;
const BATCH_SIZE = 60;
let isLoading = false;
let observer = null;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const grid = $('#iconsGrid');
const loading = $('#loading');
const empty = $('#empty');
const emptyHint = $('#emptyHint');
const searchInput = $('#searchInput');
const searchCount = $('#searchCount');
const totalBadge = $('#totalBadge');
const uploadBtn = $('#uploadBtn');
const themeBtn = $('#themeBtn');
const backToTop = $('#backToTop');
const uploadModal = $('#uploadModal');
const uploadModalClose = $('#uploadModalClose');
const uploadZone = $('#uploadZone');
const fileInput = $('#fileInput');
const uploadProgress = $('#uploadProgress');
const progressFill = $('#progressFill');
const uploadStatus = $('#uploadStatus');
const previewModal = $('#previewModal');
const previewModalClose = $('#previewModalClose');
const previewImage = $('#previewImage');
const previewName = $('#previewName');
const previewCopy = $('#previewCopy');
const toast = $('#toast');

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('hd-icons-theme');
  const prefer = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', prefer);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('hd-icons-theme', next);
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2000);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function handleAuthError() {
  showToast('需要登录后才能执行此操作', 'error');
  setTimeout(() => {
    window.location.href = '/api/upload';
  }, 1500);
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
function getDisplayUrl(icon) {
  if (icon.type === 'upload') {
    return `${location.origin}/r2/upload/${icon.name}`;
  }
  if (icon.url.startsWith('/')) {
    return `${location.origin}${icon.url}`;
  }
  return icon.url;
}

function getThumbnailUrl(icon) {
  return getDisplayUrl(icon);
}

function getCopyUrl(icon) {
  return getDisplayUrl(icon);
}

// ---------------------------------------------------------------------------
// Load Icons
// ---------------------------------------------------------------------------
async function loadIcons() {
  loading.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = '';
  renderedCount = 0;

  try {
    const [iconsResp, statsResp] = await Promise.all([
      fetch('/api/icons'),
      fetch('/api/stats'),
    ]);

    const iconsData = await iconsResp.json();
    const stats = await statsResp.json();

    allIcons = iconsData.icons || [];

    totalBadge.textContent = stats.total || allIcons.length;
    updateCounts(stats);

    if (allIcons.length === 0) {
      loading.style.display = 'none';
      empty.style.display = '';
      emptyHint.textContent = '暂无图标数据';
      return;
    }

    applyFilter();
  } catch (e) {
    console.error('Failed to load icons:', e);
    loading.style.display = 'none';
    empty.style.display = '';
    emptyHint.textContent = '加载失败，请刷新重试';
  }
}

function updateCounts(stats) {
  const ids = ['border-radius', 'circle', 'svg', 'upload'];
  ids.forEach((id) => {
    const el = $(`#count-${id}`);
    if (el) el.textContent = stats[id] || 0;
  });
}

// ---------------------------------------------------------------------------
// Filter & Render
// ---------------------------------------------------------------------------
function applyFilter() {
  const search = currentSearch.toLowerCase();
  filteredIcons = allIcons.filter((icon) => {
    if (currentType !== 'all' && icon.type !== currentType) return false;
    if (search && !icon.name.toLowerCase().includes(search)) return false;
    return true;
  });

  searchCount.textContent = filteredIcons.length > 0
    ? `${filteredIcons.length} 个图标`
    : '';

  renderedCount = 0;
  grid.innerHTML = '';
  loading.style.display = 'none';

  if (filteredIcons.length === 0) {
    empty.style.display = '';
    emptyHint.textContent = currentSearch ? '没有匹配的图标' : '该分类下暂无图标';
    return;
  }

  empty.style.display = 'none';
  renderBatch();
  setupInfiniteScroll();
}

function renderBatch() {
  if (renderedCount >= filteredIcons.length) return;

  const end = Math.min(renderedCount + BATCH_SIZE, filteredIcons.length);
  const fragment = document.createDocumentFragment();

  for (let i = renderedCount; i < end; i++) {
    fragment.appendChild(createCard(filteredIcons[i]));
  }

  grid.appendChild(fragment);
  renderedCount = end;
}

function createCard(icon) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.name = icon.name;

  const thumbUrl = getThumbnailUrl(icon);

  card.innerHTML = `
    <span class="card-type-badge">${icon.type}</span>
    <div class="card-actions">
      <button class="btn btn-icon copy-btn" title="复制地址">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <button class="btn btn-icon preview-btn" title="放大预览">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      ${icon.type === 'upload' ? `<button class="btn btn-icon btn-danger delete-btn" title="删除">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>` : ''}
    </div>
    <img src="${thumbUrl}" alt="${icon.name}" loading="lazy" width="72" height="72" onerror="this.style.opacity='0.3'" />
    <span class="card-name" title="${icon.name}">${icon.name}</span>
  `;

  // Copy
  card.querySelector('.copy-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(getCopyUrl(icon));
  });

  // Preview
  card.querySelector('.preview-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openPreview(icon);
  });

  // Delete (upload only)
  const delBtn = card.querySelector('.delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteIcon(icon);
    });
  }

  // Click card to copy
  card.addEventListener('click', () => {
    copyToClipboard(getCopyUrl(icon));
  });

  return card;
}

// ---------------------------------------------------------------------------
// Infinite scroll
// ---------------------------------------------------------------------------
function setupInfiniteScroll() {
  if (observer) observer.disconnect();

  const sentinel = document.createElement('div');
  sentinel.style.height = '1px';
  grid.parentElement.appendChild(sentinel);

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && renderedCount < filteredIcons.length) {
      renderBatch();
    }
  }, { rootMargin: '400px' });

  observer.observe(sentinel);
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('已复制到剪贴板');
  }
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------
function openPreview(icon) {
  previewImage.src = getDisplayUrl(icon);
  previewName.textContent = icon.name;
  previewCopy.onclick = () => copyToClipboard(getCopyUrl(icon));
  previewModal.classList.add('open');
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
function openUploadModal() {
  uploadModal.classList.add('open');
  uploadProgress.style.display = 'none';
  progressFill.style.width = '0%';
}

async function handleUpload(files) {
  if (!files.length) return;

  uploadProgress.style.display = '';
  uploadStatus.textContent = `上传中 (0/${files.length})...`;
  progressFill.style.width = '0%';

  const formData = new FormData();
  for (const file of files) {
    formData.append('file', file);
  }

  try {
    progressFill.style.width = '50%';
    const resp = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (resp.status === 401) {
      handleAuthError();
      return;
    }

    const data = await resp.json();

    if (data.status === 'success') {
      progressFill.style.width = '100%';
      uploadStatus.textContent = `上传成功！共 ${data.uploaded.length} 个文件`;
      showToast(`上传成功 ${data.uploaded.length} 个文件`);
      setTimeout(() => {
        uploadModal.classList.remove('open');
        loadIcons();
      }, 1000);
    } else {
      showToast(data.message || '上传失败', 'error');
    }
  } catch (e) {
    showToast('上传失败: ' + e.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
async function deleteIcon(icon) {
  if (!confirm(`确定要删除 ${icon.name} 吗？`)) return;

  try {
    const resp = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: icon.name }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      handleAuthError();
      return;
    }

    const data = await resp.json();

    if (data.status === 'success') {
      showToast('删除成功');
      allIcons = allIcons.filter((i) => i.name !== icon.name);
      applyFilter();
    } else {
      showToast(data.message || '删除失败', 'error');
    }
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
function init() {
  initTheme();

  themeBtn.addEventListener('click', toggleTheme);
  uploadBtn.addEventListener('click', openUploadModal);
  uploadModalClose.addEventListener('click', () => uploadModal.classList.remove('open'));
  previewModalClose.addEventListener('click', () => previewModal.classList.remove('open'));

  // Close modals on overlay click
  [uploadModal, previewModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Close modals on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      uploadModal.classList.remove('open');
      previewModal.classList.remove('open');
    }
  });

  // Search with debounce
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      applyFilter();
    }, 200);
  });

  // Filter tabs
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      applyFilter();
    });
  });

  // Upload zone
  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleUpload(fileInput.files));
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleUpload(e.dataTransfer.files);
  });

  // Back to top
  window.addEventListener('scroll', () => {
    backToTop.style.display = window.scrollY > 400 ? '' : 'none';
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Keyboard shortcut: Ctrl/Cmd + K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  loadIcons();
}

init();
