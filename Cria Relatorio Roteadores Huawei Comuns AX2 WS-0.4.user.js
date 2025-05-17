// ==UserScript==
// @name         Huawei Router Info Collector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Coleta informações úteis de roteadores Huawei (modelo, uptime, dispositivos conectados, etc.)
// @author       Você
// @match        http://*/html/index.html
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

    const getUptime = async () => {
        const data = await fetchJson('system/deviceinfo');
        if (!data || !data.UpTime) return 'Desconhecido';
        const uptime = parseInt(data.UpTime);
        if (uptime >= 86400) return `${Math.floor(uptime / 86400)} dias`;
        if (uptime >= 3600) return `${Math.floor(uptime / 3600)} horas`;
        if (uptime >= 60) return `${Math.floor(uptime / 60)} minutos`;
        return `${uptime} segundos`;
    };

    const getModelo = async () => {
        const data = await fetchJson('system/deviceinfo');
        return data?.FriendlyName || 'Modelo desconhecido';
    };

    const getUPnP = async () => {
        const data = await fetchJson('ntwk/lan_upnp');
        return data?.enable === true ? 'Ativado' : 'Desativado';
    };

    const getDNS = async () => {
        const data = await fetchJson('ntwk/wan_dsl');
        return data ? `${data.dns1 || '-'} / ${data.dns2 || '-'}` : 'Indisponível';
    };

    const getDispositivos = async () => {
        const data = await fetchJson('system/HostInfo');
        if (!data || !Array.isArray(data)) return null;
        const ativos = data.filter(d => d.Active);
        const wifi2g = ativos.filter(d => d.Frequency === '2.4GHz');
        const wifi5g = ativos.filter(d => d.Frequency === '5GHz');
        const cabo = ativos.filter(d => d.Layer2Interface?.includes('LAN'));
        return {
            total: ativos.length,
            wifi2g: wifi2g.length,
            wifi5g: wifi5g.length,
            cabo: cabo.length
        };
    };

    // Coleta todas as informações
    const [uptime, modelo, upnp, dns, dispositivos] = await Promise.all([
        getUptime(),
        getModelo(),
        getUPnP(),
        getDNS(),
        getDispositivos()
    ]);

    const output = `
📡 Modelo: ${modelo}
⏱️ Uptime: ${uptime}
🌐 DNS: ${dns}
🔁 UPnP: ${upnp}

📶 Dispositivos Conectados:
- Total: ${dispositivos?.total ?? 'Indisponível'}
- Wi-Fi 2.4GHz: ${dispositivos?.wifi2g ?? 'Indisponível'}
- Wi-Fi 5GHz: ${dispositivos?.wifi5g ?? 'Indisponível'}
- Cabo (LAN): ${dispositivos?.cabo ?? 'Indisponível'}
    `.trim();

    // Exibe em um textarea copiável
    const textArea = document.createElement('textarea');
    textArea.value = output;
    textArea.style.position = 'fixed';
    textArea.style.top = '20px';
    textArea.style.right = '20px';
    textArea.style.width = '300px';
    textArea.style.height = '250px';
    textArea.style.zIndex = 9999;
    textArea.style.padding = '10px';
    textArea.style.border = '2px solid #555';
    textArea.style.borderRadius = '8px';
    textArea.style.background = '#f9f9f9';
    textArea.style.fontSize = '13px';
    textArea.style.fontFamily = 'monospace';
    textArea.readOnly = true;
    document.body.appendChild(textArea);
})();
