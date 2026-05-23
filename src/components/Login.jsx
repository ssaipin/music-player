import styles from './Login.module.css'

export default function Login({ onLogin }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.window}>
        <div className={styles.titleBar}>
          <span className={styles.titleText}>TAPE PLAYER v1.0</span>
          <div className={styles.closeBtn}>✕</div>
        </div>

        <div className={styles.body}>
          <div className={styles.tapeArea}>
            <img src="/Tape_1.png" alt="cassette tape" className={styles.tapeImg} />
          </div>

          <p className={styles.tagline}>♪ your music. your tape. ♪</p>

          <button className={styles.loginBtn} onClick={onLogin}>
            ▶ LOGIN WITH SPOTIFY
          </button>

          <p className={styles.note}>requires spotify premium</p>
        </div>
      </div>
    </div>
  )
}
