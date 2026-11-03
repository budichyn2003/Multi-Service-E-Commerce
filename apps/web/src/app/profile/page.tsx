'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import StatusNotice from '@/components/StatusNotice';

interface Address {
  id: string;
  label?: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  province?: string;
  postal_code?: string;
  is_default?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Address Modal/Form
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [label, setLabel] = useState('Rumah');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/profile');
      return;
    }

    if (user) {
      setName(user.name || '');
      loadAddresses();
    }
  }, [user, authLoading, router]);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data = await api.user.getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || updatingProfile) return;

    setUpdatingProfile(true);
    setProfileMsg(null);
    try {
      await api.user.updateProfile({ name });
      await refreshProfile();
      setProfileMsg({ text: 'Profil berhasil diperbarui!' });
    } catch (err: any) {
      setProfileMsg({ text: err?.message || 'Gagal memperbarui profil.', error: true });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const openAddressForm = (addr?: Address) => {
    if (addr) {
      setAddressId(addr.id);
      setLabel(addr.label || 'Rumah');
      setRecipientName(addr.recipient_name);
      setPhone(addr.phone);
      setAddressLine(addr.address_line);
      setCity(addr.city);
      setProvince(addr.province || '');
      setPostalCode(addr.postal_code || '');
      setIsDefault(Boolean(addr.is_default));
    } else {
      setAddressId(null);
      setLabel('Rumah');
      setRecipientName(user?.name || '');
      setPhone('');
      setAddressLine('');
      setCity('');
      setProvince('DKI Jakarta');
      setPostalCode('');
      setIsDefault(addresses.length === 0);
    }
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !phone || !addressLine || !city || savingAddress) return;

    setSavingAddress(true);
    try {
      const payload = {
        label,
        recipient_name: recipientName,
        phone,
        address_line: addressLine,
        city,
        province: province || 'DKI Jakarta',
        postal_code: postalCode || '12345',
        is_default: isDefault,
      };

      if (addressId) {
        await api.user.updateAddress(addressId, payload);
      } else {
        await api.user.createAddress(payload);
      }

      setIsEditingAddress(false);
      await loadAddresses();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan alamat.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Hapus alamat ini?')) return;
    try {
      await api.user.deleteAddress(id);
      await loadAddresses();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus alamat.');
    }
  };

  const handleSetDefaultAddress = async (addr: Address) => {
    try {
      await api.user.updateAddress(addr.id, { is_default: true });
      await loadAddresses();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengatur alamat default.');
    }
  };

  if (authLoading || !user) {
    return <StatusNotice type="loading" title="Memuat data profil…" />;
  }

  return (
    <section>
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="eyebrow">Pengaturan Akun</p>
        <h1>Profil & Alamat Pelanggan</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Informasi Akun</h2>

          {profileMsg && (
            <div className={profileMsg.error ? 'status-box error' : 'status-box'} style={{ padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="user-name">Nama Lengkap</label>
              <input
                id="user-name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={updatingProfile}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="user-email">Alamat Email</label>
              <input
                id="user-email"
                className="field"
                value={user.email}
                disabled
                style={{ opacity: 0.7 }}
              />
              <span className="muted" style={{ fontSize: '0.75rem' }}>Email akun tidak dapat diubah</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Peran (Role)</span>
                <span className={user.role === 'ADMIN' ? 'badge badge-primary' : 'badge badge-neutral'}>
                  {user.role}
                </span>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Status Akun</span>
                <span className="badge badge-success">{user.status}</span>
              </div>
            </div>

            <button type="submit" className="button" disabled={updatingProfile} style={{ padding: '0.65rem 1.25rem' }}>
              {updatingProfile ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* Addresses Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Buku Alamat</h2>
            <button
              type="button"
              className="button"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              onClick={() => openAddressForm()}
            >
              + Tambah Alamat
            </button>
          </div>

          {loadingAddresses ? (
            <p className="muted">Memuat alamat…</p>
          ) : addresses.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p className="muted" style={{ margin: 0 }}>Belum ada alamat pengiriman tersimpan.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--surface-raised)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{addr.recipient_name}</strong>
                      {addr.label && <span className="badge badge-neutral">{addr.label}</span>}
                      {addr.is_default && <span className="badge badge-primary">Utama</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => openAddressForm(addr)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--danger)' }}
                        onClick={() => handleDeleteAddress(addr.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  <p className="muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>
                    Telp: {addr.phone}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    {addr.address_line}, {addr.city}, {addr.province} {addr.postal_code}
                  </p>

                  {!addr.is_default && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="text-link"
                        style={{ fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => handleSetDefaultAddress(addr)}
                      >
                        Jadikan Alamat Utama
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Address Edit/Add Modal */}
      {isEditingAddress && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              {addressId ? 'Ubah Alamat Pengiriman' : 'Tambah Alamat Pengiriman'}
            </h2>

            <form onSubmit={handleSaveAddress}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="m-label">Label Alamat</label>
                  <input
                    id="m-label"
                    className="field"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Rumah / Kantor / Toko"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="m-recipient">Nama Penerima</label>
                  <input
                    id="m-recipient"
                    className="field"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="m-phone">Nomor Telepon</label>
                  <input
                    id="m-phone"
                    className="field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="m-city">Kota / Kabupaten</label>
                  <input
                    id="m-city"
                    className="field"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="m-line">Alamat Lengkap</label>
                <textarea
                  id="m-line"
                  className="field"
                  rows={2}
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Nama jalan, nomor gedung/rumah, patokan"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="m-province">Provinsi</label>
                  <input
                    id="m-province"
                    className="field"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="m-postal">Kode Pos</label>
                  <input
                    id="m-postal"
                    className="field"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span style={{ fontSize: '0.875rem' }}>Jadikan sebagai alamat utama</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsEditingAddress(false)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={savingAddress}>
                  {savingAddress ? 'Menyimpan…' : 'Simpan Alamat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

