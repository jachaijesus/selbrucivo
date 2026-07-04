import './LoginUI.css';

type LoginUIProps = {
  isTransitioning: boolean;
  transitionDirection?: 'enter' | 'exit';
  onAccess: () => void;
};

export function LoginUI({ isTransitioning, transitionDirection = 'enter', onAccess }: LoginUIProps) {
  const isEntering = isTransitioning && transitionDirection === 'enter';
  const isExiting = isTransitioning && transitionDirection === 'exit';

  return (
    <main
      className={[
        'login-entry',
        isEntering ? 'is-deconstructing' : '',
        isExiting ? 'is-reconstructing' : '',
      ].join(' ')}
      id="entry"
    >
      <section className="login-composition" aria-labelledby="selbrucivo-title">
        <header className="login-masthead transition-source source-masthead">
          <div className="system-strip" aria-hidden="true">THRESHOLD :: INSTITUTIONAL</div>
          <h1 id="selbrucivo-title">SELBRUCIVO</h1>
        </header>

        <section className="study transition-source source-study" aria-label="Academia introduction">
          <p className="subtitle">The Academia of Self</p>
          <p className="axiom">ARCHIVE FOR THE STUDY OF INTERIOR BEHAVIOR</p>
          <div className="mark-field" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="access-panel transition-source source-access" aria-label="Enter the system">
          <header aria-hidden="true">
            <span>Members and fellows</span>
            <span>Reading room</span>
          </header>

          <form
            id="access-form"
            onSubmit={(event) => {
              event.preventDefault();
              onAccess();
            }}
          >
            <p className="access-title">Enter archive</p>
            <p className="access-context">A quiet passage into the Academy's living collection.</p>

            <div className="field-row">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" defaultValue="lorem@selbrucivo.edu" />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" defaultValue="password" />
              </div>
            </div>

            <div className="access-line">
              <p className="microcopy">FOR STUDY OF SELF</p>
              <button type="submit" disabled={isTransitioning}>Access</button>
            </div>
          </form>
        </section>

        <div className="artifact-meta transition-source source-meta" aria-hidden="true">
          <span>SEL/ARC-00</span>
          <span>STABLE +</span>
          <span>X:031 Y:144</span>
        </div>

        <div className="ascii-field transition-source source-ascii" aria-hidden="true">
          <span>[CAT 01.314]</span>
          <span>SIGNAL QUIET</span>
          <span>LAT 00 / NODE DORMANT</span>
          <span>:: ARCHIVE INDEX</span>
          <span>+ + +</span>
        </div>

        <footer className="module-footer" aria-hidden="true">
          <div>Enter the system</div>
          <div>Discover the sphere</div>
        </footer>

        <div className="discovery" aria-hidden="true">
          <span className="orbital-mark" />
        </div>
      </section>
    </main>
  );
}
