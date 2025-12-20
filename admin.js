// 配置
let config = {
    apiUrl: 'https://1340181402-3thvnndcwl.ap-guangzhou.tencentscf.com',
    adminKey: 'ADMIN-KEY-2025'
};

// 页面加载
window.onload = () => {
    const saved = localStorage.getItem('adminConfig');
    if (saved) {
        const savedConfig = JSON.parse(saved);
        // 如果保存的是旧地址，使用新地址覆盖
        if (savedConfig.apiUrl && !savedConfig.apiUrl.includes('tencentscf.com')) {
            config.apiUrl = 'https://1340181402-3thvnndcwl.ap-guangzhou.tencentscf.com';
            localStorage.setItem('adminConfig', JSON.stringify(config));
        } else {
            config = savedConfig;
        }
    }
    document.getElementById('apiUrl').value = config.apiUrl;
    document.getElementById('adminKey').value = config.adminKey;
    loadDashboard();
};

// 切换页面
function showPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    document.getElementById(pageName).classList.add('active');

    const titles = {
        dashboard: '仪表板',
        licenses: '密钥管理',
        devices: '设备管理',
        review: '激活审核',
        logs: '操作日志',
        settings: '系统设置'
    };
    document.getElementById('pageTitle').textContent = titles[pageName];

    if (pageName === 'dashboard') loadDashboard();
    if (pageName === 'licenses') loadAllLicenses();
    if (pageName === 'review') { loadPendingIPs(); loadApprovedIPs(); loadRejectedIPs(); }
    if (pageName === 'logs') loadLogs();
}

// 刷新当前页面
function loadCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        const pageName = activePage.id;
        if (pageName === 'dashboard') loadDashboard();
        if (pageName === 'licenses') loadAllLicenses();
        if (pageName === 'logs') loadLogs();
    }
}

// 显示消息
function showMessage(text, type = 'success') {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type} show`;
    setTimeout(() => msg.classList.remove('show'), 3000);
}

// API 请求
async function apiRequest(action, data = {}) {
    try {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, adminKey: config.adminKey, ...data })
        });
        return await response.json();
    } catch (error) {
        showMessage('网络错误：' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// 生成密钥
function generateLicense() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const parts = [];
    for (let i = 0; i < 4; i++) {
        let part = '';
        for (let j = 0; j < 4; j++) {
            part += chars[Math.floor(Math.random() * chars.length)];
        }
        parts.push(part);
    }
    return 'ZSXQ-' + parts.join('-');
}

function generateNewLicense() {
    document.getElementById('newLicense').value = generateLicense();
}

// 生成临时密钥（使用服务端全局计数器）
async function generateTempLicenses() {
    const count = parseInt(document.getElementById('tempLicenseCount').value) || 1;

    if (count < 1 || count > 50) {
        showMessage('生成数量必须在 1-50 之间', 'error');
        return;
    }

    // 从服务端获取全局计数器编号
    showMessage('正在获取密钥编号...', 'success');
    const numberResult = await apiRequest('getNextTempLicenseNumber', { count });

    if (!numberResult.success) {
        showMessage('获取编号失败: ' + (numberResult.error || '未知错误'), 'error');
        return;
    }

    const numbers = numberResult.data.numbers;
    const licenses = [];

    // 生成简洁的递增密钥：ZSXQ-8888-0001
    for (let i = 0; i < count; i++) {
        const paddedNum = numbers[i].toString().padStart(4, '0');
        const uniqueKey = `ZSXQ-8888-${paddedNum}`;
        licenses.push(uniqueKey);
    }

    // 注册到服务端（确保密钥有效性）
    showMessage('正在注册密钥到服务端...', 'success');
    const registerResult = await apiRequest('registerTempLicenses', { licenses });

    if (!registerResult.success) {
        showMessage('密钥注册失败: ' + (registerResult.error || '未知错误'), 'error');
        return;
    }

    // 显示结果
    let html = `<div class="card" style="background: #f0f9ff; border: 2px solid #0ea5e9;">
        <div class="card-header" style="background: #0ea5e9; color: white;">
            <h4>✅ 已生成并注册 ${count} 个临时密钥（5次任务，3小时）</h4>
        </div>
        <div class="card-body">
            <p style="color: #0369a1; font-weight: bold;">请复制以下密钥发送给用户：</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">`;

    licenses.forEach((key, index) => {
        html += `<div style="margin: 8px 0; padding: 10px; background: #f8fafc; border-left: 4px solid #0ea5e9; display: flex; justify-content: space-between; align-items: center;">
            <span class="code" style="font-size: 16px; color: #0369a1;">${key}</span>
            <button class="btn btn-sm" onclick="copyToClipboard('${key}')" style="background: #0ea5e9; color: white;">📋 复制</button>
        </div>`;
    });

    html += `</div>
            <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ 重要提示：</strong></p>
                <ul style="margin: 10px 0; color: #92400e;">
                    <li>这些密钥<strong>已注册到服务端</strong>，只有已注册的密钥才能使用</li>
                    <li>请立即复制并发送给用户</li>
                    <li>每个密钥只能使用 <strong>5 次任务</strong>，有效期 <strong>3 小时</strong></li>
                    <li>用户使用后会出现在"激活审核"页面，你可以选择通过或拒绝</li>
                </ul>
            </div>
            <div style="margin-top: 15px;">
                <button class="btn btn-primary" onclick="copyAllTempLicenses()">📋 复制全部密钥</button>
                <button class="btn" onclick="exportTempLicensesToFile()">💾 导出为文本文件</button>
            </div>
        </div>
    </div>`;

    document.getElementById('tempLicensesResult').innerHTML = html;

    // 保存到临时变量供复制使用
    window.generatedTempLicenses = licenses;

    showMessage(`成功生成并注册 ${count} 个临时密钥`, 'success');
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('已复制到剪贴板', 'success');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showMessage('已复制到剪贴板', 'success');
    });
}

