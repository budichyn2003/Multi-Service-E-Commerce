'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

interface ProductItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  categoryId?: string;
  status: string;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [initialStock, setInitialStock] = useState('10');
  const [savingProduct, setSavingProduct] = useState(false);

  // Stock Adjustment Modal
  const [adjustTarget, setAdjustTarget] = useState<ProductItem | null>(null);
  const [quantityDelta, setQuantityDelta] = useState<number>(10);
  const [adjustingStock, setAdjustingStock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.catalog.getProducts({ limit: 100 }),
        api.catalog.getCategories(),
      ]);

      const items = Array.isArray(prodRes) ? prodRes : prodRes.items || [];
      setProducts(items);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data produk.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setDescription('');
    setPrice('100000');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setInitialStock('15');
    setShowProductModal(true);
  };

  const handleOpenEditModal = (p: ProductItem) => {
    setEditId(p.id);
    setSku(p.sku);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(String(p.price));
    setCategoryId(p.categoryId || '');
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || savingProduct) return;

    setSavingProduct(true);
    try {
      if (editId) {
        await api.admin.updateProduct(editId, {
          name,
          description,
          price: Number(price),
          categoryId: categoryId || undefined,
        });
      } else {
        await api.admin.createProduct({
          sku,
          name,
          description,
          price: Number(price),
          categoryId: categoryId || undefined,
          initialStock: Number(initialStock) || 0,
        });
      }

      setShowProductModal(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan produk.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleArchive = async (id: string, prodName: string) => {
    if (!window.confirm(`Arsipkan produk “${prodName}”? Produk tidak akan lagi tampil di katalog publik.`)) return;

    try {
      await api.admin.archiveProduct(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengarsipkan produk.');
    }
  };

  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || adjustingStock) return;

    setAdjustingStock(true);
    try {
      await api.admin.adjustInventory(adjustTarget.id, quantityDelta);
      setAdjustTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah stok inventaris.');
    } finally {
      setAdjustingStock(false);
    }
  };

  if (loading && products.length === 0) {
    return <StatusNotice type="loading" title="Memuat daftar produk admin…" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Katalog & Inventaris Stok</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
            Total {products.length} produk terdaftar
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={loadData} className="secondary-button" style={{ fontSize: '0.85rem' }}>
            🔄 Refresh
          </button>
          <button type="button" onClick={handleOpenCreateModal} className="button" style={{ fontSize: '0.85rem' }}>
            + Tambah Produk Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <StatusNotice
          type="empty"
          title="Belum ada produk"
          message="Silakan buat produk pertama Anda untuk mengisi katalog toko."
          actionText="+ Tambah Produk"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk</th>
                <th>Harga</th>
                <th style={{ textAlign: 'center' }}>Stok</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isOut = p.stock !== undefined && p.stock <= 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: '0.85rem' }}>{p.sku}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>
                        {p.description ? p.description.slice(0, 60) + '…' : 'Tanpa deskripsi'}
                      </div>
                    </td>
                    <td>{formatRupiah(p.price)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={isOut ? 'badge badge-danger' : 'badge badge-neutral'}
                        style={{ cursor: 'pointer' }}
                        title="Klik untuk ubah stok"
                        onClick={() => {
                          setAdjustTarget(p);
                          setQuantityDelta(10);
                        }}
                      >
                        {p.stock !== undefined ? p.stock : '-'}
                      </span>
                    </td>
                    <td>
                      <span className={p.status === 'ACTIVE' ? 'badge badge-success' : 'badge badge-neutral'}>
                        {p.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => {
                            setAdjustTarget(p);
                            setQuantityDelta(10);
                          }}
                        >
                          ± Stok
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleOpenEditModal(p)}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                          onClick={() => handleArchive(p.id, p.name)}
                        >
                          Arsip
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              {editId ? 'Ubah Informasi Produk' : 'Tambah Produk Baru'}
            </h2>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="p-sku">SKU</label>
                  <input
                    id="p-sku"
                    className="field"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    disabled={Boolean(editId)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-name">Nama Produk</label>
                  <input
                    id="p-name"
                    className="field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Contoh: Mechanical Keyboard RGB"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="p-price">Harga (IDR)</label>
                  <input
                    id="p-price"
                    type="number"
                    className="field"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min={0}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-cat">Kategori</label>
                  <select
                    id="p-cat"
                    className="field"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!editId && (
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="p-stock">Stok Awal Inventaris</label>
                  <input
                    id="p-stock"
                    type="number"
                    className="field"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    min={0}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="p-desc">Deskripsi Produk</label>
                <textarea
                  id="p-desc"
                  className="field"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan spesifikasi produk…"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowProductModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={savingProduct}>
                  {savingProduct ? 'Menyimpan…' : editId ? 'Perbarui Produk' : 'Buat Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Penyesuaian Stok Inventaris</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Produk: <strong>{adjustTarget.name}</strong> ({adjustTarget.sku})<br />
              Stok saat ini: <strong>{adjustTarget.stock ?? 0}</strong>
            </p>

            <form onSubmit={handleAdjustInventory}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="stk-delta">Delta Perubahan Stok (+ untuk menambah, - untuk mengurangi)</label>
                <input
                  id="stk-delta"
                  type="number"
                  className="field"
                  value={quantityDelta}
                  onChange={(e) => setQuantityDelta(Number(e.target.value))}
                  required
                />
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  Hasil perkiraan stok: {(adjustTarget.stock ?? 0) + quantityDelta}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAdjustTarget(null)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={adjustingStock}>
                  {adjustingStock ? 'Menyesuaikan…' : 'Simpan Perubahan Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

