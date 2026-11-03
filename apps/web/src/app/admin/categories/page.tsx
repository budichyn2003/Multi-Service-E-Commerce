'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatusNotice from '@/components/StatusNotice';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.catalog.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat kategori.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setSlug('');
    setDescription('');
    setShowModal(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || saving) return;

    setSaving(true);
    try {
      if (editId) {
        await api.admin.updateCategory(editId, { name, slug, description });
      } else {
        await api.admin.createCategory({ name, slug, description });
      }
      setShowModal(false);
      await loadCategories();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan kategori.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!window.confirm(`Hapus/arsipkan kategori “${catName}”?`)) return;
    try {
      await api.admin.archiveCategory(id);
      await loadCategories();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus kategori.');
    }
  };

  if (loading && categories.length === 0) {
    return <StatusNotice type="loading" title="Memuat kategori…" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Kategori Produk</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
            Kelola klasifikasi produk dalam katalog MarketForge.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={loadCategories} className="secondary-button" style={{ fontSize: '0.85rem' }}>
            🔄 Refresh
          </button>
          <button type="button" onClick={openCreateModal} className="button" style={{ fontSize: '0.85rem' }}>
            + Tambah Kategori
          </button>
        </div>
      </div>

      {error && (
        <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <StatusNotice
          type="empty"
          title="Belum ada kategori"
          message="Buat kategori produk pertama Anda."
          actionText="+ Tambah Kategori"
          onAction={openCreateModal}
        />
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th>Slug URL</th>
                <th>Deskripsi</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                  <td>
                    <code>{cat.slug}</code>
                  </td>
                  <td className="muted" style={{ fontSize: '0.85rem' }}>
                    {cat.description || '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => openEditModal(cat)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              {editId ? 'Ubah Kategori' : 'Tambah Kategori Baru'}
            </h2>

            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="cat-name">Nama Kategori</label>
                <input
                  id="cat-name"
                  className="field"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contoh: Elektronik & Gadget"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="cat-slug">Slug URL</label>
                <input
                  id="cat-slug"
                  className="field"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="elektronik-gadget"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="cat-desc">Deskripsi</label>
                <textarea
                  id="cat-desc"
                  className="field"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat kategori…"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

