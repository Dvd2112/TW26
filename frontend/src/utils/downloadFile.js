import axios from 'axios';
import { message } from 'antd';

/**
 * Baixa um arquivo de um endpoint autenticado via axios (blob). Um link direto
 * (`<a href>`) não serve: no dev server do CRA a navegação cai no index.html em vez do proxy.
 */
export default async function downloadFile(url, fallbackName = 'arquivo') {
  try {
    const res = await axios.get(url, { responseType: 'blob' });
    const disposition = res.headers['content-disposition'] ?? '';
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
    URL.revokeObjectURL(href);
  } catch (err) {
    // Em respostas blob o corpo de erro (JSON) também vem como Blob.
    let text = 'Erro ao baixar o arquivo.';
    try {
      text = JSON.parse(await err.response.data.text()).message ?? text;
    } catch { /* mantém a mensagem padrão */ }
    message.error(text);
  }
}
