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
let allCategories = [];
let statsData = {};
let pendingRenameIcon = null;
let pendingMoveIcon = null;
let renamingCategory = null;
let selectionMode = false;
let selectedIcons = new Set();
let batchMoveMode = false;
let batchProcessing = false;

const CATEGORY_LABELS = {
  'border-radius': '圆角',
  circle: '圆形',
  svg: '矢量',
  upload: '上传',
};

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
const loginBtn = $('#loginBtn');
const logoutBtn = $('#logoutBtn');
const authUser = $('#authUser');
const authUserBtn = $('#authUserBtn');
const authUserName = $('#authUserName');
const authDropdown = $('#authDropdown');
const changePasswordBtn = $('#changePasswordBtn');
const loginModal = $('#loginModal');
const loginModalClose = $('#loginModalClose');
const loginForm = $('#loginForm');
const loginUsername = $('#loginUsername');
const loginPassword = $('#loginPassword');
const loginError = $('#loginError');
const setupModal = $('#setupModal');
const setupModalClose = $('#setupModalClose');
const setupForm = $('#setupForm');
const setupUsername = $('#setupUsername');
const setupPassword = $('#setupPassword');
const setupPasswordConfirm = $('#setupPasswordConfirm');
const setupError = $('#setupError');
const setupSkipBtn = $('#setupSkipBtn');
const changePasswordModal = $('#changePasswordModal');
const changePasswordModalClose = $('#changePasswordModalClose');
const changePasswordForm = $('#changePasswordForm');
const currentPassword = $('#currentPassword');
const newPassword = $('#newPassword');
const newPasswordConfirm = $('#newPasswordConfirm');
const changePasswordError = $('#changePasswordError');
const uploadAuthHint = document.querySelector('.upload-auth-hint');
const filterTabs = $('#filterTabs');
const addCategoryBtn = $('#addCategoryBtn');
const categoryModal = $('#categoryModal');
const categoryModalClose = $('#categoryModalClose');
const categoryForm = $('#categoryForm');
const categoryNameInput = $('#categoryName');
const uploadCategory = $('#uploadCategory');
const renameModal = $('#renameModal');
const renameModalClose = $('#renameModalClose');
const renameForm = $('#renameForm');
const renameInput = $('#renameInput');
const moveModal = $('#moveModal');
const moveModalClose = $('#moveModalClose');
const moveForm = $('#moveForm');
const moveCategory = $('#moveCategory');
const renameCategoryModal = $('#renameCategoryModal');
const renameCategoryModalClose = $('#renameCategoryModalClose');
const renameCategoryForm = $('#renameCategoryForm');
const renameCategoryInput = $('#renameCategoryInput');
const selectBtn = $('#selectBtn');
const batchBar = $('#batchBar');
const batchCount = $('#batchCount');
const batchMoveBtn = $('#batchMoveBtn');
const batchDeleteBtn = $('#batchDeleteBtn');
const batchCancelBtn = $('#batchCancelBtn');
const moveModalTitle = moveModal?.querySelector('.modal-header h2');

// Auth state
let authState = { authenticated: false, needsSetup: false };

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
async function checkAuth() {
  try {
    const resp = await fetch('/api/check-auth', { credentials: 'include' });
    authState = await resp.json();
    updateAuthUI();

    if (authState.needsSetup && !sessionStorage.getItem('setup-dismissed')) {
      openSetupModal();
    }
  } catch {
    authState = { authenticated: false, needsSetup: false };
    updateAuthUI();
  }
}

function updateAuthUI() {
  const authConfigured = !authState.needsSetup;

  if (authConfigured) {
    loginBtn.style.display = authState.authenticated ? 'none' : '';
    authUser.style.display = authState.authenticated ? '' : 'none';
    if (authState.authenticated && authState.username) {
      authUserName.textContent = authState.username;
    }
  } else {
    loginBtn.style.display = 'none';
    authUser.style.display = 'none';
  }

  if (uploadAuthHint) {
    uploadAuthHint.style.display = authConfigured && !authState.authenticated ? '' : 'none';
  }
}

function toggleAuthDropdown(show) {
  if (show === undefined) {
    authDropdown.classList.toggle('open');
  } else if (show) {
    authDropdown.classList.add('open');
  } else {
    authDropdown.classList.remove('open');
  }
}

