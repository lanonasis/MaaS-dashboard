export type KeyConsumer = 'claude' | 'hermes' | 'openclaw';
export type KeyConsumerSelection = KeyConsumer | 'unbound';

type ConsumerMetadata = {
  consumer?: KeyConsumer;
  binding?: {
    client_id?: KeyConsumer;
  } | null;
  name: string;
};

export function resolveConsumer(key: ConsumerMetadata): KeyConsumer | undefined {
  if (key.consumer) {
    return key.consumer;
  }

  if (key.binding?.client_id) {
    return key.binding.client_id;
  }

  const match = /^\[(claude|hermes|openclaw)\]\s+/i.exec(key.name);
  return match?.[1]?.toLowerCase() as KeyConsumer | undefined;
}

export function applyConsumerTag(
  name: string,
  consumer: KeyConsumerSelection,
): string {
  const baseName = name.replace(/^\[(claude|hermes|openclaw)\]\s+/i, '').trim();
  return consumer === 'unbound' ? baseName : `[${consumer}] ${baseName}`;
}
