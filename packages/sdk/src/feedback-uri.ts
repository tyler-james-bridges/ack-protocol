const BASE64_JSON = 'data:application/json;base64,';
type Metadata = Record<string, unknown>;

function jsonObject(text: string): Metadata | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Metadata)
      : null;
  } catch {
    return null;
  }
}

function feedbackContent(uri: string): Metadata | string | null {
  try {
    if (uri.startsWith(BASE64_JSON)) {
      const bytes = Uint8Array.from(
        atob(uri.slice(BASE64_JSON.length)),
        (byte) => byte.charCodeAt(0)
      );
      return jsonObject(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      );
    }
    if (uri.startsWith('data:,')) {
      const raw = uri.slice('data:,'.length);
      if (raw.trimStart().startsWith('{')) {
        const metadata = jsonObject(raw);
        if (metadata) return metadata;
      }
      const text = decodeURIComponent(raw.replace(/%(?![0-9a-f]{2})/gi, '%25'));
      return text.trimStart().startsWith('{') ? jsonObject(text) : text || null;
    }
    return uri.trimStart().startsWith('{') ? jsonObject(uri) : null;
  } catch {
    return null;
  }
}

export function readFeedback(uri: string): {
  metadata: Metadata | null;
  message: string | null;
} {
  const content = feedbackContent(uri);
  if (typeof content === 'string') return { metadata: null, message: content };
  const reasoning = content?.reasoning;
  const message = content?.message;
  return {
    metadata: content,
    message:
      (typeof reasoning === 'string' && reasoning) ||
      (typeof message === 'string' && message) ||
      null,
  };
}