// 复制所有临时密钥
function copyAllTempLicenses() {
    if (!window.generatedTempLicenses || window.generatedTempLicenses.length === 0) {
        showMessage('没有可复制的密钥', 'error');
        return;
    }

    const text = window.generatedTempLicenses.join('\n');
    copyToClipboard(text);
}

// 导出临时密钥到文件
function exportTempLicensesToFile() {
    if (!window.generatedTempLicenses || window.generatedTempLicenses.length === 0) {
        showMessage('没有可导出的密钥', 'error');
        return;
    }

    let content = `知识星球助手 - 临时密钥\n`;
    content += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    content += `密钥类型：5次任务，3小时有效期\n`;
    content += `密钥数量：${window.generatedTempLicenses.length}\n`;
    content += `\n${'='.repeat(50)}\n\n`;

    window.generatedTempLicenses.forEach((key, index) => {
        content += `${index + 1}. ${key}\n`;
    });

    content += `\n${'='.repeat(50)}\n`;
    content += `\n使用说明：\n`;
    content += `1. 每个密钥独立使用，互不影响\n`;
    content += `2. 每个密钥最多使用 5 次任务，有效期 3 小时\n`;
    content += `3. 用完次数或过期后自动失效\n`;
    content += `4. 如需长期使用，请联系管理员获取正式授权\n`;
    content += `\n联系方式：微信号 YOLO_SepFive\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `临时密钥_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showMessage('密钥已导出到文件', 'success');
}

// 格式化时间
function formatTime(time) {
    if (typeof time === 'string' && (time.includes('-') || time.includes(':'))) return time;
    try {
        const date = new Date(Number(time));
        if (isNaN(date.getTime())) return time;
        return date.toLocaleString('zh-CN');
    } catch (e) {
        return time;
    }
}

// 保存配置
function saveConfig() {
    config.apiUrl = document.getElementById('apiUrl').value.trim();
    config.adminKey = document.getElementById('adminKey').value.trim();
    localStorage.setItem('adminConfig', JSON.stringify(config));
    showMessage('配置已保存', 'success');
}

// 测试连接
async function testConnection() {
    showMessage('正在测试连接...', 'success');
    const result = await apiRequest('list', { page: 1, pageSize: 1 });
    if (result.success) {
        showMessage('连接成功！', 'success');
    } else {
        showMessage('连接失败：' + result.error, 'error');
    }
}

// 加载仪表板
async function loadDashboard() {
    const result = await apiRequest('list', { page: 1, pageSize: 10 });
    if (result.success) {
        displayStats(result.data);
        displayRecentLicenses(result.data);
    }
}

// 显示统计
function displayStats(data) {
    const total = data.total || 0;
    const active = data.licenses.filter(l => !l.isBanned && new Date(l.expire) > new Date()).length;
    const devices = data.licenses.reduce((sum, l) => sum + l.devicesUsed, 0);
    const banned = data.licenses.filter(l => l.isBanned).length;

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <div class="stat-label">总密钥数</div>
            <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">活跃密钥</div>
            <div class="stat-value">${active}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">总设备数</div>
            <div class="stat-value">${devices}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">已封禁</div>
            <div class="stat-value">${banned}</div>
        </div>
    `;
}

// 显示最近密钥
function displayRecentLicenses(data) {
    if (!data.licenses || data.licenses.length === 0) {
        document.getElementById('recentLicenses').innerHTML = '<div class="loading">暂无数据</div>';
        return;
    }

    let html = '<table><thead><tr><th>密钥</th><th>客户</th><th>设备</th><th>状态</th></tr></thead><tbody>';
    data.licenses.slice(0, 5).forEach(lic => {
        const status = lic.isBanned ? '<span class="badge badge-danger">已封禁</span>' :
            new Date(lic.expire) < new Date() ? '<span class="badge badge-warning">已过期</span>' :
                '<span class="badge badge-success">正常</span>';
        html += `<tr>
            <td><span class="code">${lic.license}</span></td>
            <td>${lic.customer}</td>
            <td>${lic.devicesUsed} / ${lic.maxDevices}</td>
            <td>${status}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('recentLicenses').innerHTML = html;
}

