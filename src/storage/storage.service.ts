import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'arquivos-pacientes';

@Injectable()
export class StorageService {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error(
          'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env do backend.',
        );
      }
      this.client = createClient(url, key);
    }
    return this.client;
  }

  async upload(path: string, buffer: Buffer, contentType: string) {
    const { error } = await this.getClient()
      .storage.from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (error) throw error;
    return path;
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600) {
    const { data, error } = await this.getClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }

  async remove(path: string) {
    const { error } = await this.getClient().storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }

  async download(path: string): Promise<Buffer> {
    const { data, error } = await this.getClient().storage.from(BUCKET).download(path);
    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