function openSetupModal() {
  setupError.style.display = 'none';
  setupError.textContent = '';
  setupForm.reset();
  setupModal.classList.add('open');
  setTimeout(() => setupUsername.focus(), 100);
}

function closeSetupModal() {
  setupModal.classList.remove('open');
}

function dismissSetupModal() {
  sessionStorage.setItem('setup-dismissed', '1');
  closeSetupModal();
}

function openLoginModal() {
  loginError.style.display = 'none';
  loginError.textContent = '';
  loginForm.reset();
  loginModal.classList.add('open');
  setTimeout(() => loginUsername.focus(), 100);
}

function closeLoginModal() {
  loginModal.classList.remove('open');
}

function openChangePasswordModal() {
  toggleAuthDropdown(false);
  changePasswordError.style.display = 'none';
  changePasswordError.textContent = '';
  changePasswordForm.reset();
  changePasswordModal.classList.add('open');
  setTimeout(() => currentPassword.focus(), 100);
}

function closeChangePasswordModal() {
  changePasswordModal.classList.remove('open');
}

function handleAuthError(message) {
  showToast(message || '需要登录后才能执行此操作', 'error');
  openLoginModal();
}

async function handleLogin(e) {
  e.preventDefault();
  loginError.style.display = 'none';

  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginUsername.value,
        password: loginPassword.value,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (resp.ok && data.status === 'success') {
      closeLoginModal();
      showToast('登录成功');
      await checkAuth();
    } else {
      loginError.textContent = data.message || '登录失败';
      loginError.style.display = '';
    }
  } catch (err) {
    loginError.textContent = '登录失败: ' + err.message;
    loginError.style.display = '';
  }
}

async function handleLogout() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    toggleAuthDropdown(false);
    showToast('已退出登录');
    await checkAuth();
  } catch {
    showToast('退出失败', 'error');
  }
}