// 注册密钥
async function registerLicense() {
    const license = document.getElementById('newLicense').value;
    const customer = document.getElementById('customer').value;
    const expireDate = document.getElementById('expireDate').value;
    const maxDevices = parseInt(document.getElementById('maxDevices').value);

    if (!license || !customer || !expireDate) {
        showMessage('请填写所有信息', 'error');
        return;
    }

    const result = await apiRequest('register', {
        licenses: [{
            license,
            customer,
            expire: new Date(expireDate + ' 23:59:59').getTime(),
            maxDevices,
            created: Date.now()
        }]
    });

    if (result.success) {
        showMessage('密钥注册成功！客户首次激活时会自动绑定 IP', 'success');
        document.getElementById('customer').value = '星球助手';
        document.getElementById('newLicense').value = '';
        loadAllLicenses();
    } else {
        showMessage(result.error || '注册失败', 'error');
    }
}

// 加载所有密钥
let currentPage = 1;
async function loadAllLicenses(page = 1) {
    currentPage = page;
    const result = await apiRequest('list', { page, pageSize: 20 });
    if (result.success) {
        displayAllLicenses(result.data);
        displayLicensesPagination(result.data);
    }
}

// 显示所有密钥
function displayAllLicenses(data) {
    if (!data.licenses || data.licenses.length === 0) {
        document.getElementById('allLicenses').innerHTML = '<div class="loading">暂无数据</div>';
        return;
    }

    let html = '<table><thead><tr><th>密钥</th><th>客户</th><th>过期时间</th><th>设备</th><th>状态</th><th>IP绑定</th><th>操作</th></tr></thead><tbody>';
    data.licenses.forEach(lic => {
        const isExpired = new Date(lic.expire) < new Date();
        const status = lic.isBanned ? '<span class="badge badge-danger">已封禁</span>' :
            isExpired ? '<span class="badge badge-warning">已过期</span>' :
                '<span class="badge badge-success">正常</span>';

        // IP 绑定状态
        const ipStatus = lic.ipBindingEnabled ?
            `<span class="badge badge-info" title="${(lic.allowedIPs || []).join(', ')}">🔒 ${(lic.allowedIPs || []).length} IP</span>` :
            '<span class="badge badge-secondary">未启用</span>';

        const banBtn = lic.isBanned ?
            `<button class="btn btn-success btn-sm" onclick="unbanLicenseAction('${lic.license}')">解封</button>` :
            `<button class="btn btn-warning btn-sm" onclick="banLicenseAction('${lic.license}')">封禁</button>`;

        html += `<tr>
            <td><span class="code">${lic.license}</span></td>
            <td>${lic.customer}</td>
            <td>${lic.expire}</td>
            <td>${lic.devicesUsed} / ${lic.maxDevices}</td>
            <td>${status}</td>
            <td>${ipStatus}</td>
            <td>
                <button class="btn btn-sm" onclick="editLicense('${lic.license}')">编辑</button>
                <button class="btn btn-sm" onclick="manageIPBindingFromList('${lic.license}')">🔒</button>
                ${banBtn}
                <button class="btn btn-danger btn-sm" onclick="deleteLicense('${lic.license}')">删除</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('allLicenses').innerHTML = html;
}

// 显示分页
function displayLicensesPagination(data) {
    if (data.totalPages <= 1) {
        document.getElementById('licensesPagination').innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    if (currentPage > 1) {
        html += `<button class="btn btn-sm" onclick="loadAllLicenses(${currentPage - 1})">上一页</button>`;
    }
    html += `<span>第 ${currentPage} / ${data.totalPages} 页</span>`;
    if (currentPage < data.totalPages) {
        html += `<button class="btn btn-sm" onclick="loadAllLicenses(${currentPage + 1})">下一页</button>`;
    }
    html += '</div>';
    document.getElementById('licensesPagination').innerHTML = html;
}

// 查询设备
async function queryDevices() {
    const license = document.getElementById('deviceLicense').value.trim();
    if (!license) {
        showMessage('请输入激活码', 'error');
        return;
    }

    const result = await apiRequest('status', { license });
    if (result.success) {
        displayDevices(result.data, license);
        showMessage('查询成功', 'success');
    } else {
        showMessage(result.error || '查询失败', 'error');
    }
}

// 显示设备
function displayDevices(data, license) {
    if (!data.devices || data.devices.length === 0) {
        document.getElementById('devicesResult').innerHTML = '<div class="card"><div class="card-body"><div class="loading">该激活码暂无设备使用记录</div></div></div>';
        return;
    }

    let html = '<div class="card"><div class="card-header"><h3>设备列表</h3><button class="btn btn-sm" onclick="manageIPBinding(\'' + license + '\')">🔒 IP 绑定</button></div><table><thead><tr><th>设备 ID</th><th>首次激活</th><th>最后使用</th><th>首次 IP</th><th>最近 IP</th><th>状态</th><th>操作</th></tr></thead><tbody>';
    data.devices.forEach(device => {
        const status = device.isBanned ? '<span class="badge badge-danger">已封禁</span>' : '<span class="badge badge-success">正常</span>';
        const action = device.isBanned ?
            `<button class="btn btn-success btn-sm" onclick="unbanDevice('${license}', '${device.machineId}')">解封</button>` :
            `<button class="btn btn-danger btn-sm" onclick="banDevice('${license}', '${device.machineId}')">封禁</button>`;

        // IP 历史记录按钮
        const ipHistoryBtn = device.ipHistory && device.ipHistory.length > 0 ?
            `<button class="btn btn-sm" onclick="showIPHistory('${device.machineId}', ${JSON.stringify(device.ipHistory).replace(/"/g, '&quot;')})">历史</button>` : '';

        html += `<tr>
            <td><span class="code">${device.machineIdShort}</span></td>
            <td>${device.firstSeen}</td>
            <td>${device.lastSeen}</td>
            <td><span class="code">${device.firstIP || '未知'}</span></td>
            <td><span class="code">${device.lastIP || '未知'}</span> ${ipHistoryBtn}</td>
            <td>${status}</td>
            <td>${action}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    document.getElementById('devicesResult').innerHTML = html;
}

// 显示 IP 历史记录
function showIPHistory(machineId, ipHistory) {
    if (!ipHistory || ipHistory.length === 0) {
        alert('暂无 IP 历史记录');
        return;
    }

    let message = `设备 ${machineId.substring(0, 8)}... 的 IP 历史记录：\n\n`;
    ipHistory.forEach((record, index) => {
        const time = formatTime(record.time);
        message += `${index + 1}. ${record.ip} - ${time}\n`;
    });

    alert(message);
}

// 封禁设备
async function banDevice(license, machineId) {
    if (!confirm('确定要封禁这个设备吗？')) return;
    const result = await apiRequest('banDevice', { license, machineId });
    if (result.success) {
        showMessage('设备已封禁', 'success');
        queryDevices();
    } else {
        showMessage(result.error || '封禁失败', 'error');
    }
}

// 解封设备
async function unbanDevice(license, machineId) {
    if (!confirm('确定要解封这个设备吗？')) return;
    const result = await apiRequest('unbanDevice', { license, machineId });
    if (result.success) {
        showMessage('设备已解封', 'success');
        queryDevices();
    } else {
        showMessage(result.error || '解封失败', 'error');
    }
}

// 删除密钥
async function deleteLicense(license) {
    if (!confirm(`确定要删除密钥 ${license} 吗？此操作不可恢复！`)) return;
    const result = await apiRequest('deleteLicense', { license });
    if (result.success) {
        showMessage('密钥已删除', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '删除失败', 'error');
    }
}

// 编辑密钥
async function editLicense(license) {
    const licenseData = await getLicenseData(license);
    if (!licenseData) return;

    const customer = prompt('客户名称:', licenseData.customer);
    if (!customer) return;

    const expireDate = prompt('过期时间 (YYYY-MM-DD):', licenseData.expire.split(' ')[0]);
    if (!expireDate) return;

    const maxDevices = prompt('最大设备数:', licenseData.maxDevices);
    if (!maxDevices) return;

    const result = await apiRequest('updateLicense', {
        license,
        customer,
        expire: new Date(expireDate + ' 23:59:59').getTime(),
        maxDevices: parseInt(maxDevices)
    });

    if (result.success) {
        showMessage('密钥已更新', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '更新失败', 'error');
    }
}

// 获取密钥数据
async function getLicenseData(license) {
    const result = await apiRequest('list', { page: 1, pageSize: 1000 });
    if (result.success) {
        return result.data.licenses.find(l => l.license === license);
    }
    return null;
}

// 封禁密钥
async function banLicenseAction(license) {
    if (!confirm(`确定要封禁密钥 ${license} 吗？`)) return;
    const result = await apiRequest('ban', { license });
    if (result.success) {
        showMessage('密钥已封禁', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '封禁失败', 'error');
    }
}

// 解封密钥
async function unbanLicenseAction(license) {
    if (!confirm(`确定要解封密钥 ${license} 吗？`)) return;
    const result = await apiRequest('unbanLicense', { license });
    if (result.success) {
        showMessage('密钥已解封', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '解封失败', 'error');
    }
}

// 搜索密钥
async function searchLicenses() {
    const keyword = document.getElementById('searchKeyword').value.trim();
    const status = document.getElementById('statusFilter').value;

    const result = await apiRequest('searchLicense', { keyword, status });
    if (result.success) {
        displaySearchResults(result.data);
    } else {
        showMessage(result.error || '搜索失败', 'error');
    }
}

// 显示搜索结果
function displaySearchResults(licenses) {
    if (!licenses || licenses.length === 0) {
        document.getElementById('allLicenses').innerHTML = '<div class="loading">未找到匹配的密钥</div>';
        document.getElementById('licensesPagination').innerHTML = '';
        return;
    }

    let html = '<table><thead><tr><th>密钥</th><th>客户</th><th>过期时间</th><th>设备</th><th>状态</th><th>操作</th></tr></thead><tbody>';
    licenses.forEach(lic => {
        const status = lic.isBanned ? '<span class="badge badge-danger">已封禁</span>' :
            lic.isExpired ? '<span class="badge badge-warning">已过期</span>' :
                '<span class="badge badge-success">正常</span>';

        const banBtn = lic.isBanned ?
            `<button class="btn btn-success btn-sm" onclick="unbanLicenseAction('${lic.license}')">解封</button>` :
            `<button class="btn btn-warning btn-sm" onclick="banLicenseAction('${lic.license}')">封禁</button>`;

        html += `<tr>
            <td><span class="code">${lic.license}</span></td>
            <td>${lic.customer}</td>
            <td>${lic.expire}</td>
            <td>${lic.devicesUsed} / ${lic.maxDevices}</td>
            <td>${status}</td>
            <td>
                <button class="btn btn-sm" onclick="editLicense('${lic.license}')">编辑</button>
                ${banBtn}
                <button class="btn btn-danger btn-sm" onclick="deleteLicense('${lic.license}')">删除</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('allLicenses').innerHTML = html;
    document.getElementById('licensesPagination').innerHTML = `<div class="pagination"><span>共找到 ${licenses.length} 条记录</span></div>`;
}

