import { QRCodeSVG } from 'qrcode.react';
import styles from '../../styles/Account.module.css';

export default function CheckinCard({ user }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Meu código de check-in</h3>
      <p className={styles.line}>
        Mostre este QR code ao credenciador na entrada das oficinas e palestras.
        Se a câmera não ler, ele pode digitar o código abaixo.
      </p>
      {user.checkin_code ? (
        <>
          <div className={styles.qrBox}>
            <QRCodeSVG value={user.checkin_code} size={180} level="M" />
          </div>
          <p className={styles.code}>{user.checkin_code}</p>
        </>
      ) : (
        <p className={styles.line}>Código indisponível. Fale com a organização.</p>
      )}
    </div>
  );
}
