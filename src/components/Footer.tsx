const links = [
  { label: 'Giới thiệu', href: '#top' },
  { label: 'Lịch sử', href: '#timeline' },
  { label: 'Nhân vật', href: '#characters' },
  { label: 'Điều khoản', href: '#footer' },
]

export function Footer() {
  return <footer id="footer" className="site-footer"><div className="page-shell"><div className="footer-main"><div><a href="#top" className="brand flex items-center gap-2.5"><span className="brand-mark" aria-hidden="true">史</span><span className="brand-text">XUYÊN SỬ KÍ<span className="brand-dot">.</span></span></a><p>Học lịch sử không chỉ để nhớ quá khứ,<br />mà để hiểu hiện tại.</p></div><div className="footer-links">{links.map(link => <a key={link.label} href={link.href}>{link.label}</a>)}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Xuyên Sử Kí. Bản demo học tập.</span><span>Được tạo với niềm yêu thích lịch sử Việt Nam ✦</span></div></div></footer>
}