// 导出数据
async function exportAllData() {
    const result = await apiRequest('exportData', {});
    if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `license-backup-${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showMessage('数据已导出', 'success');
    } else {
        showMessage(result.error || '导出失败', 'error');
    }
}

// 显示导入对话框
function showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!confirm('确定要导入数据吗？这将覆盖现有数据！')) return;

                const result = await apiRequest('importData', { data });
                if (result.success) {
                    showMessage('数据导入成功', 'success');
                    loadAllLicenses();
                    loadDashboard();
                } else {
                    showMessage(result.error || '导入失败', 'error');
                }
            } catch (error) {
                showMessage('文件格式错误', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 加载操作日志
let currentLogsPage = 1;
const logsPageSize = 50;
async function loadLogs(page = 1) {
    currentLogsPage = page;
    const result = await apiRequest('getLogs', {
        page: page,
        pageSize: logsPageSize
    });
    if (result.success) {
        displayLogs(result.data, result.total || 0);
    }
}

// 显示操作日志
function displayLogs(logs, total) {
    if (!logs || logs.length === 0) {
        document.getElementById('logsContainer').innerHTML = '<div class="loading">暂无日志</div>';
        document.getElementById('logsPagination').innerHTML = '';
        return;
    }

    let html = '<table><thead><tr><th>时间</th><th>操作</th><th>用户名</th><th>密钥</th><th>设备ID</th><th>IP</th></tr></thead><tbody>';
    logs.forEach(log => {
        // 设备 ID 显示前 8 位，鼠标悬停显示完整
        const machineIdDisplay = log.machineId ? log.machineId.substring(0, 8) + '...' : '-';
        const machineIdTitle = log.machineId || '';

        html += `<tr>
            <td>${log.timestamp}</td>
            <td>${log.action}</td>
            <td>${log.customer || '-'}</td>
            <td><span class="code">${log.license || '-'}</span></td>
            <td>${log.machineId ? '<span class="code" title="' + machineIdTitle + '">' + machineIdDisplay + '</span>' : '-'}</td>
            <td><span class="code">${log.ip || '-'}</span></td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('logsContainer').innerHTML = html;

    // 显示分页
    displayLogsPagination(total);
}

