// Retry only a local page path. Never carry account, booking or payment query tokens.
export function recoveryPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 ||
      !/^\/(?!\/)/.test(value) || /[\\?#\s\u0000-\u001f\u007f]/.test(value) ||
      /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return '/';
  const path = new URL(value, 'https://recovery.invalid').pathname;
  if (['/api', '/_next', '/indisponibile'].some(prefix => path === prefix || path.startsWith(prefix + '/'))) return '/';
  return path;
}

export const recoveryStyles = `
.page-recovery{box-sizing:border-box;min-height:80svh;display:grid;align-content:center;padding:48px max(24px,calc((100% - 1040px)/2));background:#fff;color:#122e59;font-family:Arial,Helvetica,sans-serif;text-align:left}
.page-recovery *{box-sizing:border-box}
.page-recovery .recovery-brand{display:block;width:220px;max-width:70%;height:auto;margin:0 0 56px}
.public-shell .page-recovery>.recovery-brand-link{display:none}
.page-recovery .recovery-code{margin:0 0 14px;color:#376fb5;font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.page-recovery h1{max-width:760px;margin:0 0 20px;font-size:clamp(30px,5vw,52px);line-height:1.12;letter-spacing:-.035em;color:#122e59}
.page-recovery .recovery-description{max-width:600px;margin:0 0 28px;color:#465a74;font-size:18px;line-height:1.6}
.page-recovery .recovery-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.page-recovery .recovery-action{display:inline-flex;justify-content:center;align-items:center;gap:9px;min-height:48px;padding:12px 20px;border:1px solid #718096;border-radius:10px;background:#fff;color:#122e59;font:700 16px/1.4 Arial,Helvetica,sans-serif;text-decoration:none;cursor:pointer}
.page-recovery .recovery-primary{border-color:#122e59;background:#122e59;color:#fff}
.page-recovery .recovery-action:hover{border-color:#245fba;box-shadow:0 0 0 1px #245fba}
.page-recovery a:focus-visible,.page-recovery button:focus-visible{outline:3px solid #245fba;outline-offset:4px}
.page-recovery .recovery-contact{display:inline-flex;align-items:center;gap:8px;margin-top:28px;color:#122e59;text-decoration:underline;text-underline-offset:5px;font-size:16px;line-height:1.6}
.page-recovery .recovery-contact svg{flex:none;color:#16833b;width:22px;height:22px}
@media(max-width:540px){.page-recovery{min-height:100svh;padding:32px 24px}.page-recovery .recovery-brand{width:185px;margin-bottom:40px}.page-recovery .recovery-description{font-size:17px}.page-recovery .recovery-actions{align-items:stretch}.page-recovery .recovery-action{flex:1 1 160px}}
`;
