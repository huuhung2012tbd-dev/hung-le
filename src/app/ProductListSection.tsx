"use client";

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  sku?: string;
  reference_price?: number | string | null;
  availability?: string;
  description?: string;
  origin?: string;
  brands?: { name?: string };
  product_images?: { image_url: string; is_primary?: boolean }[];
  product_specs?: {
    spec_group?: string;
    spec_name: string;
    spec_value: string;
    unit?: string;
  }[];
};

export default function ProductListSection({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  function getZaloUrl(p: Product) {
    const msg = encodeURIComponent(
      `Xin chào HÙNG LÊ! Tôi cần tư vấn và nhận báo giá sản phẩm: ${p.name}${p.sku ? ` (Mã SKU: ${p.sku})` : ""}.`
    );
    return `https://zalo.me/0909660910?text=${msg}`;
  }

  return (
    <>
      <div className="products">
        {products.map((p) => {
          const primaryImage = p.product_images?.find((img) => img.is_primary);
          const imageUrl = primaryImage?.image_url || p.product_images?.[0]?.image_url;

          return (
            <article
              className="product reveal product-clickable"
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              title="Bấm để xem chi tiết thông số kỹ thuật"
            >
              <div className="photo">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : (
                  <span>⚡</span>
                )}
              </div>

              <small>
                {p.brands?.name ?? "Thiết bị điện"} · {p.sku ?? "Chưa có mã"}
              </small>

              <h3>{p.name}</h3>

              <div className="price">
                {p.reference_price
                  ? Number(p.reference_price).toLocaleString("vi-VN") + " ₫"
                  : "Liên hệ báo giá"}
              </div>

              <div className="product-footer">
                <span className="status">
                  {p.availability === "in_stock" ? "Có hàng" : "Liên hệ kiểm tra"}
                </span>

                <a
                  className="btn-zalo-sm"
                  href={getZaloUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()} // Không mở modal khi bấm thẳng vào nút Zalo
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
                    alt="Zalo"
                    width="16"
                    height="16"
                    style={{ verticalAlign: "middle" }}
                  />
                  <span>Báo giá Zalo</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {/* MODAL CHI TIẾT SẢN PHẨM & THÔNG SỐ KỸ THUẬT */}
      {selectedProduct && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()} // Chặn đóng modal khi bấm bên trong card
          >
            {/* Nút đóng */}
            <button
              className="modal-close-btn"
              onClick={() => setSelectedProduct(null)}
              aria-label="Đóng"
            >
              ✕
            </button>

            <div className="modal-content-grid">
              {/* Cột trái: Ảnh sản phẩm */}
              <div className="modal-img-col">
                <div className="modal-photo-main">
                  {selectedProduct.product_images?.[0]?.image_url ? (
                    <img
                      src={
                        selectedProduct.product_images.find((img) => img.is_primary)?.image_url ||
                        selectedProduct.product_images[0].image_url
                      }
                      alt={selectedProduct.name}
                    />
                  ) : (
                    <span style={{ fontSize: 60 }}>⚡</span>
                  )}
                </div>
              </div>

              {/* Cột phải: Thông tin & Giá */}
              <div className="modal-info-col">
                <div className="modal-brand-badge">
                  {selectedProduct.brands?.name || "HÙNG LÊ"}
                </div>

                <h2 className="modal-title">{selectedProduct.name}</h2>

                <div className="modal-meta">
                  <span>Mã SKU: <b>{selectedProduct.sku || "Đang cập nhật"}</b></span>
                  {selectedProduct.origin && (
                    <span>Xuất xứ: <b>{selectedProduct.origin}</b></span>
                  )}
                  <span>
                    Trạng thái:{" "}
                    <b style={{ color: selectedProduct.availability === "in_stock" ? "#16a34a" : "#ca8a04" }}>
                      {selectedProduct.availability === "in_stock" ? "Có sẵn tại kho" : "Liên hệ kiểm tra hàng"}
                    </b>
                  </span>
                </div>

                <div className="modal-price-box">
                  <span className="modal-price-label">Giá tham khảo:</span>
                  <div className="modal-price-val">
                    {selectedProduct.reference_price
                      ? Number(selectedProduct.reference_price).toLocaleString("vi-VN") + " ₫"
                      : "Liên hệ để nhận chiết khấu"}
                  </div>
                  <small style={{ color: "#64748b", fontSize: 12 }}>
                    * Giá áp dụng chiết khấu đặc biệt theo số lượng đơn hàng và công trình.
                  </small>
                </div>

                {/* Mô tả sản phẩm nếu có */}
                {selectedProduct.description && (
                  <div className="modal-desc">
                    <b>Mô tả:</b>
                    <p>{selectedProduct.description}</p>
                  </div>
                )}

                {/* Bảng thông số kỹ thuật */}
                <div className="modal-specs">
                  <b>Thông số kỹ thuật:</b>
                  {selectedProduct.product_specs && selectedProduct.product_specs.length > 0 ? (
                    <table className="modal-spec-table">
                      <tbody>
                        {selectedProduct.product_specs.map((spec, i) => (
                          <tr key={i}>
                            <td className="spec-name">{spec.spec_name}</td>
                            <td className="spec-val">
                              {spec.spec_value} {spec.unit || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0" }}>
                      Liên hệ trực tiếp để kỹ thuật viên cung cấp bản vẽ và catalog chi tiết.
                    </p>
                  )}
                </div>

                {/* Các nút hành động liên hệ */}
                <div className="modal-actions">
                  <a
                    className="modal-btn-zalo"
                    href={getZaloUrl(selectedProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
                      alt="Zalo"
                      width="20"
                      height="20"
                    />
                    Nhận báo giá chiết khấu qua Zalo
                  </a>

                  <a className="modal-btn-call" href="tel:0909660910">
                    📞 Gọi 0909 660 910
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

