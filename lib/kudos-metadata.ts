import { readFeedback } from '@/packages/sdk/src/feedback-uri';

export function kudosDetailFields(feedbackURI: string, tag1: string) {
  const { metadata, message } = readFeedback(feedbackURI);
  const field = (name: string) => {
    const value = metadata?.[name];
    return typeof value === 'string' ? value : '';
  };
  const from = field('from');
  return {
    senderName: from.replace('twitter:@', '@'),
    from: from.replace('twitter:', ''),
    category: field('category') || tag1,
    message: field('message') || message || '',
    source: field('source'),
  };
}
