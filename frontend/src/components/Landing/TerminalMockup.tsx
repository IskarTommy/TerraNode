const termCSS = `
.terminal {
  max-width: 640px;
  margin: 3.5rem auto 0;
  background: #040D1C;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.06);
}
.terminal-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  background: #020610;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.terminal-dot {
  width: 11px; height: 11px;
  border-radius: 50%;
}
.terminal-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-family-mono);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.03em;
}
.t-body {
  padding: 1.25rem 1.25rem 1rem;
  font-family: var(--font-family-mono);
  font-size: 0.8rem;
  line-height: 1.85;
  color: rgba(255,255,255,0.7);
}
.t-prompt { color: #22d3ee; user-select: none; }
.t-cmd { color: rgba(255,255,255,0.82); }
.t-ok { color: #34d399; }
.t-hash { color: #fbbf24; }
.t-val { color: #c4b5fd; }
.t-comment { color: rgba(255,255,255,0.28); font-style: italic; }
.t-cursor::after {
  content: "▋";
  animation: blink 1.05s step-end infinite;
  color: #34d399;
  margin-left: 0.15rem;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
@media (prefers-reduced-motion: reduce) {
  .t-cursor::after { animation: none; }
}
`;

export function TerminalMockup() {
  return (
    <>
      <style>{termCSS}</style>
      <div className="terminal" role="figure" aria-label="TerraNode CLI demo">
        <div className="terminal-bar">
          <span className="terminal-dot" style={{ background: "#f87171" }} />
          <span className="terminal-dot" style={{ background: "#fbbf24" }} />
          <span className="terminal-dot" style={{ background: "#34d399" }} />
          <div className="terminal-title">terranode — zsh</div>
        </div>
        <div className="t-body">
          <div><span className="t-prompt">$ </span><span className="t-cmd">terranode telemetry submit \\<br />
            &nbsp;&nbsp;--temp 24.5 --moist 0.62 --ph 6.8</span></div>
          <div><span className="t-ok">✓  </span><span className="t-val">Record #4892</span><span className="t-comment">  hashed · 2024-07-21T09:14:32Z</span></div>
          <div style={{ height: 10 }} />
          <div><span className="t-prompt">$ </span><span className="t-cmd">terranode batch mint \\<br />
            &nbsp;&nbsp;--crop rice --weight 2400 \\<br />
            &nbsp;&nbsp;--telemetry 4892</span></div>
          <div><span className="t-ok">✓ Minting…</span> <span className="t-val">0x1a2b…8f3c</span></div>
          <div><span className="t-hash">Hash: </span><span className="t-val">0xd4e5f6…a7b8c9</span></div>
          <div><span className="t-comment">// Batch objects persisted on Sui Testnet ✓</span></div>
          <div className="t-cursor"><span className="t-prompt">$ </span><span> </span></div>
        </div>
      </div>
    </>
  );
}
