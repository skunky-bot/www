try { const theme=localStorage.getItem('skw-brand-theme') || localStorage.getItem('skunky-colour-theme'); if(theme==='light'||theme==='dark') document.documentElement.dataset.theme=theme; } catch {}
