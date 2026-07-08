// ============================================================
//  STATE
// ============================================================
let expenses = [];
let editingId = null;

// DOM refs
const form = document.getElementById('expenseForm');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const paymentSelect = document.getElementById('payment');
const addBtn = document.getElementById('addBtn');
const updateBtn = document.getElementById('updateBtn');
const resetBtn = document.getElementById('resetBtn');
const editIndicator = document.getElementById('editIndicator');
const editTitleDisplay = document.getElementById('editTitleDisplay');
const tbody = document.getElementById('expenseTableBody');
const totalEl = document.getElementById('totalExpenses');
const countEl = document.getElementById('totalTransactions');
const highEl = document.getElementById('highestExpense');
const lowEl = document.getElementById('lowestExpense');
const avgEl = document.getElementById('averageExpense');
const exportBtn = document.getElementById('exportCsvBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const canvas = document.getElementById('pieChart');
const ctx = canvas.getContext('2d');
const chartLegend = document.getElementById('chartLegend');
const chartEmpty = document.getElementById('chartEmpty');

const CATEGORY_COLORS = {
    Food: '#2e7d5e',
    Transport: '#2a6b9e',
    Shopping: '#9b5b8a',
    Bills: '#c47d4a',
    Entertainment: '#7a4a9e',
    Others: '#6f8ba5'
};

// ============================================================
//  HELPERS
// ============================================================
function formatDate(d) {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v) {
    return Number(v).toFixed(2);
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================
//  LOCAL STORAGE
// ============================================================
function loadFromStorage() {
    try {
        const data = localStorage.getItem('expenses');
        if (data) {
            expenses = JSON.parse(data);
            expenses = expenses.filter(e => e && typeof e === 'object');
        } else {
            // seed with sample data
            expenses = [{
                id: generateId(),
                title: 'Lunch',
                amount: 250,
                category: 'Food',
                date: '2026-07-10',
                payment: 'Cash'
            }, {
                id: generateId(),
                title: 'Bus Fare',
                amount: 80,
                category: 'Transport',
                date: '2026-07-09',
                payment: 'bKash'
            }, {
                id: generateId(),
                title: 'Groceries',
                amount: 620,
                category: 'Shopping',
                date: '2026-07-08',
                payment: 'Card'
            }];
        }
    } catch {
        expenses = [];
    }
}

function saveToStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// ============================================================
//  RENDER
// ============================================================
function renderAll() {
    renderTable();
    renderSummary();
    renderChart();
    saveToStorage();
}

function renderTable() {
    if (expenses.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No expenses yet. Add one above!</td></tr>`;
        return;
    }
    const sorted = [...expenses].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.id.localeCompare(a.id);
    });
    let html = '';
    for (const e of sorted) {
        const catClass = e.category.toLowerCase();
        html += `
            <tr data-id="${e.id}">
                <td><strong>${escapeHtml(e.title)}</strong></td>
                <td>৳ ${formatCurrency(e.amount)}</td>
                <td><span class="badge ${catClass}">${escapeHtml(e.category)}</span></td>
                <td>${formatDate(e.date)}</td>
                <td><span class="badge payment">${escapeHtml(e.payment)}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-edit" data-id="${e.id}">Edit</button>
                        <button class="btn-delete" data-id="${e.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => startEdit(btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteExpense(btn.dataset.id));
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderSummary() {
    const n = expenses.length;
    if (n === 0) {
        totalEl.textContent = '0.00';
        countEl.textContent = '0';
        highEl.textContent = '0.00';
        lowEl.textContent = '0.00';
        avgEl.textContent = '0.00';
        return;
    }
    const amounts = expenses.map(e => e.amount);
    const total = amounts.reduce((s, v) => s + v, 0);
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    const avg = total / n;

    totalEl.textContent = formatCurrency(total);
    countEl.textContent = n;
    highEl.textContent = formatCurrency(max);
    lowEl.textContent = formatCurrency(min);
    avgEl.textContent = formatCurrency(avg);
}

// ============================================================
//  PIE CHART
// ============================================================
function renderChart() {
    if (expenses.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        chartLegend.innerHTML = '';
        chartEmpty.style.display = 'block';
        return;
    }
    chartEmpty.style.display = 'none';

    const map = {};
    for (const e of expenses) {
        const cat = e.category || 'Others';
        map[cat] = (map[cat] || 0) + e.amount;
    }
    const entries = Object.entries(map);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const colors = entries.map(([cat]) => CATEGORY_COLORS[cat] || '#8aa0b8');

    const w = canvas.width,
        h = canvas.height;
    const cx = w / 2,
        cy = h / 2,
        r = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    let startAngle = -Math.PI / 2;
    for (let i = 0; i < entries.length; i++) {
        const [, value] = entries[i];
        const sliceAngle = (value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        startAngle += sliceAngle;
    }

    let legendHtml = '';
    for (let i = 0; i < entries.length; i++) {
        const [cat, val] = entries[i];
        const pct = ((val / total) * 100).toFixed(1);
        legendHtml += `
            <div class="legend-item">
                <span class="color-dot" style="background:${colors[i]};"></span>
                ${escapeHtml(cat)} (${pct}%)
            </div>
        `;
    }
    chartLegend.innerHTML = legendHtml;
}

// ============================================================
//  CRUD
// ============================================================
function addExpense(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const newExp = {
        id: generateId(),
        title: titleInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: categorySelect.value,
        date: dateInput.value,
        payment: paymentSelect.value,
    };
    expenses.push(newExp);
    resetForm();
    renderAll();
    showToast('✅ Expense added successfully!');
}

function startEdit(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    editingId = id;
    titleInput.value = exp.title;
    amountInput.value = exp.amount;
    categorySelect.value = exp.category;
    dateInput.value = exp.date;
    paymentSelect.value = exp.payment;

    addBtn.classList.add('hidden');
    updateBtn.classList.remove('hidden');
    editIndicator.classList.remove('hidden');
    editTitleDisplay.textContent = exp.title;
    document.getElementById('formTitle').textContent = '✏️ Edit Expense';
    form.querySelector('.form-actions').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateExpense() {
    if (!editingId) return;
    if (!validateForm()) return;

    const idx = expenses.findIndex(e => e.id === editingId);
    if (idx === -1) return;

    expenses[idx] = {
        ...expenses[idx],
        title: titleInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: categorySelect.value,
        date: dateInput.value,
        payment: paymentSelect.value,
    };

    cancelEdit();
    renderAll();
    showToast('✅ Expense updated successfully!');
}

function deleteExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    if (!confirm(`Delete "${exp.title}" (৳${formatCurrency(exp.amount)})?`)) return;

    expenses = expenses.filter(e => e.id !== id);
    if (editingId === id) cancelEdit();
    renderAll();
    showToast('🗑 Expense deleted.');
}

function clearAllExpenses() {
    if (expenses.length === 0) {
        showToast('ℹ️ No expenses to clear.');
        return;
    }
    if (!confirm('⚠️ Delete ALL expenses? This cannot be undone.')) return;
    expenses = [];
    cancelEdit();
    renderAll();
    showToast('🗑 All expenses cleared.');
}

function cancelEdit() {
    editingId = null;
    addBtn.classList.remove('hidden');
    updateBtn.classList.add('hidden');
    editIndicator.classList.add('hidden');
    document.getElementById('formTitle').textContent = '➕ Add New Expense';
    resetForm();
}

function resetForm() {
    form.reset();
    titleInput.value = '';
    amountInput.value = '';
    categorySelect.value = '';
    dateInput.value = getToday();
    paymentSelect.value = '';
    form.querySelectorAll('.form-group input, .form-group select').forEach(el => {
        el.style.borderColor = '';
    });
    if (editingId) cancelEdit();
}

// ============================================================
//  VALIDATION
// ============================================================
function validateForm() {
    let valid = true;
    const fields = [
        { el: titleInput, name: 'Title' },
        { el: amountInput, name: 'Amount' },
        { el: categorySelect, name: 'Category' },
        { el: dateInput, name: 'Date' },
        { el: paymentSelect, name: 'Payment Method' },
    ];

    for (const f of fields) {
        const val = f.el.value.trim();
        if (!val) {
            f.el.style.borderColor = '#d93a3a';
            valid = false;
        } else {
            f.el.style.borderColor = '';
        }
    }

    const amt = parseFloat(amountInput.value);
    if (amountInput.value.trim() && (isNaN(amt) || amt <= 0)) {
        amountInput.style.borderColor = '#d93a3a';
        valid = false;
        showToast('⚠️ Amount must be greater than 0.');
    } else if (amountInput.value.trim()) {
        amountInput.style.borderColor = '';
    }

    if (!valid) {
        showToast('⚠️ Please fill in all required fields correctly.');
        return false;
    }
    return true;
}

// ============================================================
//  EXPORT CSV
// ============================================================
function exportCSV() {
    if (expenses.length === 0) {
        showToast('ℹ️ No data to export.');
        return;
    }
    const headers = ['Title', 'Amount (BDT)', 'Category', 'Date', 'Payment Method'];
    const rows = expenses.map(e => [
        `"${e.title}"`,
        e.amount.toFixed(2),
        `"${e.category}"`,
        e.date,
        `"${e.payment}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('📤 CSV exported!');
}

// ============================================================
//  TOAST
// ============================================================
function showToast(msg) {
    const old = document.querySelector('.toast-msg');
    if (old) old.remove();

    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.textContent = msg;
    document.body.appendChild(div);
    // trigger reflow then add class for animation
    requestAnimationFrame(() => {
        div.classList.add('show');
    });

    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 400);
    }, 3000);
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
form.addEventListener('submit', addExpense);
updateBtn.addEventListener('click', updateExpense);
resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    cancelEdit();
});
exportBtn.addEventListener('click', exportCSV);
clearAllBtn.addEventListener('click', clearAllExpenses);

// set default date
dateInput.value = getToday();

// ============================================================
//  INIT
// ============================================================
loadFromStorage();
renderAll();

// resize chart on window resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderChart(), 200);
});

console.log('💰 Expense Tracker loaded!');
console.log(`📊 ${expenses.length} expenses loaded.`);