async function handleSetup(e) {
  e.preventDefault();
  setupError.style.display = 'none';

  if (setupPassword.value !== setupPasswordConfirm.value) {
    setupError.textContent = '两次输入的密码不一致';
    setupError.style.display = '';
    return;
  }

  if (setupPassword.value.length < 6) {
    setupError.textContent = '密码长度至少 6 个字符';
    setupError.style.display = '';
    return;
  }

  try {
    const resp = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: setupUsername.value,
        password: setupPassword.value,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (resp.ok && data.status === 'success') {
      sessionStorage.removeItem('setup-dismissed');
      closeSetupModal();
      showToast('设置成功');
      await checkAuth();
    } else {
      setupError.textContent = data.message || '设置失败';
      setupError.style.display = '';
    }
  } catch (err) {
    setupError.textContent = '设置失败: ' + err.message;
    setupError.style.display = '';
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  changePasswordError.style.display = 'none';

  if (newPassword.value !== newPasswordConfirm.value) {
    changePasswordError.textContent = '两次输入的新密码不一致';
    changePasswordError.style.display = '';
    return;
  }

  if (newPassword.value.length < 6) {
    changePasswordError.textContent = '新密码长度至少 6 个字符';
    changePasswordError.style.display = '';
    return;
  }

  try {
    const resp = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (resp.ok && data.status === 'success') {
      closeChangePasswordModal();
      showToast('密码修改成功');
    } else {
      changePasswordError.textContent = data.message || '修改失败';
      changePasswordError.style.display = '';
    }
  } catch (err) {
    changePasswordError.textContent = '修改失败: ' + err.message;
    changePasswordError.style.display = '';
  }
}

function getCategoryLabel(name) {
  const cat = allCategories.find((c) => c.name === name);
  if (cat && cat.label && cat.label !== cat.name) return cat.label;
  return CATEGORY_LABELS[name] || name;
}

function isUploadedIcon(icon) {
  return icon.builtin === false || icon.url?.startsWith('__R2__/');
}

function getCustomCategories() {
  return allCategories.filter((c) => !c.builtin);
}

function getDisplayUrl(icon) {
  if (icon.url && icon.url.startsWith('__R2__/')) {
    const path = icon.url.replace('__R2__/', '');
    return `${location.origin}/r2/${path}`;
  }
  if (icon.url && icon.url.startsWith('/')) {
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

function getIconKey(icon) {
  const category = icon.category || icon.type || 'upload';
  return `${category}/${icon.name}`;
}

function findIconByKey(key) {
  const [category, ...nameParts] = key.split('/');
  const name = nameParts.join('/');
  return allIcons.find(
    (i) => i.name === name && (i.category || i.type || 'upload') === category,
  );
}

// ---------------------------------------------------------------------------
// Selection mode
// ---------------------------------------------------------------------------
function toggleSelectionMode(forceOff) {
  if (batchProcessing) return;

  if (forceOff || selectionMode) {
    selectionMode = false;
    selectedIcons.clear();
    document.body.classList.remove('selection-mode');
    batchBar.style.display = 'none';
    batchBar.classList.remove('visible');
    selectBtn.classList.remove('active');
    selectBtn.title = '批量选择';
    selectBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    `;
    syncAllCardSelectionUI();
    return;
  }

  selectionMode = true;
  document.body.classList.add('selection-mode');
  batchBar.style.display = '';
  requestAnimationFrame(() => batchBar.classList.add('visible'));
  selectBtn.classList.add('active');
  selectBtn.title = '取消选择';
  selectBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `;
  syncAllCardSelectionUI();
  updateSelectionUI();
}

function toggleIconSelection(icon) {
  const key = getIconKey(icon);
  if (selectedIcons.has(key)) {
    selectedIcons.delete(key);
  } else {
    selectedIcons.add(key);
  }
  updateCardSelectionUI(icon);
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = selectedIcons.size;
  if (!batchProcessing) {
    batchCount.textContent = count > 0 ? `已选 ${count} 个图标` : '已选 0 个图标';
  }
  batchMoveBtn.disabled = count === 0 || batchProcessing;
  batchDeleteBtn.disabled = count === 0 || batchProcessing;
}

function updateCardSelectionUI(icon) {
  const key = getIconKey(icon);
  const card = grid.querySelector(`.card[data-icon-key="${CSS.escape(key)}"]`);
  if (!card) return;

  const checkbox = card.querySelector('.card-checkbox');
  const selected = selectedIcons.has(key);
  card.classList.toggle('selected', selected);
  checkbox?.classList.toggle('checked', selected);
}

function syncAllCardSelectionUI() {
  grid.querySelectorAll('.card').forEach((card) => {
    const key = card.dataset.iconKey;
    const selected = selectedIcons.has(key);
    card.classList.toggle('selected', selected);
    card.querySelector('.card-checkbox')?.classList.toggle('checked', selected);
  });
}

async function batchDelete() {
  if (selectedIcons.size === 0 || batchProcessing) return;

  const count = selectedIcons.size;
  if (!confirm(`确定要删除选中的 ${count} 个图标吗？`)) return;

  batchProcessing = true;
  batchMoveBtn.disabled = true;
  batchDeleteBtn.disabled = true;
  batchCancelBtn.disabled = true;

  let successCount = 0;
  let failCount = 0;
  const keys = [...selectedIcons];
  const total = keys.length;

  for (let i = 0; i < keys.length; i++) {
    batchCount.textContent = `正在处理 ${i + 1}/${total}...`;
    const icon = findIconByKey(keys[i]);
    if (!icon) continue;

    const category = icon.category || icon.type || 'upload';
    const isBuiltin = icon.builtin === true;

    try {
      const resp = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: icon.name, category, builtin: isBuiltin }),
        credentials: 'include',
      });

      if (resp.status === 401) {
        const data = await resp.json().catch(() => ({}));
        handleAuthError(data.message);
        break;
      }

      const data = await resp.json();
      if (data.status === 'success') {
        successCount++;
        selectedIcons.delete(keys[i]);
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
  }

  batchProcessing = false;
  batchCancelBtn.disabled = false;

  if (successCount > 0) {
    showToast(`已删除 ${successCount} 个图标${failCount > 0 ? `，${failCount} 个失败` : ''}`, failCount > 0 ? 'error' : 'success');
    toggleSelectionMode(true);
    await loadIcons();
  } else if (failCount > 0) {
    showToast('删除失败', 'error');
    updateSelectionUI();
  }
}

function openBatchMoveModal() {
  if (selectedIcons.size === 0) return;

  batchMoveMode = true;
  pendingMoveIcon = null;
  populateCategorySelects();

  const custom = getCustomCategories();
  if (custom.length === 0) {
    showToast('请先创建一个分类', 'error');
    return;
  }
  moveCategory.value = custom[0]?.name || '';
  if (moveModalTitle) moveModalTitle.textContent = '批量移动到分类';
  moveModal.classList.add('open');
}

async function batchMove(toCategory) {
  if (!toCategory || selectedIcons.size === 0) return;

  batchProcessing = true;
  batchMoveBtn.disabled = true;
  batchDeleteBtn.disabled = true;
  batchCancelBtn.disabled = true;

  let successCount = 0;
  let failCount = 0;
  const keys = [...selectedIcons];
  const total = keys.length;

  for (let i = 0; i < keys.length; i++) {
    batchCount.textContent = `正在处理 ${i + 1}/${total}...`;
    const icon = findIconByKey(keys[i]);
    if (!icon) continue;

    const fromCategory = icon.category || icon.type || 'upload';
    if (fromCategory === toCategory) {
      selectedIcons.delete(keys[i]);
      successCount++;
      continue;
    }

    const isBuiltin = icon.builtin === true;

    try {
      const resp = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: icon.name,
          fromCategory,
          toCategory,
          builtin: isBuiltin,
        }),
        credentials: 'include',
      });

      if (resp.status === 401) {
        const data = await resp.json().catch(() => ({}));
        handleAuthError(data.message);
        break;
      }

      const data = await resp.json();
      if (data.status === 'success') {
        successCount++;
        selectedIcons.delete(keys[i]);
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
  }

  batchProcessing = false;
  batchCancelBtn.disabled = false;
  closeMoveModal();

  if (successCount > 0) {
    showToast(`已移动 ${successCount} 个图标${failCount > 0 ? `，${failCount} 个失败` : ''}`, failCount > 0 ? 'error' : 'success');
    toggleSelectionMode(true);
    await loadIcons();
  } else if (failCount > 0) {
    showToast('移动失败', 'error');
    updateSelectionUI();
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
async function loadCategories() {
  try {
    const resp = await fetch('/api/categories');
    const data = await resp.json();
    allCategories = data.categories || [];
    renderCategoryTabs();
    populateCategorySelects();
  } catch (e) {
    console.error('Failed to load categories:', e);
  }
}

function renderCategoryTabs() {
  const allTab = filterTabs.querySelector('[data-type="all"]');
  filterTabs.innerHTML = '';
  if (allTab) filterTabs.appendChild(allTab);

  const categoriesToShow = [];

  for (const cat of allCategories) {
    categoriesToShow.push(cat);
  }

  // Show legacy "upload" tab if there are upload-category icons
  if ((statsData.upload || 0) > 0 && !categoriesToShow.find((c) => c.name === 'upload')) {
    categoriesToShow.push({ name: 'upload', builtin: false });
  }

  for (const cat of categoriesToShow) {
    const count = statsData[cat.name] || 0;
    const tab = document.createElement('button');
    tab.className = 'tab' + (currentType === cat.name ? ' active' : '');
    tab.dataset.type = cat.name;
    const label = (cat.label && cat.label !== cat.name) ? cat.label : getCategoryLabel(cat.name);
    tab.innerHTML = `${label} <span class="tab-count">${count}</span>`;

    if (cat.name !== 'upload') {
      const actions = document.createElement('span');
      actions.className = 'tab-actions';

      const editBtn = document.createElement('span');
      editBtn.className = 'tab-edit';
      editBtn.title = '重命名分类';
      editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRenameCategoryModal(cat.name);
      });
      actions.appendChild(editBtn);

      if (!cat.builtin) {
        const delBtn = document.createElement('span');
        delBtn.className = 'tab-delete';
        delBtn.title = '删除分类';
        delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteCategory(cat.name);
        });
        actions.appendChild(delBtn);
      }

      tab.appendChild(actions);
    }

    tab.addEventListener('click', () => {
      filterTabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = cat.name;
      applyFilter();
    });

    filterTabs.appendChild(tab);
  }

  if (currentType !== 'all' && !filterTabs.querySelector(`[data-type="${currentType}"]`)) {
    currentType = 'all';
    filterTabs.querySelector('[data-type="all"]')?.classList.add('active');
  }
}

