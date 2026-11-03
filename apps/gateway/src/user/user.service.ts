import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../common/api-error';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const result = await this.db.query(
      `SELECT id, name, email, role, status, created_at, updated_at, last_login_at
       FROM commerce.users WHERE id = $1`,
      [userId],
    );
    if (!result.rowCount || result.rowCount === 0) {
      throw ApiError.notFound('User not found');
    }
    return result.rows[0];
  }

  async updateProfile(userId: string, data: { name?: string }) {
    if (!data.name || data.name.trim().length < 2) {
      throw ApiError.badRequest('Name must be at least 2 characters long');
    }
    const result = await this.db.query(
      `UPDATE commerce.users
       SET name = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, name, email, role, status, created_at, updated_at`,
      [data.name.trim(), userId],
    );
    if (!result.rowCount || result.rowCount === 0) {
      throw ApiError.notFound('User not found');
    }
    return result.rows[0];
  }

  async listAddresses(userId: string) {
    const result = await this.db.query(
      `SELECT id, user_id, label, recipient_name, phone, address_line,
              city, province, postal_code, country, is_default, created_at, updated_at
       FROM commerce.addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async createAddress(
    userId: string,
    data: {
      label?: string;
      recipient_name: string;
      phone: string;
      address_line: string;
      city: string;
      province: string;
      postal_code: string;
      country?: string;
      is_default?: boolean;
    },
  ) {
    if (!data.recipient_name || !data.phone || !data.address_line || !data.city || !data.province || !data.postal_code) {
      throw ApiError.badRequest('recipient_name, phone, address_line, city, province, and postal_code are required');
    }

    const countRes = await this.db.query(
      'SELECT count(*) FROM commerce.addresses WHERE user_id = $1',
      [userId],
    );
    const count = parseInt(countRes.rows[0].count, 10);
    // If it's the first address, force is_default = true
    const isDefault = count === 0 ? true : Boolean(data.is_default);

    if (isDefault) {
      await this.db.query(
        'UPDATE commerce.addresses SET is_default = false, updated_at = now() WHERE user_id = $1',
        [userId],
      );
    }

    const result = await this.db.query(
      `INSERT INTO commerce.addresses (
         user_id, label, recipient_name, phone, address_line,
         city, province, postal_code, country, is_default
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        data.label || 'Home',
        data.recipient_name.trim(),
        data.phone.trim(),
        data.address_line.trim(),
        data.city.trim(),
        data.province.trim(),
        data.postal_code.trim(),
        (data.country || 'ID').toUpperCase(),
        isDefault,
      ],
    );

    return result.rows[0];
  }

  async updateAddress(
    userId: string,
    addressId: string,
    data: Partial<{
      label: string;
      recipient_name: string;
      phone: string;
      address_line: string;
      city: string;
      province: string;
      postal_code: string;
      country: string;
      is_default: boolean;
    }>,
  ) {
    const existing = await this.db.query(
      'SELECT id, is_default FROM commerce.addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId],
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      throw ApiError.notFound('Address not found');
    }

    if (data.is_default === true) {
      await this.db.query(
        'UPDATE commerce.addresses SET is_default = false, updated_at = now() WHERE user_id = $1',
        [userId],
      );
    }

    const sets: string[] = ['updated_at = now()'];
    const values: any[] = [addressId, userId];
    let idx = 3;

    if (data.label !== undefined) {
      sets.push(`label = $${idx++}`);
      values.push(data.label);
    }
    if (data.recipient_name !== undefined) {
      sets.push(`recipient_name = $${idx++}`);
      values.push(data.recipient_name.trim());
    }
    if (data.phone !== undefined) {
      sets.push(`phone = $${idx++}`);
      values.push(data.phone.trim());
    }
    if (data.address_line !== undefined) {
      sets.push(`address_line = $${idx++}`);
      values.push(data.address_line.trim());
    }
    if (data.city !== undefined) {
      sets.push(`city = $${idx++}`);
      values.push(data.city.trim());
    }
    if (data.province !== undefined) {
      sets.push(`province = $${idx++}`);
      values.push(data.province.trim());
    }
    if (data.postal_code !== undefined) {
      sets.push(`postal_code = $${idx++}`);
      values.push(data.postal_code.trim());
    }
    if (data.country !== undefined) {
      sets.push(`country = $${idx++}`);
      values.push(data.country.trim().toUpperCase());
    }
    if (data.is_default !== undefined) {
      sets.push(`is_default = $${idx++}`);
      values.push(data.is_default);
    }

    const result = await this.db.query(
      `UPDATE commerce.addresses SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.db.query(
      'SELECT id, is_default FROM commerce.addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId],
    );
    if (!existing.rowCount || existing.rowCount === 0) {
      throw ApiError.notFound('Address not found');
    }

    const wasDefault = existing.rows[0].is_default;
    await this.db.query(
      'DELETE FROM commerce.addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId],
    );

    // If default was deleted, promote oldest remaining address
    if (wasDefault) {
      await this.db.query(
        `UPDATE commerce.addresses
         SET is_default = true, updated_at = now()
         WHERE id = (
           SELECT id FROM commerce.addresses
           WHERE user_id = $1
           ORDER BY created_at ASC
           LIMIT 1
         )`,
        [userId],
      );
    }

    return { message: 'Address deleted successfully' };
  }
}

