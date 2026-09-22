import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from '../../styles/QrScanner.module.css';

/** Id fixo: a lib monta o <video> dentro de um elemento buscado por id. */
const CONTAINER_ID = 'tw26-qr-reader';

/**
 * Leitor de QR pela câmera do dispositivo.
 *
 * `active` liga/desliga a câmera — desligar ao trocar de aba é importante,
 * senão a câmera continua ativa em segundo plano.
 * `onScan(texto)` é chamado a cada leitura; o controle de leitura repetida do
 * mesmo QR fica com quem usa o componente (a câmera lê o mesmo código várias
 * vezes por segundo enquanto ele está enquadrado).
 */
export default function QrScanner({ active = true, onScan }) {
  // A mesma instância e a mesma Promise de start() são reaproveitadas entre as
  // duas execuções do efeito que o StrictMode faz em dev (mount → cleanup →
  // mount): criar duas instâncias disputando a câmera ao mesmo tempo é o que
  // faz o navegador abortar o play() de uma delas ("fetching process...
  // aborted", reportado como erro não tratado pelo overlay do CRA).
  const scannerRef = useRef(null);
  const startPromiseRef = useRef(null);
  // Token do efeito "dono" da Promise de start() atual. O cleanup só para a
  // câmera se ainda for o dono quando o start() terminar — se uma execução
  // mais nova do efeito (o remount real do StrictMode) já reivindicou o
  // scanner, o stop() do cleanup antigo é pulado.
  const ownerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState(null);

  // Mantém o callback atual sem reiniciar a câmera a cada render do pai.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return undefined;

    const token = {};
    ownerRef.current = token;

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(CONTAINER_ID, { verbose: false });
    }
    const scanner = scannerRef.current;

    if (!startPromiseRef.current) {
      startPromiseRef.current = scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => onScanRef.current?.(text),
          () => {}, // erro por quadro sem QR: silencioso, acontece o tempo todo
        )
        .then(() => {
          // Limpa um erro de tentativa anterior (ex.: usuário negou a câmera e
          // tentou de novo saindo e voltando pra aba).
          if (ownerRef.current === token) setError(null);
        })
        .catch((err) => {
          if (ownerRef.current === token) {
            setError(
              'Não foi possível abrir a câmera. Autorize o acesso no navegador '
              + '(a câmera só funciona em HTTPS) ou use a opção de digitar o código.',
            );
          }
          throw err;
        });
    }
    const startPromise = startPromiseRef.current;

    return () => {
      // Só mexe no scanner depois que o start() em andamento resolver — parar
      // no meio da inicialização é o que causa o erro de fetch abortado.
      startPromise
        .then(() => (ownerRef.current === token && scanner.isScanning ? scanner.stop() : undefined))
        .then(() => (ownerRef.current === token ? scanner.clear() : undefined))
        .catch(() => {})
        .finally(() => {
          // Só libera a Promise compartilhada se ninguém mais assumiu o scanner
          // nesse meio tempo — senão cancelaríamos o start() da execução atual.
          if (ownerRef.current === token) {
            startPromiseRef.current = null;
          }
        });
    };
  }, [active]);

  return (
    <div className={styles.wrapper}>
      <div id={CONTAINER_ID} className={styles.reader} />
      {error
        ? <p className={styles.error}>{error}</p>
        : <p className={styles.hint}>Aponte para o QR code do participante.</p>}
    </div>
  );
}
