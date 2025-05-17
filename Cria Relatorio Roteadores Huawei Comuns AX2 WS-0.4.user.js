// ==UserScript==
// @name         Huawei Router Info Collector
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Coleta informações úteis de roteadores Huawei (modelo, uptime, dispositivos conectados, etc.)
// @author       Samuka
// @match        https://187.85.156.88/html/index.html#/home
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    const ip = window.location.hostname;
    const baseURL = `http://${ip}/api/`;
    const headers = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };

    const fetchJson = async (endpoint) => {
        try {
            const response = await fetch(baseURL + endpoint, { headers });
            if (!response.ok) throw new Error(`Erro ao buscar ${endpoint}`);
            return await response.json();
        } catch (err) {
            console.warn(`Falha em ${endpoint}:`, err);
            return null;
        }
    };

    const formatUptime = (secs) => {
        secs = Number(secs);
        if (isNaN(secs)) return 'Desconhecido';
        const d = Math.floor(secs / 86400);
        const h = Math.floor((secs % 86400) / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        let str = '';
        if (d) str += `${d} dias `;
        if (h) str += `${h} horas `;
        if (m) str += `${m} minutos `;
        if (s || (!d && !h && !m)) str += `${s} segundos`;
        return str.trim();
    };

    const deviceInfo = await fetchJson('system/deviceinfo');
    const uptime = deviceInfo?.UpTime ? formatUptime(deviceInfo.UpTime) : 'Desconhecido';
    const modelo = deviceInfo?.FriendlyName || 'Modelo desconhecido';

    const upnpData = await fetchJson('ntwk/lan_upnp');
    const upnp = upnpData?.enable === true ? 'Ativado' : 'Desativado';

    const dnsData = await fetchJson('ntwk/wan_dsl');
    const dns = dnsData ? `${dnsData.dns1 || '-'} / ${dnsData.dns2 || '-'}` : 'Indisponível';

    const hostData = await fetchJson('system/HostInfo');
    const hosts = Array.isArray(hostData) ? hostData : (hostData ? [hostData] : []);
    const ativos = hosts.filter(d => d.Active);
    const wifi2g = ativos.filter(d => d.Frequency === '2.4GHz');
    const wifi5g = ativos.filter(d => d.Frequency === '5GHz');
    const cabo = ativos.filter(d => d.Layer2Interface?.includes('LAN'));

    const dispositivos = {
        total: ativos.length,
        wifi2g: wifi2g.length,
        wifi5g: wifi5g.length,
        cabo: cabo.length
    };

    const output = `
📡 Modelo: ${modelo}
⏱️ Uptime: ${uptime}
🌐 DNS: ${dns}
🔁 UPnP: ${upnp}

📶 Dispositivos Conectados:
- Total: ${dispositivos.total}
- Wi-Fi 2.4GHz: ${dispositivos.wifi2g}
- Wi-Fi 5GHz: ${dispositivos.wifi5g}
- Cabo (LAN): ${dispositivos.cabo}
    `.trim();

    // Cria container fixo para textarea + botão
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.width = '320px';
    container.style.background = '#f9f9f9';
    container.style.border = '2px solid #555';
    container.style.borderRadius = '8px';
    container.style.padding = '10px';
    container.style.zIndex = 9999;
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '13px';
    container.style.color = '#222';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    // Textarea para saída
    const textArea = document.createElement('textarea');
    textArea.value = output;
    textArea.style.width = '100%';
    textArea.style.height = '180px';
    textArea.style.resize = 'none';
    textArea.readOnly = true;

    // Botão copiar texto
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar texto';
    copyBtn.style.marginTop = '8px';
    copyBtn.style.padding = '5px 10px';
    copyBtn.style.cursor = 'pointer';

    copyBtn.addEventListener('click', () => {
        textArea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copiado!';
        setTimeout(() => (copyBtn.textContent = 'Copiar texto'), 2000);
    });

    container.appendChild(textArea);
    container.appendChild(copyBtn);
    document.body.appendChild(container);

})();