function populateCategorySelects() {
  const custom = getCustomCategories();
  const options = custom.map((c) =>
    `<option value="${c.name}">${getCategoryLabel(c.name)}</option>`,
  ).join('');

  uploadCategory.innerHTML = options || '<option value="" disabled>暂无自定义分类</option>';
  moveCategory.innerHTML = options || '<option value="" disabled>暂无自定义分类</option>';
}

function openCategoryModal() {
  categoryNameInput.value = '';
  categoryModal.classList.add('open');
  setTimeout(() => categoryNameInput.focus(), 100);
}

function closeCategoryModal() {
  categoryModal.classList.remove('open');
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  if (!name) return;

  try {
    const resp = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
      return;
    }

    const data = await resp.json();
    if (data.status === 'success') {
      closeCategoryModal();
      showToast('分类创建成功');
      await loadCategories();
      await loadIcons();
    } else {
      showToast(data.message || '创建失败', 'error');
    }
  } catch (err) {
    showToast('创建失败: ' + err.message, 'error');
  }
}

async function deleteCategory(name) {
  const count = statsData[name] || 0;
  const msg = count > 0
    ? `确定要删除分类「${getCategoryLabel(name)}」吗？该分类下的 ${count} 个图标也会被删除。`
    : `确定要删除分类「${getCategoryLabel(name)}」吗？`;
  if (!confirm(msg)) return;

  try {
    const resp = await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
      return;
    }

    const data = await resp.json();
    if (data.status === 'success') {
      showToast('分类已删除');
      if (currentType === name) currentType = 'all';
      await loadCategories();
      await loadIcons();
    } else {
      showToast(data.message || '删除失败', 'error');
    }
  } catch (err) {
    showToast('删除失败: ' + err.message, 'error');
  }
}

