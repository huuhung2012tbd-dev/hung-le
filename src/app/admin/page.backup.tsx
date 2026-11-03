"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

type AnyRow = any;

export default function AdminPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const [session, setSession] = useState<AnyRow>(null);
  const [profile, setProfile] = useState<AnyRow>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [products, setProducts] = useState<AnyRow[]>([]);
  const [categories, setCategories] = useState<AnyRow[]>([]);
  const [brands, setBrands] = useState<AnyRow[]>([]);
  const [images, setImages] = useState<AnyRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emptyForm = {
    name: "",
    slug: "",
    sku: "",
    category_id: "",
    brand_id: "",
    origin: "",
    description: "",
    reference_price: "",
    availability: "in_stock",
    is_featured: false,
    is_published: true,
  };

  const [form, setForm] = useState(emptyForm);
  const [specText, setSpecText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const notify = (msg: string, type: "info" | "success" | "error" = "info") => {
    setMessage(msg);
    setMessageType(type);
  };

  // Kiểm tra phiên đăng nhập
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // Kiểm tra quyền owner/staff
  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null);
      return;
    }

    async function checkProfile() {
      const { data, error } = await supabase!
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        notify("Không đọc được hồ sơ quản trị: " + error.message, "error");
        setProfile(null);
        return;
      }

      if (!data.active) {
        notify("Tài khoản quản trị đã bị vô hiệu hóa.", "error");
        await supabase!.auth.signOut();
        return;
      }

      setProfile(data);
    }

    checkProfile();
  }, [supabase, session]);

  // Tải dữ liệu
  async function loadData() {
    if (!supabase) return;

    const [p, c, b, i] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("brands").select("*").order("name"),
      supabase.from("product_images").select("*").order("sort_order"),
    ]);

    if (p.error) notify("Lỗi tải sản phẩm: " + p.error.message, "error");
    if (c.error) notify("Lỗi tải danh mục: " + c.error.message, "error");
    if (b.error) notify("Lỗi tải thương hiệu: " + b.error.message, "error");
    if (i.error) notify("Lỗi tải hình ảnh: " + i.error.message, "error");

    setProducts(p.data || []);
    setCategories(c.data || []);
    setBrands(b.data || []);
    setImages(i.data || []);
  }

  useEffect(() => {
    if (profile?.active) loadData();
  }, [profile]);

  // Đăng nhập
  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      notify("Chưa cấu hình Supabase trong .env.local", "error");
      return;
    }

    notify("Đang đăng nhập...", "info");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) notify("Đăng nhập thất bại: " + error.message, "error");
    else notify("", "info");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    notify("Đã đăng xuất.", "info");
  }

  function makeSlug(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setSpecText("");
    setSelectedFiles([]);
    setShowForm(true);
    notify("", "info");
  }

  async function startEdit(product: AnyRow) {
    if (!supabase) return;

    setEditingId(product.id);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      sku: product.sku || "",
      category_id: product.category_id || "",
      brand_id: product.brand_id || "",
      origin: product.origin || "",
      description: product.description || "",
      reference_price: product.reference_price?.toString() || "",
      availability: product.availability || "in_stock",
      is_featured: !!product.is_featured,
      is_published: !!product.is_published,
    });

    const { data } = await supabase
      .from("product_specs")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order");

    setSpecText(
      (data || [])
        .map((s: AnyRow) =>
          [s.spec_group, s.spec_name, s.spec_value, s.unit || ""].join("|")
        )
        .join("\n")
    );

    setSelectedFiles([]);
    setShowForm(true);
    notify("", "info");
  }

  // Lưu sản phẩm và thông số
  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !profile) return;

    if (!form.name.trim()) {
      notify("Vui lòng nhập tên sản phẩm.", "error");
      return;
    }

    setSaving(true);
    notify("Đang lưu sản phẩm...", "info");

    const slug = form.slug.trim() || makeSlug(form.name);
    const payload = {
      name: form.name.trim(),
      slug,
      sku: form.sku.trim() || null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      origin: form.origin.trim() || null,
      description: form.description.trim() || null,
      reference_price: form.reference_price ? Number(form.reference_price) : null,
      availability: form.availability,
      is_featured: form.is_featured,
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };

    try {
      let productId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            ...payload,
            created_by: session.user.id,
          })
          .select("id")
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Xử lý thông số kỹ thuật
      if (productId) {
        await supabase
          .from("product_specs")
          .delete()
          .eq("product_id", productId);

        const lines = specText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length) {
          const specRows = lines.map((line, index) => {
            const [spec_group, spec_name, spec_value, unit] = line.split("|");
            return {
              product_id: productId,
              spec_group: spec_group?.trim() || "Chung",
              spec_name: spec_name?.trim() || "Thuộc tính",
              spec_value: spec_value?.trim() || "",
              unit: unit?.trim() || null,
              sort_order: index,
            };
          });

          const { error: specError } = await supabase
            .from("product_specs")
            .insert(specRows);

          if (specError) throw specError;
        }
      }

      // Tải ảnh lên
      if (selectedFiles.length && productId) {
        const existing = images.filter((img) => img.product_id === productId);

        for (let index = 0; index < selectedFiles.length; index++) {
          const file = selectedFiles[index];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `products/${productId}/${Date.now()}-${index}-${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("product-media")
            .upload(path, file);

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("product-media")
            .getPublicUrl(path);

          const { error: imageError } = await supabase
            .from("product_images")
            .insert({
              product_id: productId,
              image_url: publicData.publicUrl,
              storage_path: path,
              alt_text: form.name,
              is_primary: existing.length === 0 && index === 0,
              sort_order: existing.length + index,
            });

          if (imageError) throw imageError;
        }
      }

      notify("Đã lưu sản phẩm thành công!", "success");
      setShowForm(false);
      setSelectedFiles([]);
      await loadData();
    } catch (error: AnyRow) {
      notify("Không lưu được: " + (error.message || "Lỗi không xác định"), "error");
    } finally {
      setSaving(false);
    }
  }

  // Chọn ảnh đại diện
  async function setPrimaryImage(image: AnyRow) {
    if (!supabase) return;

    const { error: firstError } = await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", image.product_id);

    if (firstError) {
      notify("Lỗi: " + firstError.message, "error");
      return;
    }

    const { error } = await supabase
      .from("product_images")
      .update({ is_primary: true })
      .eq("id", image.id);

    if (error) notify("Lỗi: " + error.message, "error");
    else {
      notify("Đã đổi ảnh đại diện.", "success");
      loadData();
    }
  }

  // Xóa ảnh
  async function deleteImage(image: AnyRow) {
    if (!supabase) return;
    if (!confirm("Bạn có chắc muốn xóa ảnh này?")) return;

    if (image.storage_path) {
      const { error } = await supabase.storage
        .from("product-media")
        .remove([image.storage_path]);

      if (error) {
        notify("Không xóa được file ảnh: " + error.message, "error");
        return;
      }
    }

    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", image.id);

    if (error) notify("Không xóa được ảnh: " + error.message, "error");
    else {
      notify("Đã xóa ảnh.", "success");
      loadData();
    }
  }

  // Chỉ owner được xóa sản phẩm
  async function deleteProduct(product: AnyRow) {
    if (!supabase || profile?.role !== "owner") {
      notify("Chỉ chủ sở hữu mới được xóa sản phẩm.", "error");
      return;
    }

    if (!confirm(`Xóa vĩnh viễn sản phẩm "${product.name}"?`)) return;

    try {
      const productImages = images.filter((img) => img.product_id === product.id);
      const paths = productImages
        .map((img) => img.storage_path)
        .filter((spec): spec is NonNullable<typeof spec> => spec !== null);

      if (paths.length) {
        const { error } = await supabase.storage
          .from("product-media")
          .remove(paths);

        if (error) throw error;
      }

      await supabase.from("product_images").delete().eq("product_id", product.id);
      await supabase.from("product_specs").delete().eq("product_id", product.id);
      
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      notify("Đã xóa sản phẩm thành công.", "success");
      await loadData();
    } catch (error: AnyRow) {
      notify("Không xóa được: " + error.message, "error");
    }
  }

  // Thống kê nhanh (KPI)
  const stats = useMemo(() => {
    return {
      total: products.length,
      published: products.filter(p => p.is_published).length,
      featured: products.filter(p => p.is_featured).length,
      inStock: products.filter(p => p.availability === "in_stock").length,
    };
  }, [products]);

  // Bộ lọc nâng cao
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = `${p.name} ${p.sku || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || p.category_id === categoryFilter;
      const matchBrand = brandFilter === "all" || p.brand_id === brandFilter;
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
          ? p.is_published
          : statusFilter === "draft"
          ? !p.is_published
          : statusFilter === "featured"
          ? p.is_featured
          : true;

      return matchSearch && matchCategory && matchBrand && matchStatus;
    });
  }, [products, search, categoryFilter, brandFilter, statusFilter]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#475569" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
          <b style={{ fontSize: 16 }}>Đang khởi tạo hệ thống quản trị...</b>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 20 }}>
        <div style={{ maxWidth: 450, background: "#fff", padding: 30, borderRadius: 16, border: "1px solid #fee2e2", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: "#991b1b", marginTop: 0 }}>Chưa kết nối Supabase</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>Vui lòng kiểm tra biến môi trường NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local.</p>
        </div>
      </div>
    );
  }

  // MÀN HÌNH ĐĂNG NHẬP
  if (!session) {
    return (
      <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          padding: "40px 32px",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <img src="/logo.png" alt="Logo" style={{ height: 44, width: "auto" }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#171744", letterSpacing: -0.5 }}>HÙNG <span style={{ color: "#302bc0" }}>LÊ</span></div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#64748b", fontWeight: 700 }}>ADMIN PORTAL</div>
              </div>
            </div>
            <h2 style={{ fontSize: 20, color: "#0f172a", margin: "6px 0 0" }}>Đăng nhập Quản trị</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Hệ thống quản lý kho và danh mục thiết bị điện</p>
          </div>

          <form onSubmit={signIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>Email quản trị</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hungle.vn"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>Mật khẩu</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {message && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                background: messageType === "error" ? "#fef2f2" : "#f0fdf4",
                color: messageType === "error" ? "#dc2626" : "#16a34a",
                border: `1px solid ${messageType === "error" ? "#fecaca" : "#bbf7d0"}`
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg, #302bc0, #4f46e5)",
                color: "#fff",
                padding: "13px 20px",
                borderRadius: 10,
                border: 0,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                marginTop: 6,
                boxShadow: "0 4px 14px rgba(48, 43, 192, 0.35)",
              }}
            >
              Vào bảng điều khiển →
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <a href="/" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Quay lại trang chủ bán hàng</a>
          </div>
        </div>
      </main>
    );
  }

  // MÀN HÌNH CHECK PROFILE
  if (!profile) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 20 }}>
        <div style={{ maxWidth: 440, background: "#fff", padding: 32, borderRadius: 16, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
          <h2 style={{ color: "#0f172a", marginTop: 0 }}>Xác thực tài khoản</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            {message || "Đang kiểm tra phân quyền tài khoản của bạn trên hệ thống..."}
          </p>
          <button
            onClick={signOut}
            style={{
              background: "#e2e8f0",
              color: "#334155",
              border: 0,
              padding: "10px 18px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              marginTop: 10
            }}
          >
            Đăng xuất
          </button>
        </div>
      </main>
    );
  }

  // GIAO DIỆN QUẢN TRỊ CHÍNH (DASHBOARD)
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column", fontFamily: "'Be Vietnam Pro', -apple-system, sans-serif" }}>
      
      {/* TOP NAVBAR */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ maxWidth: 1400, margin: "auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 38, width: "auto" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>HÙNG LÊ ADMIN</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: profile.role === "owner" ? "#fef3c7" : "#e0e7ff",
                  color: profile.role === "owner" ? "#b45309" : "#3730a3"
                }}>
                  {profile.role === "owner" ? "Chủ cửa hàng" : "Nhân viên"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{profile.full_name || session.user.email}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="/"
              target="_blank"
              style={{
                fontSize: 13,
                color: "#475569",
                textDecoration: "none",
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              👁️ Xem Web
            </a>
            <button
              onClick={signOut}
              style={{
                fontSize: 13,
                color: "#dc2626",
                fontWeight: 600,
                background: "#fef2f2",
                border: "1px solid #fee2e2",
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main style={{ maxWidth: 1400, width: "100%", margin: "24px auto", padding: "0 24px", boxSizing: "border-box", flex: 1 }}>
        
        {/* THÔNG BÁO FLASH MESSAGE */}
        {message && (
          <div style={{
            padding: "14px 18px",
            borderRadius: 10,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: messageType === "error" ? "#fef2f2" : messageType === "success" ? "#f0fdf4" : "#eff6ff",
            color: messageType === "error" ? "#b91c1c" : messageType === "success" ? "#15803d" : "#1d4ed8",
            border: `1px solid ${messageType === "error" ? "#fecaca" : messageType === "success" ? "#bbf7d0" : "#bfdbfe"}`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500 }}>
              <span>{messageType === "error" ? "❌" : messageType === "success" ? "✅" : "ℹ️"}</span>
              {message}
            </div>
            <button onClick={() => setMessage("")} style={{ border: 0, background: "none", cursor: "pointer", fontSize: 16, color: "inherit" }}>✕</button>
          </div>
        )}

        {/* THỐNG KÊ NHANH (KPI CARDS) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#fff", padding: 18, borderRadius: 14, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#e0e7ff", color: "#3730a3", display: "grid", placeItems: "center", fontSize: 22 }}>📦</div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Tổng sản phẩm</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{stats.total}</div>
            </div>
          </div>

          <div style={{ background: "#fff", padding: 18, borderRadius: 14, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#dcfce7", color: "#15803d", display: "grid", placeItems: "center", fontSize: 22 }}>🟢</div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Đang hiển thị Web</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{stats.published}</div>
            </div>
          </div>

          <div style={{ background: "#fff", padding: 18, borderRadius: 14, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fef3c7", color: "#b45309", display: "grid", placeItems: "center", fontSize: 22 }}>⭐</div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Sản phẩm nổi bật</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{stats.featured}</div>
            </div>
          </div>

          <div style={{ background: "#fff", padding: 18, borderRadius: 14, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#f1f5f9", color: "#334155", display: "grid", placeItems: "center", fontSize: 22 }}>🏭</div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Sẵn hàng trong kho</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{stats.inStock}</div>
            </div>
          </div>
        </div>

        {/* KHU VỰC BẢNG QUẢN LÝ SẢN PHẨM */}
        <section style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          
          {/* TOOLBAR */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Kho thiết bị & vật tư</h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Hiển thị {filteredProducts.length} trên tổng {products.length} sản phẩm</p>
            </div>

            <button
              onClick={startNew}
              style={{
                background: "linear-gradient(135deg, #302bc0, #4338ca)",
                color: "#fff",
                border: 0,
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(48, 43, 192, 0.25)"
              }}
            >
              <span>➕</span> Thêm sản phẩm mới
            </button>
          </div>

          {/* BỘ LỌC TÌM KIẾM */}
          <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 2, minWidth: 240, position: "relative" }}>
              <input
                type="text"
                placeholder="🔍 Tìm theo tên hoặc mã SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fff"
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                background: "#fff",
                outline: "none"
              }}
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                background: "#fff",
                outline: "none"
              }}
            >
              <option value="all">Tất cả hãng</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                background: "#fff",
                outline: "none"
              }}
            >
              <option value="all">Mọi trạng thái</option>
              <option value="published">Đang hiển thị</option>
              <option value="draft">Bản nháp</option>
              <option value="featured">Nổi bật</option>
            </select>
          </div>

          {/* BẢNG DỮ LIỆU */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                  <th style={{ padding: "14px 20px" }}>Sản phẩm</th>
                  <th style={{ padding: "14px 16px" }}>Mã SKU</th>
                  <th style={{ padding: "14px 16px" }}>Phân loại</th>
                  <th style={{ padding: "14px 16px" }}>Giá tham khảo</th>
                  <th style={{ padding: "14px 16px" }}>Tình trạng</th>
                  <th style={{ padding: "14px 16px" }}>Hiển thị</th>
                  <th style={{ padding: "14px 20px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                      Không tìm thấy sản phẩm nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const primary = images.find(
                      (img) => img.product_id === p.id && img.is_primary
                    ) || images.find((img) => img.product_id === p.id);

                    const cat = categories.find((c) => c.id === p.category_id);
                    const br = brands.find((b) => b.id === p.brand_id);

                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{
                              width: 54,
                              height: 54,
                              borderRadius: 10,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              display: "grid",
                              placeItems: "center",
                              overflow: "hidden",
                              flexShrink: 0
                            }}>
                              {primary ? (
                                <img
                                  src={primary.image_url}
                                  alt={p.name}
                                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                />
                              ) : (
                                <span style={{ fontSize: 20 }}>⚡</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 6, alignItems: "center" }}>
                                {br && <span style={{ fontWeight: 600, color: "#302bc0" }}>{br.name}</span>}
                                {p.is_featured && (
                                  <span style={{ background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                    ★ Nổi bật
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px", color: "#475569", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                          {p.sku || "—"}
                        </td>

                        <td style={{ padding: "14px 16px", color: "#475569" }}>
                          {cat ? cat.name : "—"}
                        </td>

                        <td style={{ padding: "14px 16px", fontWeight: 700, color: p.reference_price ? "#0f172a" : "#64748b" }}>
                          {p.reference_price
                            ? Number(p.reference_price).toLocaleString("vi-VN") + " ₫"
                            : "Liên hệ"}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: p.availability === "in_stock" ? "#dcfce7" : "#f1f5f9",
                            color: p.availability === "in_stock" ? "#166534" : "#475569"
                          }}>
                            {p.availability === "in_stock" ? "Còn hàng" : p.availability === "check_supplier" ? "Hỏi hãng" : "Chưa xác nhận"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: p.is_published ? "#22c55e" : "#94a3b8",
                            marginRight: 6
                          }} />
                          <span style={{ fontSize: 12, color: p.is_published ? "#15803d" : "#64748b", fontWeight: 600 }}>
                            {p.is_published ? "Hiện" : "Ẩn"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 20px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              onClick={() => startEdit(p)}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                color: "#334155",
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: "pointer"
                              }}
                            >
                              Sửa
                            </button>

                            {profile.role === "owner" && (
                              <button
                                onClick={() => deleteProduct(p)}
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  fontWeight: 600,
                                  fontSize: 12,
                                  cursor: "pointer"
                                }}
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* MODAL / FORM THÊM & SỬA SẢN PHẨM */}
        {showForm && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
            overflowY: "auto"
          }}>
            <div style={{
              background: "#fff",
              width: "100%",
              maxWidth: 780,
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 20,
              padding: "32px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              boxSizing: "border-box"
            }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {editingId ? "✏️ Chỉnh sửa sản phẩm" : "➕ Thêm sản phẩm mới"}
                  </h2>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Điền thông tin và thông số kỹ thuật bên dưới</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: "#f1f5f9", border: 0, width: 34, height: 34, borderRadius: "50%", cursor: "pointer", fontSize: 16, color: "#64748b" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={saveProduct}>
                
                {/* 2 CỘT: TÊN VÀ SKU */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Tên sản phẩm *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="VD: Dây cáp điện CADIVI CV 2.5mm..."
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Mã SKU</label>
                    <input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="VD: CV-2.5"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* 2 CỘT: DANH MỤC VÀ HÃNG */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Danh mục</label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Thương hiệu</label>
                    <select
                      value={form.brand_id}
                      onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="">-- Chọn thương hiệu --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2 CỘT: GIÁ VÀ TỒN KHO */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Giá tham khảo (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.reference_price}
                      onChange={(e) => setForm({ ...form, reference_price: e.target.value })}
                      placeholder="Để trống nếu muốn hiển thị Liên hệ"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Tình trạng kho</label>
                    <select
                      value={form.availability}
                      onChange={(e) => setForm({ ...form, availability: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="in_stock">Còn hàng sẵn kho</option>
                      <option value="check_supplier">Liên hệ kiểm tra nhà cung cấp</option>
                      <option value="unconfirmed">Chưa xác nhận</option>
                    </select>
                  </div>
                </div>

                {/* MÔ TẢ */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Mô tả sản phẩm</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Mô tả công năng, ứng dụng trong công trình..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>

                {/* THÔNG SỐ KỸ THUẬT */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Thông số kỹ thuật</label>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Cú pháp: Nhóm|Tên thông số|Giá trị|Đơn vị</span>
                  </div>
                  <textarea
                    rows={4}
                    value={specText}
                    onChange={(e) => setSpecText(e.target.value)}
                    placeholder={"Điện áp|Điện áp định mức|220|V\nQuy cách|Tiết diện ruột dẫn|2.5|mm2"}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "monospace",
                      fontSize: 12,
                      background: "#f8fafc"
                    }}
                  />
                </div>

                {/* HÌNH ẢNH */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>Tải thêm ảnh sản phẩm</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    style={{ width: "100%", padding: "8px 0" }}
                  />

                  {/* GALLERY ẢNH ĐÃ CÓ */}
                  {editingId && (
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {images.filter((img) => img.product_id === editingId).map((img) => (
                        <div key={img.id} style={{
                          width: 110,
                          border: img.is_primary ? "2px solid #302bc0" : "1px solid #e2e8f0",
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#fff",
                          position: "relative"
                        }}>
                          <img src={img.image_url} alt="" style={{ width: "100%", height: 75, objectFit: "contain", background: "#f8fafc" }} />
                          <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                            {!img.is_primary && (
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(img)}
                                style={{ fontSize: 10, padding: "3px 0", border: 0, background: "#e0e7ff", color: "#3730a3", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
                              >
                                Đặt làm chính
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteImage(img)}
                              style={{ fontSize: 10, padding: "3px 0", border: 0, background: "#fef2f2", color: "#dc2626", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                            >
                              Xóa ảnh
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TOGGLES */}
                <div style={{ display: "flex", gap: 24, padding: "14px 18px", background: "#f8fafc", borderRadius: 10, marginBottom: 24 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    />
                    Hiển thị trên website
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    />
                    Đánh dấu sản phẩm nổi bật
                  </label>
                </div>

                {/* NÚT SUBMIT */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{ padding: "11px 20px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, cursor: "pointer" }}
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: "11px 24px",
                      borderRadius: 8,
                      border: 0,
                      background: "linear-gradient(135deg, #302bc0, #4f46e5)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(48, 43, 192, 0.25)",
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? "Đang lưu dữ liệu..." : "Lưu sản phẩm"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
