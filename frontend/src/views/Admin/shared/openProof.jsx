import { Modal, message } from 'antd';
import axios from 'axios';

/**
 * Mostra o comprovante (imagem/PDF) num modal. Busca via axios (com o cookie de
 * sessão) e usa um blob: uma navegação direta ao PHP não passa pelo proxy do CRA
 * em desenvolvimento. Não usa window.open após o await — no mobile o navegador
 * bloqueia o popup, pois deixa de ser um gesto direto do usuário. O link "Abrir
 * em nova aba" é um toque real, então funciona (inclusive para PDF).
 */
export async function openProof(id, { url: endpoint = '/TW26/backend/api/admin/payment-proof.php', param = 'payment_id' } = {}) {
  let url;
  try {
    const res = await axios.get(endpoint, {
      params: { [param]: id },
      responseType: 'blob',
    });
    url = URL.createObjectURL(res.data);
    const isPdf = res.data.type === 'application/pdf';

    Modal.info({
      title: 'Comprovante',
      icon: null,
      width: 'min(92vw, 720px)',
      centered: true,
      maskClosable: true,
      okText: 'Fechar',
      afterClose: () => URL.revokeObjectURL(url),
      content: (
        <div style={{ textAlign: 'center' }}>
          {isPdf ? (
            <p style={{ color: '#D9D9D9' }}>Este comprovante é um PDF.</p>
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt="Comprovante de pagamento"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 8 }}
              />
            </a>
          )}
          <p style={{ marginTop: 12 }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#BF40FF', fontWeight: 600 }}>
              {isPdf ? 'Abrir PDF' : 'Abrir em nova aba (ampliar)'}
            </a>
          </p>
        </div>
      ),
    });
  } catch {
    if (url) URL.revokeObjectURL(url);
    message.error('Não foi possível abrir o comprovante.');
  }
}
