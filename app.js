const grid = document.querySelector('#grid');
const search = document.querySelector('#search');
const collection = document.querySelector('#collection');
const dialog = document.querySelector('#viewer');
const cards = [...grid.querySelectorAll('.card')];
let category = '全部';
let items = [];
let visible = [];
let currentId;
let opener;

function filter() {
  const query = search.value.trim().toLocaleLowerCase();
  visible = items.filter(item => (category === '全部' || item.category === category)
    && (!collection.value || item.collection === collection.value)
    && `${item.category} ${item.collection} ${item.filename}`.toLocaleLowerCase().includes(query));
  const ids = new Set(visible.map(item => item.id));
  for (const card of cards) card.hidden = !ids.has(card.dataset.id);
  document.querySelector('#result-count').textContent = `${visible.length} 件作品`;
  document.querySelector('#empty').hidden = visible.length > 0;
}
function show(item) {
  if (!item) return;
  currentId = item.id;
  const image = document.querySelector('#viewer-image');
  image.src = item.url;
  image.alt = item.title;
  document.querySelector('#viewer-title').textContent = item.title;
  document.querySelector('#viewer-category').textContent = item.category;
  document.querySelector('#viewer-meta').textContent = `${item.width} × ${item.height} · ${(item.bytes / 1048576).toFixed(2)} MiB · ${item.filename}`;
  const download = document.querySelector('#viewer-download');
  download.href = item.url;
  download.download = item.filename;
  document.querySelector('#viewer-original').href = item.url;
  if (!dialog.open) dialog.showModal();
}
function navigate(direction) {
  const index = visible.findIndex(item => item.id === currentId);
  show(visible[(index + direction + visible.length) % visible.length]);
}
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-open]');
  if (!button) return;
  opener = button;
  show(items.find(item => item.id === button.dataset.open));
});
document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.category;
  collection.value = '';
  document.querySelectorAll('[data-category]').forEach(tab => {
    tab.classList.toggle('active', tab === button);
    tab.setAttribute('aria-pressed', String(tab === button));
  });
  for (const option of collection.options) {
    option.hidden = Boolean(option.value) && category !== '全部' && !items.some(item => item.category === category && item.collection === option.value);
  }
  filter();
}));
search.addEventListener('input', filter);
collection.addEventListener('change', filter);
document.querySelector('#close').addEventListener('click', () => dialog.close());
document.querySelector('#prev').addEventListener('click', () => navigate(-1));
document.querySelector('#next').addEventListener('click', () => navigate(1));
dialog.addEventListener('close', () => {
  document.querySelector('#viewer-image').removeAttribute('src');
  opener?.focus();
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
document.addEventListener('keydown', event => {
  if (dialog.open && event.key === 'ArrowLeft') navigate(-1);
  if (dialog.open && event.key === 'ArrowRight') navigate(1);
});
fetch('gallery.json').then(response => {
  if (!response.ok) throw Error('无法加载图库索引');
  return response.json();
}).then(data => {
  items = data;
  filter();
}).catch(() => {
  document.querySelector('#result-count').textContent = '索引加载失败，请刷新。原图下载仍可使用。';
});