function openRenameCategoryModal(name) {
  renamingCategory = name;
  renameCategoryInput.value = getCategoryLabel(name);
  renameCategoryModal.classList.add('open');
  setTimeout(() => {
    renameCategoryInput.focus();
    renameCategoryInput.select();
  }, 100);
}

function closeRenameCategoryModal() {
  renamingCategory = null;
  renameCategoryModal.classList.remove('open');
}

async function handleRenameCategory(e) {
  e.preventDefault();
  if (!renamingCategory) return;

  const newName = renameCategoryInput.value.trim();
  const oldName = renamingCategory;

  if (!newName || newName === oldName) {
    closeRenameCategoryModal();
    return;
  }

  try {
    const resp = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
      return;
    }

    const data = await resp.json();
    if (data.status === 'success') {
      closeRenameCategoryModal();
      showToast('分类重命名成功');
      if (currentType === oldName) currentType = newName;
      await loadCategories();
      await loadIcons();
    } else {
      showToast(data.message || '重命名失败', 'error');
    }
  } catch (err) {
    showToast('重命名失败: ' + err.message, 'error');
  }
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
    statsData = await statsResp.json();

    allIcons = iconsData.icons || [];

    totalBadge.textContent = statsData.total || allIcons.length;
    renderCategoryTabs();

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
  const iconKey = getIconKey(icon);
  card.className = 'card';
  card.dataset.name = icon.name;
  card.dataset.iconKey = iconKey;

  if (selectedIcons.has(iconKey)) {
    card.classList.add('selected');
  }

  const thumbUrl = getThumbnailUrl(icon);
  const isSelected = selectedIcons.has(iconKey);

  card.innerHTML = `
    <span class="card-checkbox${isSelected ? ' checked' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    </span>
    <div class="card-actions">
      <button class="btn btn-icon copy-btn" title="复制地址">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <button class="btn btn-icon preview-btn" title="放大预览">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="btn btn-icon manage-btn" title="管理">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
      <div class="card-menu">
        <button class="card-menu-item rename-btn">重命名</button>
        <button class="card-menu-item move-btn">移动到...</button>
        <button class="card-menu-item delete-btn card-menu-danger">删除</button>
      </div>
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

  // Manage menu
  const manageBtn = card.querySelector('.manage-btn');
  const cardMenu = card.querySelector('.card-menu');
  manageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.card-menu.open').forEach((m) => {
      if (m !== cardMenu) m.classList.remove('open');
    });
    cardMenu.classList.toggle('open');
  });

  card.querySelector('.rename-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    cardMenu.classList.remove('open');
    openRenameModal(icon);
  });

  card.querySelector('.move-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    cardMenu.classList.remove('open');
    openMoveModal(icon);
  });

  card.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    cardMenu.classList.remove('open');
    deleteIcon(icon);
  });

  // Click card — copy in normal mode, toggle selection in selection mode
  card.addEventListener('click', () => {
    if (selectionMode) {
      toggleIconSelection(icon);
    } else {
      copyToClipboard(getCopyUrl(icon));
    }
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
  populateCategorySelects();
  const custom = getCustomCategories();
  if (custom.length === 0) {
    showToast('请先创建一个分类', 'error');
    openCategoryModal();
    return;
  }
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
  const category = uploadCategory.value;
  if (!category) {
    showToast('请选择上传分类', 'error');
    return;
  }
  formData.append('category', category);
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
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
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

  const category = icon.category || icon.type || 'upload';
  const isBuiltin = icon.builtin === true;

  try {
    const resp = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: icon.name, category, builtin: isBuiltin }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
      return;
    }

    const data = await resp.json();

    if (data.status === 'success') {
      showToast('删除成功');
      allIcons = allIcons.filter(
        (i) => !(i.name === icon.name && (i.category || i.type) === category),
      );
      statsData[category] = Math.max(0, (statsData[category] || 1) - 1);
      statsData.total = Math.max(0, (statsData.total || 1) - 1);
      renderCategoryTabs();
      applyFilter();
    } else {
      showToast(data.message || '删除失败', 'error');
    }
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Rename / Move
// ---------------------------------------------------------------------------
function openRenameModal(icon) {
  pendingRenameIcon = icon;
  renameInput.value = icon.name;
  renameModal.classList.add('open');
  setTimeout(() => renameInput.focus(), 100);
}

function closeRenameModal() {
  pendingRenameIcon = null;
  renameModal.classList.remove('open');
}

async function handleRename(e) {
  e.preventDefault();
  if (!pendingRenameIcon) return;

  const newName = renameInput.value.trim();
  const category = pendingRenameIcon.category || pendingRenameIcon.type || 'upload';
  const oldName = pendingRenameIcon.name;
  const isBuiltin = pendingRenameIcon.builtin === true;

  if (!newName || newName === oldName) {
    closeRenameModal();
    return;
  }

  try {
    const resp = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, oldName, newName, builtin: isBuiltin }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
      return;
    }

    const data = await resp.json();
    if (data.status === 'success') {
      closeRenameModal();
      showToast('重命名成功');
      await loadIcons();
    } else {
      showToast(data.message || '重命名失败', 'error');
    }
  } catch (err) {
    showToast('重命名失败: ' + err.message, 'error');
  }
}

function openMoveModal(icon) {
  batchMoveMode = false;
  pendingMoveIcon = icon;
  populateCategorySelects();
  const currentCat = icon.category || icon.type || 'upload';
  moveCategory.value = getCustomCategories().find((c) => c.name !== currentCat)?.name || '';
  if (moveModalTitle) moveModalTitle.textContent = '移动到分类';
  moveModal.classList.add('open');
}

function closeMoveModal() {
  pendingMoveIcon = null;
  batchMoveMode = false;
  moveModal.classList.remove('open');
  if (moveModalTitle) moveModalTitle.textContent = '移动到分类';
}

async function handleMove(e) {
  e.preventDefault();

  const toCategory = moveCategory.value;
  if (!toCategory) {
    showToast('请选择目标分类', 'error');
    return;
  }

  if (batchMoveMode) {
    await batchMove(toCategory);
    return;
  }

  if (!pendingMoveIcon) return;

  const fromCategory = pendingMoveIcon.category || pendingMoveIcon.type || 'upload';
  const name = pendingMoveIcon.name;
  const isBuiltin = pendingMoveIcon.builtin === true;

  try {
    const resp = await fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, fromCategory, toCategory, builtin: isBuiltin }),
      credentials: 'include',
    });

    if (resp.status === 401) {
      const data = await resp.json().catch(() => ({}));
      handleAuthError(data.message);
      return;
    }

    const data = await resp.json();
    if (data.status === 'success') {
      closeMoveModal();
      showToast('移动成功');
      await loadIcons();
    } else {
      showToast(data.message || '移动失败', 'error');
    }
  } catch (err) {
    showToast('移动失败: ' + err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
function init() {
  initTheme();

  themeBtn.addEventListener('click', toggleTheme);
  selectBtn.addEventListener('click', () => toggleSelectionMode());
  batchMoveBtn.addEventListener('click', openBatchMoveModal);
  batchDeleteBtn.addEventListener('click', batchDelete);
  batchCancelBtn.addEventListener('click', () => toggleSelectionMode(true));
  uploadBtn.addEventListener('click', openUploadModal);
  uploadModalClose.addEventListener('click', () => uploadModal.classList.remove('open'));
  previewModalClose.addEventListener('click', () => previewModal.classList.remove('open'));
  loginBtn.addEventListener('click', openLoginModal);
  logoutBtn.addEventListener('click', handleLogout);
  authUserBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAuthDropdown();
  });
  changePasswordBtn.addEventListener('click', openChangePasswordModal);
  loginModalClose.addEventListener('click', closeLoginModal);
  loginForm.addEventListener('submit', handleLogin);
  setupModalClose.addEventListener('click', dismissSetupModal);
  setupSkipBtn.addEventListener('click', dismissSetupModal);
  setupForm.addEventListener('submit', handleSetup);
  changePasswordModalClose.addEventListener('click', closeChangePasswordModal);
  changePasswordForm.addEventListener('submit', handleChangePassword);
  addCategoryBtn.addEventListener('click', openCategoryModal);
  categoryModalClose.addEventListener('click', closeCategoryModal);
  categoryForm.addEventListener('submit', handleCreateCategory);
  renameCategoryModalClose.addEventListener('click', closeRenameCategoryModal);
  renameCategoryForm.addEventListener('submit', handleRenameCategory);
  renameModalClose.addEventListener('click', closeRenameModal);
  renameForm.addEventListener('submit', handleRename);
  moveModalClose.addEventListener('click', closeMoveModal);
  moveForm.addEventListener('submit', handleMove);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.auth-user-menu')) {
      toggleAuthDropdown(false);
    }
    if (!e.target.closest('.card-actions')) {
      document.querySelectorAll('.card-menu.open').forEach((m) => m.classList.remove('open'));
    }
  });

  // Close modals on overlay click
  [uploadModal, previewModal, loginModal, setupModal, changePasswordModal, categoryModal, renameCategoryModal, renameModal, moveModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        if (modal === setupModal) {
          sessionStorage.setItem('setup-dismissed', '1');
        }
        if (modal === renameModal) pendingRenameIcon = null;
        if (modal === renameCategoryModal) renamingCategory = null;
        if (modal === moveModal) closeMoveModal();
      }
    });
  });

  // Close modals on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-overlay.open');
      if (openModal) {
        openModal.classList.remove('open');
        if (openModal === setupModal) {
          sessionStorage.setItem('setup-dismissed', '1');
        }
        if (openModal === renameModal) pendingRenameIcon = null;
        if (openModal === renameCategoryModal) renamingCategory = null;
        if (openModal === moveModal) closeMoveModal();
        toggleAuthDropdown(false);
        return;
      }

      if (selectionMode && !batchProcessing) {
        toggleSelectionMode(true);
        return;
      }

      toggleAuthDropdown(false);
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

  // Filter tabs — "全部" tab
  filterTabs.querySelector('[data-type="all"]')?.addEventListener('click', () => {
    filterTabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    filterTabs.querySelector('[data-type="all"]').classList.add('active');
    currentType = 'all';
    applyFilter();
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

  checkAuth();
  loadCategories().then(() => loadIcons());
}

init();
