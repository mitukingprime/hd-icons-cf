class R2Storage {
  constructor(bucket) {
    this.bucket = bucket;
  }

  async getJSON(key) {
    try {
      const obj = await this.bucket.get(key);
      if (!obj) return null;
      return await obj.json();
    } catch {
      return null;
    }
  }

  async putJSON(key, data) {
    await this.bucket.put(key, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async getFile(key) {
    try {
      const obj = await this.bucket.get(key);
      if (!obj) return null;
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      const contentType = headers.get('Content-Type') || null;
      return { body: obj.body, contentType };
    } catch {
      return null;
    }
  }

  async putFile(key, body, contentType) {
    await this.bucket.put(key, body, {
      httpMetadata: { contentType },
    });
  }

  async deleteFile(key) {
    await this.bucket.delete(key);
  }
}

class KVStorage {
  constructor(kv) {
    this.kv = kv;
  }

  async getJSON(key) {
    try {
      return await this.kv.get(key, 'json');
    } catch {
      return null;
    }
  }

  async putJSON(key, data) {
    await this.kv.put(key, JSON.stringify(data));
  }

  async getFile(key) {
    try {
      const result = await this.kv.getWithMetadata(key, 'arrayBuffer');
      if (!result || result.value === null) return null;
      const contentType = result.metadata?.contentType || null;
      return { body: result.value, contentType };
    } catch {
      return null;
    }
  }

  async putFile(key, body, contentType) {
    let buffer;
    if (body instanceof ArrayBuffer) {
      buffer = body;
    } else if (body instanceof ReadableStream) {
      buffer = await new Response(body).arrayBuffer();
    } else if (body instanceof Uint8Array) {
      buffer = body.buffer;
    } else {
      buffer = await new Response(body).arrayBuffer();
    }
    await this.kv.put(key, buffer, { metadata: { contentType } });
  }

  async deleteFile(key) {
    await this.kv.delete(key);
  }
}

export function createStorage(env) {
  if (env.ICONS_BUCKET) return new R2Storage(env.ICONS_BUCKET);
  if (env.ICONS_KV) return new KVStorage(env.ICONS_KV);
  return null;
}
