// script.js — يجلب Issues من الريبو ويعرضها، ويبني رابط إنشاء Issue جديد

const OWNER = '01100174175etis-maker';
const REPO = 'pro-sale';
const ISSUES_API = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;

async function fetchIssues() {
  try {
    const res = await fetch(ISSUES_API);
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
}

function renderIssues(list) {
  const container = document.getElementById('issues-list');
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="muted">لا توجد سجلات حالياً.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(issue => {
    const card = document.createElement('div');
    card.className = 'card mb-2';
    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h6');
    title.className = 'card-title';
    const link = document.createElement('a');
    link.href = issue.html_url;
    link.target = '_blank';
    link.textContent = `#${issue.number} — ${issue.title}`;
    title.appendChild(link);

    const desc = document.createElement('p');
    desc.className = 'card-text';
    desc.textContent = issue.body ? issue.body.substring(0, 400) : '';

    const meta = document.createElement('div');
    meta.className = 'text-muted small';
    const created = new Date(issue.created_at).toLocaleString();
    meta.textContent = `${created} — الحالة: ${issue.state}`;

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(meta);
    card.appendChild(body);
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

function applyFilters(issues) {
  const text = document.getElementById('filter-text').value.trim();
  const type = document.getElementById('filter-type').value;
  let filtered = issues.slice();
  if (type) {
    filtered = filtered.filter(i => i.title && i.title.includes(type));
  }
  if (text) {
    const lc = text.toLowerCase();
    filtered = filtered.filter(i => (i.title && i.title.toLowerCase().includes(lc)) || (i.body && i.body.toLowerCase().includes(lc)));
  }
  renderIssues(filtered);
}

function buildNewIssueLink(title, body) {
  const base = `https://github.com/${OWNER}/${REPO}/issues/new`;
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (body) params.set('body', body);
  return `${base}?${params.toString()}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const issues = await fetchIssues();
  renderIssues(issues);

  document.getElementById('apply-filters').addEventListener('click', () => applyFilters(issues));

  const form = document.getElementById('new-issue-form');
  const rawLink = document.getElementById('new-issue-raw');

  // update raw link dynamically
  function updateRawLink() {
    const type = document.getElementById('record-type').value;
    const title = `${type} — ${document.getElementById('issue-title').value}`;
    const body = `نوع: ${type}\n\n` + document.getElementById('issue-body').value;
    rawLink.href = buildNewIssueLink(title, body);
  }

  ['record-type','issue-title','issue-body'].forEach(id => document.getElementById(id).addEventListener('input', updateRawLink));
  updateRawLink();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('record-type').value;
    const titleInput = document.getElementById('issue-title').value.trim();
    const bodyInput = document.getElementById('issue-body').value.trim();
    if (!titleInput) {
      alert('الرجاء إدخال عنوان للسجل.');
      return;
    }
    const title = `${type} — ${titleInput}`;
    const body = `نوع: ${type}\n\n` + bodyInput;
    const url = buildNewIssueLink(title, body);
    // Open GitHub new issue page so user confirms/creates the issue
    window.open(url, '_blank');
  });

});
