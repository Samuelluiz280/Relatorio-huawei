// ==UserScript==
// @name         Huawei AX2 Info Collector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Coleta informações específicas do Huawei WiFi AX2
// @author       Você
// @match        http://*/html/index.html
// @grant        none
// ==/UserScript==

(async function() {
  'use strict';

  const ip = window.location.hostname;
  const baseURL = `http://${ip}/api/`;
  const headers = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  async function fetchJson(endpoint) {
    try {
      const res = await fetch(baseURL + endpoint, { headers });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      return await res.json();
    } catch(e) {
      console.warn(`Erro fetch ${endpoint}:`, e.message);
      return null;
    }
  }

  // Coletar dados de cada endpoint
  const deviceInfo = await fetchJson('system/deviceinfo');
  const wanDsl = await fetchJson('ntwk/wan_dsl');
  const lanDhcp = await fetchJson('ntwk/lan_dhcp');
  const lanUpnp = await fetchJson('ntwk/lan_upnp');
  const ipv6 = await fetchJson('ntwk/ipv6');
  const wifiBasic = await fetchJson('ntwk/wifi_basic');
  const wifiAdvanced = await fetchJson('ntwk/wifi_advanced');

  // Extrair dados com fallback para 'Desconhecido'
  const modelo = deviceInfo?.FriendlyName || deviceInfo?.ModelName || 'Desconhecido';
  const firmware = deviceInfo?.SoftwareVersion || 'Desconhecido';

  const dnsWAN = wanDsl ? `${wanDsl.dns1 || '-'} / ${wanDsl.dns2 || '-'}` : 'Desconhecido';
  const dnsLAN = lanDhcp ? `${lanDhcp.dns1 || '-'} / ${lanDhcp.dns2 || '-'}` : 'Desconhecido';

  const priorizar5G = (wifiAdvanced?.EnableSmartConnect === true) ? 'Habilitado' : 'Desabilitado';

  const upnpStatus = lanUpnp?.enable === true ? 'Habilitado' : 'Desabilitado';

  const ipv6Status = ipv6?.EnableIPv6 ? 'Habilitado' : 'Desabilitado';

  // Rede 2.4G - largura e canal
  const wifi24 = wifiBasic?.WifiBasic?.find(w => w.Name?.includes('2.4G')) || wifiBasic?.WifiBasic || {};
  const largura24 = wifi24?.Bandwidth || 'Desconhecido';
  const canal24 = wifi24?.Channel || 'Desconhecido';

  // Rede 5G - largura e canal
  const wifi5 = wifiBasic?.WifiBasic?.find(w => w.Name?.includes('5G')) || wifiBasic?.WifiBasic || {};
  const largura5 = wifi5?.Bandwidth || 'Desconhecido';
  const canal5 = wifi5?.Channel || 'Desconhecido';

  // Uptime - do deviceInfo (em segundos) para string legível
  const uptimeSeg = parseInt(deviceInfo?.UpTime || 0);
  let uptimeStr = 'Desconhecido';
  if (uptimeSeg > 0) {
    const dias = Math.floor(uptimeSeg / 86400);
    const horas = Math.floor((uptimeSeg % 86400) / 3600);
    const minutos = Math.floor((uptimeSeg % 3600) / 60);
    uptimeStr = `${dias} dia${dias !== 1 ? 's' : ''} ${horas} hora${horas !== 1 ? 's' : ''} ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
  }

  // Montar output formatado
  const output = `
[Configurações do Roteador]
Modelo: ${modelo}
Firmware: ${firmware}
DNS WAN: ${dnsWAN}
DNS LAN: ${dnsLAN}
Priorizar 5G: ${priorizar5G}
UPNP: ${upnpStatus}
IPv6 Habilitado: ${ipv6Status}
Rede 2.4G - Largura: ${largura24} | Canal: ${canal24}
Rede 5G - Largura: ${largura5} | Canal: ${canal5}
Uptime: ${uptimeStr}
  `.trim();

  // Criar textarea copiável e botão copiar
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.width = '360px';
  container.style.padding = '10px';
  container.style.background = '#f9f9f9';
  container.style.border = '2px solid #444';
  container.style.borderRadius = '8px';
  container.style.zIndex = 9999;
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '13px';
  container.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';

  const textArea = document.createElement('textarea');
  textArea.value = output;
  textArea.style.width = '100%';
  textArea.style.height = '220px';
  textArea.readOnly = true;
  textArea.style.resize = 'none';

  const btnCopy = document.createElement('button');
  btnCopy.textContent = 'Copiar texto';
  btnCopy.style.marginTop = '8px';
  btnCopy.style.width = '100%';
  btnCopy.style.cursor = 'pointer';

  btnCopy.onclick = () => {
    textArea.select();
    document.execCommand('copy');
    btnCopy.textContent = 'Copiado!';
    setTimeout(() => btnCopy.textContent = 'Copiar texto', 1500);
  };

  container.appendChild(textArea);
  container.appendChild(btnCopy);
  document.body.appendChild(container);

})();