// 显示日志分页
function displayLogsPagination(total) {
    const totalPages = Math.ceil(total / logsPageSize);

    if (totalPages <= 1) {
        document.getElementById('logsPagination').innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';

    // 上一页按钮
    if (currentLogsPage > 1) {
        html += `<button class="btn btn-sm" onclick="loadLogs(${currentLogsPage - 1})">上一页</button>`;
    }

    // 页码信息
    html += `<span>第 ${currentLogsPage} / ${totalPages} 页 (共 ${total} 条记录)</span>`;

    // 下一页按钮
    if (currentLogsPage < totalPages) {
        html += `<button class="btn btn-sm" onclick="loadLogs(${currentLogsPage + 1})">下一页</button>`;
    }

    html += '</div>';
    document.getElementById('logsPagination').innerHTML = html;
}

// ==================== IP 绑定功能 ====================

// 管理 IP 绑定
async function manageIPBinding(license) {
    const result = await apiRequest('getIPBinding', { license });
    if (!result.success) {
        showMessage(result.error || '查询失败', 'error');
        return;
    }

    const data = result.data;
    const enabled = data.enabled || false;
    const allowedIPs = data.allowedIPs || [];

    // 构建对话框内容
    let message = `密钥: ${license}\n\n`;
    message += `当前状态: ${enabled ? '✅ 已启用（自动绑定）' : '❌ 未启用（等待首次激活）'}\n`;
    message += `允许的 IP (${allowedIPs.length}/2): ${allowedIPs.length > 0 ? allowedIPs.join(', ') : '无'}\n\n`;

    if (data.devices && data.devices.length > 0) {
        message += '设备 IP 历史:\n';
        data.devices.forEach((device, index) => {
            message += `${index + 1}. ${device.machineId}\n`;
            message += `   首次: ${device.firstIP || '未知'}\n`;
            message += `   最近: ${device.lastIP || '未知'}\n`;
        });
        message += '\n';
    }

    message += '请选择操作:\n';
    message += '1. 添加 IP 地址\n';
    message += '2. 删除 IP 地址\n';
    message += '3. 禁用 IP 绑定\n';
    message += '4. 取消';

    const choice = prompt(message, '4');

    if (choice === '1') {
        await addIPToWhitelist(license, allowedIPs);
    } else if (choice === '2') {
        await removeIPFromWhitelist(license, allowedIPs);
    } else if (choice === '3') {
        await disableIPBinding(license);
    }
}

// 从白名单删除 IP
async function removeIPFromWhitelist(license, currentIPs) {
    if (currentIPs.length === 0) {
        alert('当前没有绑定的 IP');
        return;
    }

    let message = '请选择要删除的 IP:\n\n';
    currentIPs.forEach((ip, index) => {
        message += `${index + 1}. ${ip}\n`;
    });

    const choice = prompt(message, '');
    if (!choice) return;

    const index = parseInt(choice) - 1;
    if (index < 0 || index >= currentIPs.length) {
        alert('无效的选择');
        return;
    }

    const ipToRemove = currentIPs[index];
    if (!confirm(`确定要删除 IP: ${ipToRemove} 吗？`)) return;

    const updatedIPs = currentIPs.filter((_, i) => i !== index);

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: updatedIPs.length > 0,
        allowedIPs: updatedIPs
    });

    if (result.success) {
        showMessage(`已删除 IP: ${ipToRemove}`, 'success');
        queryDevices();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 添加 IP 到白名单
async function addIPToWhitelist(license, currentIPs) {
    // 检查 IP 数量限制
    if (currentIPs.length >= 2) {
        alert('每个密钥最多只能绑定 2 个 IP 地址\n\n如需添加新 IP，请先删除现有 IP');
        return;
    }

    const newIP = prompt('请输入要添加的 IP 地址:', '');
    if (!newIP || !newIP.trim()) return;

    const ip = newIP.trim();
    if (currentIPs.includes(ip)) {
        alert('该 IP 已在白名单中');
        return;
    }

    const updatedIPs = [...currentIPs, ip];

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: true,
        allowedIPs: updatedIPs
    });

    if (result.success) {
        showMessage(`已添加 IP: ${ip}`, 'success');
        queryDevices();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 启用 IP 绑定
async function enableIPBinding(license, currentIPs) {
    if (currentIPs.length === 0) {
        alert('请先设置 IP 白名单');
        await setIPWhitelist(license, false);
        return;
    }

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: true,
        allowedIPs: currentIPs
    });

    if (result.success) {
        showMessage('IP 绑定已启用', 'success');
        queryDevices();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 禁用 IP 绑定
async function disableIPBinding(license) {
    if (!confirm('确定要禁用 IP 绑定吗？')) return;

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: false
    });

    if (result.success) {
        showMessage('IP 绑定已禁用', 'success');
        queryDevices();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 设置 IP 白名单
async function setIPWhitelist(license, currentEnabled) {
    const ipsText = prompt('请输入允许的 IP 地址（每行一个）:\n\n例如:\n192.168.1.100\n10.0.0.50', '');
    if (ipsText === null) return;

    const allowedIPs = ipsText.split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

    if (allowedIPs.length === 0) {
        alert('请至少输入一个 IP 地址');
        return;
    }

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: currentEnabled,
        allowedIPs
    });

    if (result.success) {
        showMessage('IP 白名单已更新', 'success');
        queryDevices();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 从密钥列表管理 IP 绑定
async function manageIPBindingFromList(license) {
    const result = await apiRequest('getIPBinding', { license });
    if (!result.success) {
        showMessage(result.error || '查询失败', 'error');
        return;
    }

    const data = result.data;
    const enabled = data.enabled || false;
    const allowedIPs = data.allowedIPs || [];

    // 构建对话框内容
    let message = `密钥: ${license}\n\n`;
    message += `当前状态: ${enabled ? '✅ 已启用（自动绑定）' : '❌ 未启用（等待首次激活）'}\n`;
    message += `允许的 IP (${allowedIPs.length}/2): ${allowedIPs.length > 0 ? allowedIPs.join(', ') : '无'}\n\n`;

    if (data.devices && data.devices.length > 0) {
        message += '设备 IP 历史:\n';
        data.devices.forEach((device, index) => {
            message += `${index + 1}. ${device.machineId}\n`;
            message += `   首次: ${device.firstIP || '未知'}\n`;
            message += `   最近: ${device.lastIP || '未知'}\n`;
        });
        message += '\n';
    }

    message += '请选择操作:\n';
    message += '1. 添加 IP 地址\n';
    message += '2. 删除 IP 地址\n';
    message += '3. 禁用 IP 绑定\n';
    message += '4. 取消';

    const choice = prompt(message, '4');

    if (choice === '1') {
        await addIPToWhitelistFromList(license, allowedIPs);
    } else if (choice === '2') {
        await removeIPFromWhitelistFromList(license, allowedIPs);
    } else if (choice === '3') {
        await disableIPBindingFromList(license);
    }
}

// 从列表删除 IP
async function removeIPFromWhitelistFromList(license, currentIPs) {
    if (currentIPs.length === 0) {
        alert('当前没有绑定的 IP');
        return;
    }

    let message = '请选择要删除的 IP:\n\n';
    currentIPs.forEach((ip, index) => {
        message += `${index + 1}. ${ip}\n`;
    });

    const choice = prompt(message, '');
    if (!choice) return;

    const index = parseInt(choice) - 1;
    if (index < 0 || index >= currentIPs.length) {
        alert('无效的选择');
        return;
    }

    const ipToRemove = currentIPs[index];
    if (!confirm(`确定要删除 IP: ${ipToRemove} 吗？`)) return;

    const updatedIPs = currentIPs.filter((_, i) => i !== index);

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: updatedIPs.length > 0,
        allowedIPs: updatedIPs
    });

    if (result.success) {
        showMessage(`已删除 IP: ${ipToRemove}`, 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 从列表添加 IP 到白名单
async function addIPToWhitelistFromList(license, currentIPs) {
    // 检查 IP 数量限制
    if (currentIPs.length >= 2) {
        alert('每个密钥最多只能绑定 2 个 IP 地址\n\n如需添加新 IP，请先删除现有 IP');
        return;
    }

    const newIP = prompt('请输入要添加的 IP 地址:', '');
    if (!newIP || !newIP.trim()) return;

    const ip = newIP.trim();
    if (currentIPs.includes(ip)) {
        alert('该 IP 已在白名单中');
        return;
    }

    const updatedIPs = [...currentIPs, ip];

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: true,
        allowedIPs: updatedIPs
    });

    if (result.success) {
        showMessage(`已添加 IP: ${ip}`, 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 从列表启用 IP 绑定
async function enableIPBindingFromList(license, currentIPs) {
    if (currentIPs.length === 0) {
        alert('请先设置 IP 白名单');
        await setIPWhitelistFromList(license, false);
        return;
    }

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: true,
        allowedIPs: currentIPs
    });

    if (result.success) {
        showMessage('IP 绑定已启用', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 从列表禁用 IP 绑定
async function disableIPBindingFromList(license) {
    if (!confirm('确定要禁用 IP 绑定吗？')) return;

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: false
    });

    if (result.success) {
        showMessage('IP 绑定已禁用', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 从列表设置 IP 白名单
async function setIPWhitelistFromList(license, currentEnabled) {
    const ipsText = prompt('请输入允许的 IP 地址（每行一个）:\n\n例如:\n192.168.1.100\n10.0.0.50', '');
    if (ipsText === null) return;

    const allowedIPs = ipsText.split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

    if (allowedIPs.length === 0) {
        alert('请至少输入一个 IP 地址');
        return;
    }

    const result = await apiRequest('updateIPBinding', {
        license,
        enabled: currentEnabled,
        allowedIPs
    });

    if (result.success) {
        showMessage('IP 白名单已更新', 'success');
        loadAllLicenses();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}


// ==================== 激活审核功能 ====================

// 加载待审核 IP 列表
async function loadPendingIPs() {
    const result = await apiRequest('listPendingIPs', {});
    if (result.success) {
        displayPendingIPs(result.data);
    } else {
        document.getElementById('pendingIPsContainer').innerHTML = '<div class="loading">加载失败</div>';
    }
}

// 显示待审核 IP
function displayPendingIPs(list) {
    if (!list || list.length === 0) {
        document.getElementById('pendingIPsContainer').innerHTML = '<div class="loading">暂无待审核的激活请求</div>';
        return;
    }

    let html = '<table><thead><tr><th>IP 地址</th><th>设备 ID</th><th>激活时间</th><th>最后活跃</th><th>任务次数</th><th>剩余时间</th><th>操作</th></tr></thead><tbody>';
    list.forEach(item => {
        const taskInfo = `${item.taskCount || 0} / 10`;
        const taskBadge = (item.taskCount || 0) >= 10 ? 'badge-danger' : 'badge-info';
        // 显示设备ID前8位，鼠标悬停显示完整ID
        const deviceIdShort = item.machineIdFull ? item.machineIdFull.substring(0, 8) + '...' : '-';
        html += `<tr>
            <td><span class="code">${item.ip}</span></td>
            <td><span class="code" title="${item.machineIdFull || ''}">${deviceIdShort}</span></td>
            <td>${item.createdAt}</td>
            <td>${item.lastSeen || '-'}</td>
            <td><span class="badge ${taskBadge}">${taskInfo}</span></td>
            <td><span class="badge badge-warning">${item.remaining}</span></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="approveIPAction('${item.ip}')">✅ 通过</button>
                <button class="btn btn-danger btn-sm" onclick="rejectIPAction('${item.ip}')">❌ 拒绝</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('pendingIPsContainer').innerHTML = html;
}

// 审核通过
async function approveIPAction(ip) {
    if (!confirm(`确定要通过 IP: ${ip} 的激活申请吗？\n\n通过后该 IP 可永久使用插件。`)) return;

    const result = await apiRequest('approveIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已通过审核`, 'success');
        loadPendingIPs();
        loadApprovedIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 拒绝激活
async function rejectIPAction(ip) {
    if (!confirm(`确定要拒绝 IP: ${ip} 的激活申请吗？`)) return;

    const result = await apiRequest('rejectIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已拒绝`, 'success');
        loadPendingIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 加载已通过 IP 列表
async function loadApprovedIPs() {
    const result = await apiRequest('listApprovedIPs', {});
    console.log('loadApprovedIPs result:', result); // 调试信息
    if (result.success) {
        console.log('Approved IPs data:', result.data); // 调试信息
        displayApprovedIPs(result.data);
    } else {
        document.getElementById('approvedIPsContainer').innerHTML = '<div class="loading">加载失败</div>';
    }
}

// 显示已通过 IP
function displayApprovedIPs(list) {
    if (!list || list.length === 0) {
        document.getElementById('approvedIPsContainer').innerHTML = '<div class="loading">暂无已通过的 IP</div>';
        return;
    }

    console.log('displayApprovedIPs - 开始渲染，数据条数:', list.length);
    console.log('displayApprovedIPs - 第一条数据:', list[0]);
    console.log('displayApprovedIPs - 第一条数据类型:', typeof list[0]);

    let html = '<table><thead><tr><th>IP 地址</th><th>设备 ID</th><th>通过时间</th><th>最近操作</th><th>操作</th></tr></thead><tbody>';
    list.forEach((item, index) => {
        // 兼容旧格式（字符串）和新格式（对象）
        const ip = typeof item === 'string' ? item : (item.ip || '');
        const machineId = typeof item === 'object' ? (item.machineId || '') : '';
        const approvedAt = typeof item === 'object' ? (item.approvedAt || '-') : '-';
        const lastSeen = typeof item === 'object' ? (item.lastSeen || '-') : '-';

        if (index === 0) {
            console.log('displayApprovedIPs - 解析后的数据:', { ip, machineId, approvedAt, lastSeen });
        }

        // 设备 ID 显示：如果有值则显示前8位，否则显示 -
        const machineIdDisplay = machineId ? machineId.substring(0, 8) + '...' : '-';

        html += `<tr>
            <td><span class="code">${ip}</span></td>
            <td><span class="code" title="${machineId}">${machineIdDisplay}</span></td>
            <td>${approvedAt}</td>
            <td>${lastSeen}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removeApprovedIPAction('${ip}')">🗑️ 移除</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    html += `<div class="hint" style="margin-top: 10px;">共 ${list.length} 个已授权 IP</div>`;
    document.getElementById('approvedIPsContainer').innerHTML = html;
}

// 移除已通过 IP
async function removeApprovedIPAction(ip) {
    if (!confirm(`确定要移除 IP: ${ip} 吗？\n\n移除后该 IP 将无法使用插件。`)) return;

    const result = await apiRequest('removeApprovedIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已移除`, 'success');
        loadApprovedIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}


// 加载被拒绝 IP 列表
async function loadRejectedIPs() {
    const result = await apiRequest('listRejectedIPs', {});
    if (result.success) {
        displayRejectedIPs(result.data);
    } else {
        document.getElementById('rejectedIPsContainer').innerHTML = '<div class="loading">加载失败</div>';
    }
}

// 显示被拒绝 IP
function displayRejectedIPs(list) {
    if (!list || list.length === 0) {
        document.getElementById('rejectedIPsContainer').innerHTML = '<div class="loading">暂无被拒绝的 IP</div>';
        return;
    }

    let html = '<table><thead><tr><th>IP 地址</th><th>操作</th></tr></thead><tbody>';
    list.forEach(ip => {
        html += `<tr>
            <td><span class="code">${ip}</span></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="unrejectIPAction('${ip}')">🔄 恢复</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    html += `<div class="hint" style="margin-top: 10px;">共 ${list.length} 个被拒绝 IP</div>`;
    document.getElementById('rejectedIPsContainer').innerHTML = html;
}

// 恢复被拒绝的 IP
async function unrejectIPAction(ip) {
    if (!confirm(`确定要恢复 IP: ${ip} 吗？\n\n恢复后该 IP 可以重新申请激活。`)) return;

    const result = await apiRequest('unrejectIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已恢复`, 'success');
        loadRejectedIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 手动封禁 IP
async function manualBanIP() {
    const input = document.getElementById('banIPInput');
    const ip = input.value.trim();

    if (!ip) {
        showMessage('请输入要封禁的 IP 地址', 'error');
        return;
    }

    // 简单验证 IP 格式
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        showMessage('请输入有效的 IP 地址格式（如 192.168.1.1）', 'error');
        return;
    }

    if (!confirm(`确定要封禁 IP: ${ip} 吗？\n\n封禁后该 IP 无法使用插件。`)) return;

    const result = await apiRequest('rejectIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已封禁`, 'success');
        input.value = ''; // 清空输入框
        loadRejectedIPs();
    } else {
        showMessage(result.error || '封禁失败', 'error');
    }
}
