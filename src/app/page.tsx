import { supabase } from "@/lib/supabase";
import ScrollEffects from "./ScrollEffects";
import CategoryGrid from "./CategoryGrid";
import AiChatWidget from "./AiChatWidget";
import ProductListSection from "./ProductListSection";

const categories = [
  { name: "Dây điện, cáp điện", img: "/categories/day-dien.png", fallback: "⚡" },
  { name: "Thiết bị đóng cắt", img: "/categories/dong-cat.png", fallback: "🔌" },
  { name: "Công tắc, ổ cắm", img: "/categories/cong-tac.png", fallback: "🔘" },
  { name: "Đèn LED, chiếu sáng", img: "/categories/den-led.png", fallback: "💡" },
  { name: "Tủ điện, điện công nghiệp", img: "/categories/tu-dien.png", fallback: "🧰" },
  { name: "Ống luồn & phụ kiện", img: "/categories/ong-luon.png", fallback: "〰️" },
  { name: "Tự động hóa, biến tần", img: "/categories/bien-tan.png", fallback: "⚙️" },
  { name: "Thiết bị điện dân dụng", img: "/categories/dan-dung.png", fallback: "🏠" },
  { name: "Thiết bị điện công trình", img: "/categories/cong-trinh.png", fallback: "🏗️" },
];

const trustBadges = [
  { icon: "🛡️", title: "100% Chính Hãng", desc: "Đầy đủ CO/CQ, xuất xứ rõ ràng" },
  { icon: "💰", title: "Chiết Khấu Tốt Nhất", desc: "Giá ưu đãi cho thợ, thầu và công trình" },
  { icon: "🚚", title: "Giao Hàng Siêu Tốc", desc: "Hỗ trợ giao ngay nội thành TP.HCM" },
  { icon: "⚡", title: "Hỗ Trợ Kỹ Thuật", desc: "Tư vấn bản vẽ & khối lượng 24/7" },
];

function zaloProductUrl(productName: string, sku?: string) {
  const msg = encodeURIComponent(
    `Xin chào, tôi muốn được báo giá sản phẩm: ${productName}${sku ? ` (Mã: ${sku})` : ""}. Cảm ơn!`
  );
  return `https://zalo.me/0909660910?text=${msg}`;
}

export default async function Home() {
  let products:any[] = [];
  if (supabase) {
    const {data} = await supabase.from("products")
      .select("id,name,sku,reference_price,availability,origin,description,brands(name),product_images(image_url,is_primary),product_specs(spec_group,spec_name,spec_value,unit)")
      .eq("is_published",true).order("created_at",{ascending:false}).limit(12);
    products = data ?? [];
  }
  return <>
    <ScrollEffects />
    <AiChatWidget />

    {/* ===== FLOATING ACTION BUTTONS ===== */}
    <div className="fab-container">
      <a
        className="fab fab-zalo"
        href="https://zalo.me/0909660910"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat Zalo"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
          alt="Zalo"
          width="34"
          height="34"
          style={{ display: "block" }}
        />
        <span className="fab-tooltip">Chat Zalo</span>
      </a>
      <a
        className="fab fab-phone"
        href="tel:0909660910"
        aria-label="Gọi điện"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span className="fab-tooltip">Gọi 0909 660 910</span>
        <span className="fab-pulse" />
        <span className="fab-pulse fab-pulse-2" />
      </a>
    </div>

    {/* TOP BAR */}
    <div className="top"><div className="wrap"><span>HÙNG LÊ – CHUYÊN CUNG CẤP THIẾT BỊ ĐIỆN</span><span>☎ 0909 660 910</span></div></div>

    {/* HEADER with LOGO */}
    <header><div className="wrap head">
      <a href="/" aria-label="Hùng Lê" className="logo-link">
        <img src="/logo.png" alt="Hùng Lê Logo" className="logo-img" />
        <div className="logo-text-group">
          <div className="logo">HÙNG <span>LÊ</span></div>
          <div className="tag">THIẾT BỊ ĐIỆN</div>
        </div>
      </a>
      <nav>
        <a href="/">Trang chủ</a>
        <a href="#categories">Danh mục</a>
        <a href="#products">Sản phẩm</a>
        <a href="#contact">Liên hệ</a>
      </nav>
      <form className="search" action="/"><input name="q" placeholder="Tìm tên sản phẩm, mã hàng..."/><button>Tìm</button></form>
    </div></header>

    {/* MAIN */}
    <main className="wrap">
      {/* HERO */}
      <div className="hero">
        <div className="hero-content">
          <small>ĐỐI TÁC THIẾT BỊ ĐIỆN</small>
          <h1>Giải pháp thiết bị điện<br/>cho mọi công trình</h1>
          <p>Danh mục thiết bị điện dân dụng và công nghiệp. Hỗ trợ tư vấn lựa chọn sản phẩm, kiểm tra hàng và báo giá theo nhu cầu.</p>
          <a className="btn gold" href="#categories">Khám phá sản phẩm →</a>
        </div>
        <div className="hero-art">⚡</div>
      </div>

      {/* ===== TRUST BADGES ===== */}
      <section className="trust-section reveal">
        <div className="trust-grid">
          {trustBadges.map((badge, i) => (
            <div className={`trust-card reveal reveal-delay-${i + 1}`} key={badge.title}>
              <div className="trust-icon">{badge.icon}</div>
              <div>
                <div className="trust-title">{badge.title}</div>
                <div className="trust-desc">{badge.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="reveal">
        <div className="section-head"><div><h2>Danh mục sản phẩm</h2><p>Tìm nhanh nhóm thiết bị bạn cần</p></div></div>
        <CategoryGrid categories={categories} />
      </section>

      {/* PRODUCTS */}
      <section id="products" className="reveal">
        <div className="section-head"><div><h2>Sản phẩm nổi bật</h2><p>Giá tham khảo – vui lòng liên hệ để xác nhận giá và tình trạng hàng</p></div></div>
        {products.length ? (
          <ProductListSection products={products} />
        ) : (
          <div className="note">Danh mục sản phẩm đang được cập nhật. Khi kết nối cơ sở dữ liệu và thêm sản phẩm trong quản trị, sản phẩm sẽ hiển thị tại đây.</div>
        )}
      </section>

      {/* BRANDS */}
      <section className="reveal">
        <div className="section-head"><div><h2>Thương hiệu</h2><p>Các thương hiệu có thể được cập nhật trong quản trị</p></div></div>
        <div className="brands">
          {[
            { name: "CADIVI", color: "#d91e18" },
            { name: "Schneider Electric", color: "#3dcd58" },
            { name: "Panasonic", color: "#004098" },
            { name: "LS Electric", color: "#c8102e" },
            { name: "Sino", color: "#171744" }
          ].map((item, i) => (
            <div
              className={`brand reveal reveal-delay-${(i % 3) + 1}`}
              key={item.name}
              style={{ color: item.color }}
            >
              {item.name}
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT + MAP */}
      <section id="contact" className="reveal">
        <div className="contact">
          <div>
            <h2>Cần tư vấn hoặc báo giá?</h2>
            <p>Liên hệ trực tiếp để được hỗ trợ theo số lượng và nhu cầu công trình.</p>
            <p style={{marginTop:8}}>📍 39I Ngô Nhân Tịnh, Phường Bình Tiên, Quận 6, TP. Hồ Chí Minh</p>
          </div>
          <div className="actions">
            <a className="btn" href="tel:0909660910">Gọi 0909 660 910</a>
            <a className="btn outline" href="https://zalo.me/0909660910" target="_blank" style={{display:"inline-flex", alignItems:"center", gap:6}}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
                alt="Zalo"
                width="18"
                height="18"
              />
              Chat Zalo
            </a>
          </div>
        </div>
        <div className="map-wrapper reveal">
          <iframe
            title="Hùng Lê - Bản đồ cửa hàng"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.827!2d106.6295!3d10.7505!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z39I+Ng%C3%B4+Nh%C3%A2n+T%E1%BB%8Bnh%2C+B%C3%ACnh+Ti%C3%AAn%2C+Qu%E1%BA%ADn+6%2C+TP.HCM!5e0!3m2!1svi!2svn!4v1700000000000"
            width="100%"
            height="280"
            style={{ border: 0, borderRadius: 12 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            className="btn map-btn"
            href="https://www.google.com/maps/search/39I+Ng%C3%B4+Nh%C3%A2n+T%E1%BB%8Bnh,+B%C3%ACnh+Ti%C3%AAn,+Qu%E1%BA%ADn+6,+TP.HCM"
            target="_blank"
            rel="noopener noreferrer"
          >
            🧭 Chỉ đường đến cửa hàng
          </a>
        </div>
      </section>
    </main>

    {/* FOOTER */}
    <footer><div className="wrap">
      <a href="/" className="logo-link" style={{marginBottom:12}}>
        <img src="/logo.png" alt="Hùng Lê Logo" className="logo-img" style={{height:42, background:"#fff", padding:"4px 8px", borderRadius:6}} />
        <div className="logo" style={{color:"#fff"}}>HÙNG LÊ</div>
      </a>
      <p>CHUYÊN CUNG CẤP THIẾT BỊ ĐIỆN<br/>39I Ngô Nhân Tịnh, Phường Bình Tiên, Quận 6, TP. Hồ Chí Minh<br/>Điện thoại / Zalo: 0909 660 910</p>
      <small>Giá trên website (nếu có) là giá tham khảo. Giá cuối cùng xác nhận khi liên hệ.</small>
    </div></footer>
  </>;
}
